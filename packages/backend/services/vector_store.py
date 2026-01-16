"""シンプルなインメモリベクトルストアサービス（Chroma代替）"""
import os
import json
import math
from typing import List, Optional, Dict, Any
from pathlib import Path
from openai import AsyncOpenAI

from config import settings


class VectorStoreService:
    """シンプルなインメモリベクトルストア"""

    def __init__(self):
        # ディレクトリ作成
        os.makedirs(settings.CHROMA_PERSIST_DIR, exist_ok=True)

        # OpenAI クライアント
        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        self.embedding_model = "text-embedding-3-small"

        # インメモリストア
        self._store: Dict[str, List[Dict[str, Any]]] = {}

        # 永続化ファイルパス
        self._store_path = Path(settings.CHROMA_PERSIST_DIR) / "vector_store.json"

        # 既存データを読み込み
        self._load_store()

        # コレクション名
        self.collections = {
            "skills": "社内スキルシート",
            "knowledge": "営業ナレッジ",
        }

    def _load_store(self):
        """永続化データを読み込み"""
        if self._store_path.exists():
            try:
                with open(self._store_path, 'r', encoding='utf-8') as f:
                    self._store = json.load(f)
            except Exception:
                self._store = {}

    def _save_store(self):
        """データを永続化"""
        try:
            with open(self._store_path, 'w', encoding='utf-8') as f:
                json.dump(self._store, f, ensure_ascii=False, indent=2)
        except Exception:
            pass

    async def _get_embedding(self, text: str) -> List[float]:
        """テキストの埋め込みベクトルを取得"""
        response = await self.client.embeddings.create(
            model=self.embedding_model,
            input=text
        )
        return response.data[0].embedding

    async def _get_embeddings(self, texts: List[str]) -> List[List[float]]:
        """複数テキストの埋め込みベクトルを取得"""
        response = await self.client.embeddings.create(
            model=self.embedding_model,
            input=texts
        )
        return [item.embedding for item in response.data]

    def _cosine_similarity(self, vec1: List[float], vec2: List[float]) -> float:
        """コサイン類似度を計算"""
        dot_product = sum(a * b for a, b in zip(vec1, vec2))
        norm1 = math.sqrt(sum(a * a for a in vec1))
        norm2 = math.sqrt(sum(b * b for b in vec2))

        if norm1 == 0 or norm2 == 0:
            return 0.0

        return dot_product / (norm1 * norm2)

    def _split_text(self, text: str, chunk_size: int = 1000, overlap: int = 200) -> List[str]:
        """テキストをチャンクに分割"""
        if len(text) <= chunk_size:
            return [text]

        chunks = []
        start = 0

        while start < len(text):
            end = start + chunk_size
            chunk = text[start:end]
            chunks.append(chunk)
            start = end - overlap

            if start >= len(text):
                break

        return chunks

    async def add_documents(
        self,
        collection_name: str,
        texts: List[str],
        metadatas: Optional[List[dict]] = None
    ) -> List[str]:
        """ドキュメントを追加"""
        if collection_name not in self._store:
            self._store[collection_name] = []

        ids = []
        all_chunks = []
        chunk_metadatas = []

        # テキストを分割
        for i, text in enumerate(texts):
            chunks = self._split_text(text)
            for j, chunk in enumerate(chunks):
                metadata = metadatas[i].copy() if metadatas and i < len(metadatas) else {}
                metadata["chunk_index"] = j
                all_chunks.append(chunk)
                chunk_metadatas.append(metadata)

        # 埋め込みを取得
        if all_chunks:
            embeddings = await self._get_embeddings(all_chunks)

            for k, (chunk, embedding, metadata) in enumerate(zip(all_chunks, embeddings, chunk_metadatas)):
                doc_id = f"{collection_name}_{len(self._store[collection_name])}_{k}"
                self._store[collection_name].append({
                    "id": doc_id,
                    "content": chunk,
                    "embedding": embedding,
                    "metadata": metadata
                })
                ids.append(doc_id)

        # 永続化
        self._save_store()

        return ids

    async def add_file(
        self,
        collection_name: str,
        filename: str,
        content: str
    ) -> str:
        """ファイルからドキュメントを追加"""
        metadata = {
            "filename": filename,
            "source": "file_upload",
        }

        ids = await self.add_documents(
            collection_name=collection_name,
            texts=[content],
            metadatas=[metadata]
        )

        return ids[0] if ids else ""

    async def search(
        self,
        collection_name: str,
        query: str,
        top_k: int = 5
    ) -> List[dict]:
        """類似検索"""
        if collection_name not in self._store or not self._store[collection_name]:
            return []

        # クエリの埋め込みを取得
        query_embedding = await self._get_embedding(query)

        # 類似度を計算
        results = []
        for doc in self._store[collection_name]:
            score = self._cosine_similarity(query_embedding, doc["embedding"])
            results.append({
                "content": doc["content"],
                "metadata": doc["metadata"],
                "score": score
            })

        # スコアでソート（降順）
        results.sort(key=lambda x: x["score"], reverse=True)

        return results[:top_k]

    async def get_context(
        self,
        query: str,
        collections: Optional[List[str]] = None,
        top_k: int = 3
    ) -> str:
        """RAG用のコンテキストを取得"""
        if collections is None:
            collections = list(self.collections.keys())

        all_results = []

        for collection in collections:
            try:
                results = await self.search(collection, query, top_k)
                all_results.extend(results)
            except Exception:
                # コレクションが存在しない場合はスキップ
                pass

        # スコアでソートして上位を取得
        all_results.sort(key=lambda x: x["score"], reverse=True)
        top_results = all_results[:top_k]

        if not top_results:
            return ""

        # コンテキスト文字列を構築
        context_parts = []
        for i, result in enumerate(top_results, 1):
            source = result["metadata"].get("filename", "不明")
            context_parts.append(f"[{i}] 出典: {source}\n{result['content']}")

        return "\n\n".join(context_parts)

    def list_collections(self) -> List[str]:
        """コレクション一覧"""
        return list(self._store.keys())

    async def delete_collection(self, collection_name: str) -> bool:
        """コレクション削除"""
        if collection_name in self._store:
            del self._store[collection_name]
            self._save_store()
            return True
        return False

    async def get_collection_count(self, collection_name: str) -> int:
        """コレクション内のドキュメント数"""
        if collection_name in self._store:
            return len(self._store[collection_name])
        return 0


# シングルトンインスタンス
vector_store = VectorStoreService()

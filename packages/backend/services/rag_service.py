"""RAG（Retrieval-Augmented Generation）サービス"""
from typing import List, Optional, AsyncGenerator

from services.llm_service import llm_service
from services.vector_store import vector_store


class RAGService:
    """RAGサービス - ベクトル検索 + LLM応答生成"""

    def __init__(self):
        self.llm = llm_service
        self.store = vector_store

    async def chat_with_rag(
        self,
        agent_id: str,
        messages: List[dict],
        use_rag: bool = True
    ) -> dict:
        """RAGを使用したチャット応答"""
        context = None
        sources = []

        if use_rag and messages:
            # 最新のユーザーメッセージを取得
            user_messages = [m for m in messages if m.get("role") == "user"]
            if user_messages:
                query = user_messages[-1].get("content", "")

                # エージェントに応じたコレクションを選択
                collections = self._get_collections_for_agent(agent_id)

                # コンテキストを取得
                context = await self.store.get_context(
                    query=query,
                    collections=collections,
                    top_k=3
                )

                if context:
                    # ソース情報を抽出
                    search_results = []
                    for collection in collections:
                        try:
                            results = await self.store.search(collection, query, top_k=3)
                            search_results.extend(results)
                        except Exception:
                            pass

                    sources = list(set([
                        r["metadata"].get("filename", "")
                        for r in search_results
                        if r["metadata"].get("filename")
                    ]))

        # LLMで応答生成
        response = await self.llm.chat(agent_id, messages, context)

        if sources:
            response["sources"] = sources

        return response

    async def chat_with_rag_stream(
        self,
        agent_id: str,
        messages: List[dict],
        use_rag: bool = True
    ) -> AsyncGenerator[str, None]:
        """RAGを使用したストリーミングチャット"""
        context = None

        if use_rag and messages:
            user_messages = [m for m in messages if m.get("role") == "user"]
            if user_messages:
                query = user_messages[-1].get("content", "")
                collections = self._get_collections_for_agent(agent_id)

                context = await self.store.get_context(
                    query=query,
                    collections=collections,
                    top_k=3
                )

        async for token in self.llm.chat_stream(agent_id, messages, context):
            yield token

    def _get_collections_for_agent(self, agent_id: str) -> List[str]:
        """エージェントIDに対応するコレクションを取得"""
        agent_collections = {
            "analysis": ["skills"],  # スキル検索はスキルシートのみ
            "leads": ["knowledge"],
            "progress": ["knowledge"],
            "inquiry": ["knowledge"],
            "proposal": ["knowledge", "skills"],
            "coach": ["knowledge"],
        }

        return agent_collections.get(agent_id, ["knowledge"])


# シングルトンインスタンス
rag_service = RAGService()

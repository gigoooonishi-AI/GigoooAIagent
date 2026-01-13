"""ドキュメント管理APIルーター"""
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import List

from models.schemas import (
    DocumentUploadResponse, DocumentSearchRequest,
    DocumentSearchResponse, DocumentSearchResult
)
from services.vector_store import vector_store

router = APIRouter()


@router.post("/upload", response_model=DocumentUploadResponse)
async def upload_document(
    file: UploadFile = File(...),
    collection: str = Form(default="knowledge")
):
    """ドキュメントアップロード"""
    try:
        # ファイル内容を読み取り
        content = await file.read()

        # テキストファイルとしてデコード
        try:
            text_content = content.decode("utf-8")
        except UnicodeDecodeError:
            try:
                text_content = content.decode("shift-jis")
            except UnicodeDecodeError:
                raise HTTPException(
                    status_code=400,
                    detail="ファイルのエンコーディングを認識できません"
                )

        # ベクトルストアに追加
        doc_id = await vector_store.add_file(
            collection_name=collection,
            filename=file.filename,
            content=text_content
        )

        return DocumentUploadResponse(
            success=True,
            message=f"ドキュメント '{file.filename}' をアップロードしました",
            document_id=doc_id,
            filename=file.filename
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/search", response_model=DocumentSearchResponse)
async def search_documents(request: DocumentSearchRequest):
    """ドキュメント検索"""
    try:
        results = await vector_store.search(
            collection_name=request.collection,
            query=request.query,
            top_k=request.top_k
        )

        return DocumentSearchResponse(
            success=True,
            results=[
                DocumentSearchResult(
                    content=r["content"],
                    metadata=r["metadata"],
                    score=r["score"]
                )
                for r in results
            ]
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/collections")
async def list_collections():
    """コレクション一覧"""
    try:
        collections = vector_store.list_collections()
        counts = {}

        for name in collections:
            counts[name] = await vector_store.get_collection_count(name)

        return {
            "success": True,
            "collections": [
                {
                    "name": name,
                    "count": counts.get(name, 0)
                }
                for name in collections
            ]
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/collections/{collection_name}")
async def delete_collection(collection_name: str):
    """コレクション削除"""
    try:
        success = await vector_store.delete_collection(collection_name)

        if success:
            return {
                "success": True,
                "message": f"コレクション '{collection_name}' を削除しました"
            }
        else:
            raise HTTPException(
                status_code=404,
                detail=f"コレクション '{collection_name}' が見つかりません"
            )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/bulk-upload")
async def bulk_upload_documents(
    files: List[UploadFile] = File(...),
    collection: str = Form(default="knowledge")
):
    """複数ドキュメントの一括アップロード"""
    results = []

    for file in files:
        try:
            content = await file.read()

            try:
                text_content = content.decode("utf-8")
            except UnicodeDecodeError:
                try:
                    text_content = content.decode("shift-jis")
                except UnicodeDecodeError:
                    results.append({
                        "filename": file.filename,
                        "success": False,
                        "error": "エンコーディングエラー"
                    })
                    continue

            doc_id = await vector_store.add_file(
                collection_name=collection,
                filename=file.filename,
                content=text_content
            )

            results.append({
                "filename": file.filename,
                "success": True,
                "document_id": doc_id
            })

        except Exception as e:
            results.append({
                "filename": file.filename,
                "success": False,
                "error": str(e)
            })

    success_count = sum(1 for r in results if r["success"])

    return {
        "success": True,
        "message": f"{success_count}/{len(files)} ファイルをアップロードしました",
        "results": results
    }

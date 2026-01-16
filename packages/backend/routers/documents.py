"""ドキュメント管理APIルーター"""
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import List
import base64

from models.schemas import (
    DocumentUploadResponse, DocumentSearchRequest,
    DocumentSearchResponse, DocumentSearchResult,
    GoogleSheetRequest, DocumentParseResponse
)
from services.vector_store import vector_store
from services.document_parser import document_parser

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


# ========== ドキュメント解析エンドポイント ==========

@router.post("/parse", response_model=DocumentParseResponse)
async def parse_document(file: UploadFile = File(...)):
    """
    アップロードされたドキュメントファイルを解析
    対応形式: Excel (.xlsx, .xls), Word (.docx), CSV (.csv)
    """
    try:
        content = await file.read()
        filename = file.filename or "unknown"

        file_type = document_parser.detect_file_type(filename)

        if file_type == 'unknown':
            raise HTTPException(
                status_code=400,
                detail=f"未対応のファイル形式です: {filename}. 対応形式: .xlsx, .xls, .docx, .csv"
            )

        parsed_content = document_parser.parse_document(content, filename)

        return DocumentParseResponse(
            success=True,
            filename=filename,
            content=parsed_content,
            file_type=file_type
        )

    except HTTPException:
        raise
    except Exception as e:
        return DocumentParseResponse(
            success=False,
            filename=file.filename,
            content=f"ファイル解析エラー: {str(e)}",
            file_type=None
        )


@router.post("/parse-base64", response_model=DocumentParseResponse)
async def parse_document_base64(filename: str, content_base64: str):
    """Base64エンコードされたドキュメントを解析"""
    try:
        content = base64.b64decode(content_base64)
        file_type = document_parser.detect_file_type(filename)

        if file_type == 'unknown':
            return DocumentParseResponse(
                success=False,
                filename=filename,
                content=f"未対応のファイル形式です: {filename}",
                file_type=None
            )

        parsed_content = document_parser.parse_document(content, filename)

        return DocumentParseResponse(
            success=True,
            filename=filename,
            content=parsed_content,
            file_type=file_type
        )

    except Exception as e:
        return DocumentParseResponse(
            success=False,
            filename=filename,
            content=f"ファイル解析エラー: {str(e)}",
            file_type=None
        )


@router.post("/parse-google-sheet", response_model=DocumentParseResponse)
async def parse_google_sheet(request: GoogleSheetRequest):
    """
    公開Googleスプレッドシートを解析
    注意: スプレッドシートは「リンクを知っている全員が閲覧可」に設定されている必要があります
    """
    try:
        sheet_id = document_parser.extract_google_sheet_id(request.url)

        if not sheet_id:
            return DocumentParseResponse(
                success=False,
                filename=None,
                content="GoogleスプレッドシートのURLが正しくありません",
                file_type=None
            )

        parsed_content = document_parser.parse_google_sheet_public(request.url)

        return DocumentParseResponse(
            success=True,
            filename=f"Google Spreadsheet ({sheet_id})",
            content=parsed_content,
            file_type="google_sheet"
        )

    except Exception as e:
        return DocumentParseResponse(
            success=False,
            filename=None,
            content=f"Googleスプレッドシート解析エラー: {str(e)}",
            file_type=None
        )

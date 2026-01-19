"""スプレッドシート連携APIルーター"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
import io
import pandas as pd

from database import get_db
from models.db_models import Lead, Deal, Inquiry, ImportedSpreadsheet
from services.spreadsheet_service import spreadsheet_service

router = APIRouter()


# ========== リクエスト/レスポンススキーマ ==========

class SpreadsheetURLRequest(BaseModel):
    """スプレッドシートURL指定リクエスト"""
    url: str
    sheet_name: Optional[str] = None
    column_mapping: Optional[Dict[str, str]] = None


class ImportResult(BaseModel):
    """インポート結果"""
    success: bool
    imported_count: int
    skipped_count: int
    errors: List[str] = []


class SyncResult(BaseModel):
    """同期結果"""
    success: bool
    synced_count: int
    message: str


class ExportResult(BaseModel):
    """エクスポート結果"""
    success: bool
    exported_count: int
    sheet_name: str
    message: str


class ImportToDBRequest(BaseModel):
    """DBへのインポートリクエスト"""
    url: str
    sheet_name: Optional[str] = None
    auto_refresh: bool = True
    refresh_interval_minutes: int = 30


class ImportedSpreadsheetResponse(BaseModel):
    """インポート済みスプレッドシート"""
    id: int
    spreadsheet_url: str
    spreadsheet_id: str
    sheet_name: Optional[str]
    columns: Optional[List[str]]
    total_rows: int
    auto_refresh: bool
    refresh_interval_minutes: int
    last_synced_at: Optional[datetime]
    created_at: Optional[datetime]

    class Config:
        from_attributes = True


class DuplicateCheckResponse(BaseModel):
    """重複チェック結果"""
    is_duplicate: bool
    message: str
    existing_id: Optional[int] = None
    existing_sheet_name: Optional[str] = None
    last_synced_at: Optional[datetime] = None


# ========== ステータスAPI ==========

@router.get("/status")
async def get_spreadsheet_status():
    """スプレッドシートサービスの状態を確認"""
    available = spreadsheet_service.is_available()
    can_write = spreadsheet_service.can_write()

    if not available:
        message = "Google Sheets APIが設定されていません"
        mode = "none"
    elif can_write:
        message = "Google Sheets APIに接続済み（読み取り・書き込み可能）"
        mode = "service_account"
    else:
        message = "Google Sheets APIに接続済み（読み取りのみ・公開シート限定）"
        mode = "api_key"

    return {
        "available": available,
        "can_write": can_write,
        "mode": mode,
        "message": message
    }


@router.post("/sheets")
async def get_sheet_names(request: SpreadsheetURLRequest):
    """スプレッドシートのシート名一覧を取得"""
    if not spreadsheet_service.is_available():
        raise HTTPException(status_code=503, detail="Google Sheets service not available")

    try:
        sheets = spreadsheet_service.get_sheet_names(request.url)
        return {"success": True, "sheets": sheets}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to access spreadsheet: {str(e)}")


@router.post("/preview")
async def preview_spreadsheet_data(request: SpreadsheetURLRequest):
    """スプレッドシートのデータをプレビュー（最初の10行）"""
    if not spreadsheet_service.is_available():
        raise HTTPException(status_code=503, detail="Google Sheets service not available")

    try:
        data = spreadsheet_service.get_all_data(request.url, request.sheet_name)
        preview = data[:10] if len(data) > 10 else data
        return {
            "success": True,
            "total_rows": len(data),
            "preview": preview,
            "columns": list(data[0].keys()) if data else []
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to preview spreadsheet: {str(e)}")


@router.post("/data")
async def get_spreadsheet_data(request: SpreadsheetURLRequest):
    """スプレッドシートの全データを取得"""
    if not spreadsheet_service.is_available():
        raise HTTPException(status_code=503, detail="Google Sheets service not available")

    try:
        data = spreadsheet_service.get_all_data(request.url, request.sheet_name)
        return {
            "success": True,
            "total_rows": len(data),
            "data": data,
            "columns": list(data[0].keys()) if data else []
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to get spreadsheet data: {str(e)}")


# ========== インポート済みスプレッドシート管理API ==========

def _extract_spreadsheet_id(url: str) -> str:
    """URLからスプレッドシートIDを抽出"""
    import re
    match = re.search(r'/d/([a-zA-Z0-9-_]+)', url)
    if match:
        return match.group(1)
    raise ValueError("Invalid spreadsheet URL")


@router.post("/check-duplicate", response_model=DuplicateCheckResponse)
async def check_duplicate_spreadsheet(
    request: SpreadsheetURLRequest,
    db: Session = Depends(get_db)
):
    """スプレッドシートの重複をチェック"""
    try:
        spreadsheet_id = _extract_spreadsheet_id(request.url)

        # 同じスプレッドシートID+シート名の組み合わせで検索
        query = db.query(ImportedSpreadsheet).filter(
            ImportedSpreadsheet.spreadsheet_id == spreadsheet_id
        )

        if request.sheet_name:
            query = query.filter(ImportedSpreadsheet.sheet_name == request.sheet_name)

        existing = query.first()

        if existing:
            return DuplicateCheckResponse(
                is_duplicate=True,
                message="このスプレッドシートは既にインポートされています",
                existing_id=existing.id,
                existing_sheet_name=existing.sheet_name,
                last_synced_at=existing.last_synced_at
            )

        return DuplicateCheckResponse(
            is_duplicate=False,
            message="新規スプレッドシートです"
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/import-to-db")
async def import_spreadsheet_to_db(
    request: ImportToDBRequest,
    db: Session = Depends(get_db)
):
    """スプレッドシートをデータベースにインポート"""
    if not spreadsheet_service.is_available():
        raise HTTPException(status_code=503, detail="Google Sheets service not available")

    try:
        spreadsheet_id = _extract_spreadsheet_id(request.url)

        # 重複チェック
        existing = db.query(ImportedSpreadsheet).filter(
            ImportedSpreadsheet.spreadsheet_id == spreadsheet_id,
            ImportedSpreadsheet.sheet_name == request.sheet_name
        ).first()

        if existing:
            return {
                "success": False,
                "is_duplicate": True,
                "message": "このスプレッドシートは既にインポートされています",
                "existing_id": existing.id,
                "last_synced_at": existing.last_synced_at.isoformat() if existing.last_synced_at else None
            }

        # シート名取得（指定がない場合は最初のシート）
        sheet_name = request.sheet_name
        if not sheet_name:
            sheets = spreadsheet_service.get_sheet_names(request.url)
            sheet_name = sheets[0] if sheets else "Sheet1"

        # データ取得
        data = spreadsheet_service.get_all_data(request.url, sheet_name)
        columns = list(data[0].keys()) if data else []

        # DBに保存
        imported = ImportedSpreadsheet(
            spreadsheet_url=request.url,
            spreadsheet_id=spreadsheet_id,
            sheet_name=sheet_name,
            columns=columns,
            data=data,
            total_rows=len(data),
            auto_refresh=request.auto_refresh,
            refresh_interval_minutes=request.refresh_interval_minutes,
            last_synced_at=datetime.utcnow()
        )
        db.add(imported)
        db.commit()
        db.refresh(imported)

        return {
            "success": True,
            "is_duplicate": False,
            "message": f"スプレッドシートをインポートしました（{len(data)}件）",
            "id": imported.id,
            "total_rows": len(data),
            "columns": columns
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Import failed: {str(e)}")


@router.get("/imported", response_model=List[ImportedSpreadsheetResponse])
async def list_imported_spreadsheets(db: Session = Depends(get_db)):
    """インポート済みスプレッドシート一覧を取得"""
    spreadsheets = db.query(ImportedSpreadsheet).order_by(
        ImportedSpreadsheet.created_at.desc()
    ).all()
    return spreadsheets


@router.get("/imported/{id}")
async def get_imported_spreadsheet(id: int, db: Session = Depends(get_db)):
    """インポート済みスプレッドシートの詳細を取得"""
    spreadsheet = db.query(ImportedSpreadsheet).filter(ImportedSpreadsheet.id == id).first()
    if not spreadsheet:
        raise HTTPException(status_code=404, detail="Spreadsheet not found")

    return {
        "success": True,
        "id": spreadsheet.id,
        "spreadsheet_url": spreadsheet.spreadsheet_url,
        "spreadsheet_id": spreadsheet.spreadsheet_id,
        "sheet_name": spreadsheet.sheet_name,
        "columns": spreadsheet.columns,
        "data": spreadsheet.data,
        "total_rows": spreadsheet.total_rows,
        "auto_refresh": spreadsheet.auto_refresh,
        "refresh_interval_minutes": spreadsheet.refresh_interval_minutes,
        "last_synced_at": spreadsheet.last_synced_at.isoformat() if spreadsheet.last_synced_at else None,
        "created_at": spreadsheet.created_at.isoformat() if spreadsheet.created_at else None
    }


@router.post("/refresh/{id}")
async def refresh_imported_spreadsheet(id: int, db: Session = Depends(get_db)):
    """インポート済みスプレッドシートのデータを更新"""
    if not spreadsheet_service.is_available():
        raise HTTPException(status_code=503, detail="Google Sheets service not available")

    spreadsheet = db.query(ImportedSpreadsheet).filter(ImportedSpreadsheet.id == id).first()
    if not spreadsheet:
        raise HTTPException(status_code=404, detail="Spreadsheet not found")

    try:
        # 最新データを取得
        data = spreadsheet_service.get_all_data(spreadsheet.spreadsheet_url, spreadsheet.sheet_name)
        columns = list(data[0].keys()) if data else []

        # 更新
        spreadsheet.data = data
        spreadsheet.columns = columns
        spreadsheet.total_rows = len(data)
        spreadsheet.last_synced_at = datetime.utcnow()

        db.commit()

        return {
            "success": True,
            "message": f"データを更新しました（{len(data)}件）",
            "total_rows": len(data),
            "columns": columns,
            "last_synced_at": spreadsheet.last_synced_at.isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Refresh failed: {str(e)}")


@router.delete("/imported/{id}")
async def delete_imported_spreadsheet(id: int, db: Session = Depends(get_db)):
    """インポート済みスプレッドシートを削除"""
    spreadsheet = db.query(ImportedSpreadsheet).filter(ImportedSpreadsheet.id == id).first()
    if not spreadsheet:
        raise HTTPException(status_code=404, detail="Spreadsheet not found")

    db.delete(spreadsheet)
    db.commit()

    return {"success": True, "message": "スプレッドシートを削除しました"}


@router.post("/refresh-all")
async def refresh_all_spreadsheets(db: Session = Depends(get_db)):
    """自動更新が有効なスプレッドシートを一括更新"""
    if not spreadsheet_service.is_available():
        raise HTTPException(status_code=503, detail="Google Sheets service not available")

    spreadsheets = db.query(ImportedSpreadsheet).filter(
        ImportedSpreadsheet.auto_refresh == True
    ).all()

    results = []
    for sheet in spreadsheets:
        try:
            data = spreadsheet_service.get_all_data(sheet.spreadsheet_url, sheet.sheet_name)
            columns = list(data[0].keys()) if data else []

            sheet.data = data
            sheet.columns = columns
            sheet.total_rows = len(data)
            sheet.last_synced_at = datetime.utcnow()

            results.append({
                "id": sheet.id,
                "success": True,
                "total_rows": len(data)
            })
        except Exception as e:
            results.append({
                "id": sheet.id,
                "success": False,
                "error": str(e)
            })

    db.commit()

    success_count = sum(1 for r in results if r["success"])
    return {
        "success": True,
        "message": f"{success_count}/{len(results)}件のスプレッドシートを更新しました",
        "results": results
    }


# ========== Excelファイルインポート ==========

@router.post("/upload-excel")
async def upload_excel_file(
    file: UploadFile = File(...),
    sheet_name: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Excelファイルをアップロードしてインポート"""
    if not file.filename:
        raise HTTPException(status_code=400, detail="ファイル名が指定されていません")

    # ファイル拡張子チェック
    filename_lower = file.filename.lower()
    if not filename_lower.endswith(('.xlsx', '.xls', '.xlsm', '.csv')):
        raise HTTPException(status_code=400, detail="対応していないファイル形式です（.xlsx, .xls, .xlsm, .csv のみ）")

    try:
        # ファイル内容を読み込み
        file_content = await file.read()
        file_stream = io.BytesIO(file_content)

        # ファイル名で一意識別（重複チェック）
        existing = db.query(ImportedSpreadsheet).filter(
            ImportedSpreadsheet.spreadsheet_id == file.filename
        ).first()

        if existing:
            return {
                "success": False,
                "is_duplicate": True,
                "message": "このファイルは既にインポートされています",
                "existing_id": existing.id,
                "last_synced_at": existing.last_synced_at.isoformat() if existing.last_synced_at else None
            }

        # CSVかExcelかで処理を分岐
        if filename_lower.endswith('.csv'):
            # CSVファイル
            encodings = ['utf-8', 'shift-jis', 'cp932', 'utf-16']
            df = None
            for encoding in encodings:
                try:
                    file_stream.seek(0)
                    df = pd.read_csv(file_stream, encoding=encoding)
                    break
                except:
                    continue
            if df is None:
                raise HTTPException(status_code=400, detail="CSVファイルの読み込みに失敗しました")
            sheet_names = ['Sheet1']
            target_sheet = 'Sheet1'
        else:
            # Excelファイル
            excel_file = pd.ExcelFile(file_stream, engine='openpyxl')
            sheet_names = excel_file.sheet_names

            # シート名指定がない場合は最初のシート
            target_sheet = sheet_name if sheet_name and sheet_name in sheet_names else sheet_names[0]
            df = pd.read_excel(excel_file, sheet_name=target_sheet)

        if df.empty:
            raise HTTPException(status_code=400, detail="ファイルにデータがありません")

        # NaN値を空文字に置換
        df = df.fillna("")

        # カラム名をリストに
        columns = [str(col) for col in df.columns.tolist()]

        # データをdict形式に変換
        data = df.to_dict(orient='records')

        # 全ての値を文字列に変換（JSON互換性のため）
        for row in data:
            for key in row:
                if not isinstance(row[key], str):
                    row[key] = str(row[key]) if row[key] != "" else ""

        # DBに保存
        imported = ImportedSpreadsheet(
            spreadsheet_url=f"file://{file.filename}",
            spreadsheet_id=file.filename,
            sheet_name=target_sheet,
            columns=columns,
            data=data,
            total_rows=len(data),
            auto_refresh=False,  # ファイルは自動更新なし
            refresh_interval_minutes=0,
            last_synced_at=datetime.utcnow()
        )
        db.add(imported)
        db.commit()
        db.refresh(imported)

        return {
            "success": True,
            "is_duplicate": False,
            "message": f"ファイルをインポートしました（{len(data)}件）",
            "id": imported.id,
            "total_rows": len(data),
            "columns": columns,
            "sheet_names": sheet_names
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"ファイルの読み込みに失敗しました: {str(e)}")


@router.post("/upload-excel/sheets")
async def get_excel_sheet_names(file: UploadFile = File(...)):
    """Excelファイルのシート名一覧を取得"""
    if not file.filename:
        raise HTTPException(status_code=400, detail="ファイル名が指定されていません")

    filename_lower = file.filename.lower()
    if not filename_lower.endswith(('.xlsx', '.xls', '.xlsm')):
        return {"success": True, "sheets": ["Sheet1"]}  # CSV等はSheet1固定

    try:
        file_content = await file.read()
        file_stream = io.BytesIO(file_content)
        excel_file = pd.ExcelFile(file_stream, engine='openpyxl')

        return {
            "success": True,
            "sheets": excel_file.sheet_names
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"シート一覧の取得に失敗しました: {str(e)}")


# ========== リードインポートAPI ==========

@router.post("/import/leads", response_model=ImportResult)
async def import_leads_from_spreadsheet(
    request: SpreadsheetURLRequest,
    db: Session = Depends(get_db)
):
    """スプレッドシートからリードをインポート"""
    if not spreadsheet_service.is_available():
        raise HTTPException(status_code=503, detail="Google Sheets service not available")

    try:
        leads_data = spreadsheet_service.import_leads(
            request.url,
            request.sheet_name,
            request.column_mapping
        )

        imported_count = 0
        skipped_count = 0
        errors = []

        for lead_data in leads_data:
            try:
                # 既存チェック（会社名で重複確認）
                existing = db.query(Lead).filter(
                    Lead.company_name == lead_data.get('company_name')
                ).first()

                if existing:
                    skipped_count += 1
                    continue

                # デフォルト値設定
                lead_data.setdefault('status', 'new')
                lead_data.setdefault('temperature', 'warm')
                lead_data.setdefault('score', 50)
                lead_data.setdefault('priority', 'medium')

                # リード作成
                lead = Lead(**lead_data)
                db.add(lead)
                imported_count += 1

            except Exception as e:
                errors.append(f"Row error: {str(e)}")
                continue

        db.commit()

        return ImportResult(
            success=True,
            imported_count=imported_count,
            skipped_count=skipped_count,
            errors=errors[:10]  # 最初の10件のエラーのみ
        )

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Import failed: {str(e)}")


# ========== 商談同期API ==========

@router.post("/sync/deals/from-sheet", response_model=ImportResult)
async def sync_deals_from_spreadsheet(
    request: SpreadsheetURLRequest,
    db: Session = Depends(get_db)
):
    """スプレッドシートから商談データをインポート"""
    if not spreadsheet_service.is_available():
        raise HTTPException(status_code=503, detail="Google Sheets service not available")

    try:
        deals_data = spreadsheet_service.sync_deals_from_sheet(
            request.url,
            request.sheet_name,
            request.column_mapping
        )

        imported_count = 0
        skipped_count = 0
        errors = []

        for deal_data in deals_data:
            try:
                # 既存チェック（案件名で重複確認）
                existing = db.query(Deal).filter(
                    Deal.title == deal_data.get('title')
                ).first()

                if existing:
                    # 既存の場合は更新
                    for key, value in deal_data.items():
                        if value is not None:
                            setattr(existing, key, value)
                    existing.updated_at = datetime.utcnow()
                    skipped_count += 1
                else:
                    # 新規作成
                    deal_data.setdefault('stage', 'discovery')
                    deal_data.setdefault('probability', 0)

                    deal = Deal(**deal_data)
                    db.add(deal)
                    imported_count += 1

            except Exception as e:
                errors.append(f"Row error: {str(e)}")
                continue

        db.commit()

        return ImportResult(
            success=True,
            imported_count=imported_count,
            skipped_count=skipped_count,
            errors=errors[:10]
        )

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Sync failed: {str(e)}")


@router.post("/sync/deals/to-sheet", response_model=SyncResult)
async def sync_deals_to_spreadsheet(
    request: SpreadsheetURLRequest,
    db: Session = Depends(get_db)
):
    """商談データをスプレッドシートに同期"""
    if not spreadsheet_service.is_available():
        raise HTTPException(status_code=503, detail="Google Sheets service not available")

    try:
        # 全商談データを取得
        deals = db.query(Deal).all()

        deals_data = []
        for deal in deals:
            # リード情報を取得
            lead = db.query(Lead).filter(Lead.id == deal.lead_id).first() if deal.lead_id else None

            deals_data.append({
                'id': deal.id,
                'title': deal.title,
                'company_name': lead.company_name if lead else '',
                'stage': deal.stage,
                'amount': deal.amount,
                'probability': deal.probability,
                'expected_close_date': deal.expected_close_date.isoformat() if deal.expected_close_date else '',
                'created_at': deal.created_at.isoformat() if deal.created_at else '',
                'updated_at': deal.updated_at.isoformat() if deal.updated_at else '',
            })

        sheet_name = request.sheet_name or "商談データ"
        spreadsheet_service.sync_deals_to_sheet(request.url, deals_data, sheet_name)

        return SyncResult(
            success=True,
            synced_count=len(deals_data),
            message=f"{len(deals_data)}件の商談を同期しました"
        )

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Sync failed: {str(e)}")


# ========== レポート出力API ==========

@router.post("/export/leads", response_model=ExportResult)
async def export_leads_to_spreadsheet(
    request: SpreadsheetURLRequest,
    db: Session = Depends(get_db)
):
    """リードレポートをスプレッドシートに出力"""
    if not spreadsheet_service.is_available():
        raise HTTPException(status_code=503, detail="Google Sheets service not available")

    try:
        leads = db.query(Lead).all()

        leads_data = [{
            'id': lead.id,
            'company_name': lead.company_name,
            'contact_name': lead.contact_name,
            'contact_email': lead.contact_email,
            'industry': lead.industry,
            'status': lead.status,
            'temperature': lead.temperature,
            'score': lead.score,
            'estimated_value': lead.estimated_value,
            'created_at': lead.created_at.isoformat() if lead.created_at else '',
        } for lead in leads]

        sheet_name = request.sheet_name or "リードレポート"
        spreadsheet_service.export_leads_report(request.url, leads_data, sheet_name)

        return ExportResult(
            success=True,
            exported_count=len(leads_data),
            sheet_name=sheet_name,
            message=f"{len(leads_data)}件のリードを出力しました"
        )

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Export failed: {str(e)}")


@router.post("/export/pipeline", response_model=ExportResult)
async def export_pipeline_to_spreadsheet(
    request: SpreadsheetURLRequest,
    db: Session = Depends(get_db)
):
    """パイプラインレポートをスプレッドシートに出力"""
    if not spreadsheet_service.is_available():
        raise HTTPException(status_code=503, detail="Google Sheets service not available")

    try:
        deals = db.query(Deal).filter(Deal.stage.notin_(['closed_won', 'closed_lost'])).all()

        # サマリー計算
        total_amount = sum(d.amount or 0 for d in deals)
        weighted_amount = sum((d.amount or 0) * (d.probability or 0) / 100 for d in deals)

        # ステージ別集計
        stage_counts = {}
        for deal in deals:
            stage = deal.stage or 'unknown'
            if stage not in stage_counts:
                stage_counts[stage] = {'count': 0, 'amount': 0}
            stage_counts[stage]['count'] += 1
            stage_counts[stage]['amount'] += deal.amount or 0

        by_stage = [
            {'stage': stage, 'count': data['count'], 'amount': data['amount']}
            for stage, data in stage_counts.items()
        ]

        summary = {
            'total_deals': len(deals),
            'total_amount': total_amount,
            'weighted_amount': weighted_amount,
            'by_stage': by_stage
        }

        deals_data = []
        for deal in deals:
            lead = db.query(Lead).filter(Lead.id == deal.lead_id).first() if deal.lead_id else None
            deals_data.append({
                'id': deal.id,
                'title': deal.title,
                'company_name': lead.company_name if lead else '',
                'stage': deal.stage,
                'amount': deal.amount,
                'probability': deal.probability,
                'expected_close_date': deal.expected_close_date.isoformat() if deal.expected_close_date else '',
            })

        sheet_name = request.sheet_name or "パイプラインレポート"
        spreadsheet_service.export_pipeline_report(request.url, deals_data, summary, sheet_name)

        return ExportResult(
            success=True,
            exported_count=len(deals_data),
            sheet_name=sheet_name,
            message=f"パイプラインレポートを出力しました（{len(deals_data)}件）"
        )

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Export failed: {str(e)}")


@router.post("/export/inquiries", response_model=ExportResult)
async def export_inquiries_to_spreadsheet(
    request: SpreadsheetURLRequest,
    db: Session = Depends(get_db)
):
    """問い合わせレポートをスプレッドシートに出力"""
    if not spreadsheet_service.is_available():
        raise HTTPException(status_code=503, detail="Google Sheets service not available")

    try:
        inquiries = db.query(Inquiry).all()

        # 統計
        stats = {
            'total': len(inquiries),
            'open': len([i for i in inquiries if i.status == 'open']),
            'in_progress': len([i for i in inquiries if i.status == 'in_progress']),
            'resolved': len([i for i in inquiries if i.status == 'resolved']),
            'sla_breached': len([i for i in inquiries if i.sla_breached]),
        }

        inquiries_data = [{
            'id': inq.id,
            'customer_name': inq.customer_name,
            'subject': inq.subject,
            'channel': inq.channel,
            'status': inq.status,
            'priority': inq.priority,
            'created_at': inq.created_at.isoformat() if inq.created_at else '',
        } for inq in inquiries]

        sheet_name = request.sheet_name or "問い合わせレポート"
        spreadsheet_service.export_inquiry_report(request.url, inquiries_data, stats, sheet_name)

        return ExportResult(
            success=True,
            exported_count=len(inquiries_data),
            sheet_name=sheet_name,
            message=f"問い合わせレポートを出力しました（{len(inquiries_data)}件）"
        )

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Export failed: {str(e)}")

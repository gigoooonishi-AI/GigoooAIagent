"""会社ナレッジベース API"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func
from typing import List, Optional
from datetime import datetime, date

from database import get_db
from models.db_models import CompanyMemo, SimpleUser, Lead
from models.schemas import (
    CompanyMemoCreate, CompanyMemoUpdate, CompanyMemoResponse,
    MemoSearchRequest, AIExtractionResult,
    KnowledgeChatRequest, KnowledgeChatResponse,
    SimpleUserCreate, SimpleUserResponse,
    CompanyListItem
)
from services.llm_service import llm_service

router = APIRouter(prefix="/api/knowledge", tags=["knowledge"])


# ========== ユーザー管理 ==========

@router.get("/users", response_model=List[SimpleUserResponse])
async def get_users(db: Session = Depends(get_db)):
    """ユーザー一覧取得"""
    users = db.query(SimpleUser).filter(SimpleUser.is_active == True).all()
    return [
        SimpleUserResponse(
            id=u.id,
            name=u.name,
            department=u.department,
            is_active=u.is_active,
            created_at=u.created_at.isoformat() if u.created_at else ""
        )
        for u in users
    ]


@router.post("/users", response_model=SimpleUserResponse)
async def create_user(user: SimpleUserCreate, db: Session = Depends(get_db)):
    """ユーザー作成"""
    # 既存チェック
    existing = db.query(SimpleUser).filter(SimpleUser.name == user.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="同名のユーザーが既に存在します")

    db_user = SimpleUser(
        name=user.name,
        department=user.department
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    return SimpleUserResponse(
        id=db_user.id,
        name=db_user.name,
        department=db_user.department,
        is_active=db_user.is_active,
        created_at=db_user.created_at.isoformat() if db_user.created_at else ""
    )


# ========== 会社名一覧 ==========

@router.get("/companies", response_model=List[CompanyListItem])
async def get_companies(db: Session = Depends(get_db)):
    """会社名一覧取得（Lead + Memoから統合）"""
    companies = {}

    # Leadから会社名取得
    leads = db.query(Lead.id, Lead.company_name).all()
    for lead in leads:
        if lead.company_name not in companies:
            companies[lead.company_name] = {
                "company_name": lead.company_name,
                "source": "lead",
                "lead_id": lead.id,
                "memo_count": 0
            }

    # Memoから会社名取得
    memo_counts = db.query(
        CompanyMemo.company_name,
        func.count(CompanyMemo.id).label("count")
    ).group_by(CompanyMemo.company_name).all()

    for memo in memo_counts:
        if memo.company_name in companies:
            companies[memo.company_name]["memo_count"] = memo.count
        else:
            companies[memo.company_name] = {
                "company_name": memo.company_name,
                "source": "memo",
                "lead_id": None,
                "memo_count": memo.count
            }

    return [CompanyListItem(**c) for c in companies.values()]


# ========== メモ CRUD ==========

@router.post("/memos", response_model=CompanyMemoResponse)
async def create_memo(memo: CompanyMemoCreate, db: Session = Depends(get_db)):
    """メモ作成（AI抽出実行）"""
    # AI抽出
    extraction = await llm_service.extract_memo_info(memo.original_text)

    # 日付変換
    meeting_date = None
    if extraction.get("meeting_date"):
        try:
            meeting_date = datetime.strptime(extraction["meeting_date"], "%Y-%m-%d").date()
        except ValueError:
            pass

    # Lead連携（会社名でマッチング）
    lead_id = memo.lead_id
    if not lead_id:
        lead = db.query(Lead).filter(Lead.company_name == memo.company_name).first()
        if lead:
            lead_id = lead.id

    db_memo = CompanyMemo(
        company_name=memo.company_name,
        original_text=memo.original_text,
        summary=extraction.get("summary"),
        decisions=extraction.get("decisions"),
        action_items=extraction.get("action_items"),
        next_actions=extraction.get("next_actions"),
        meeting_date=meeting_date,
        related_projects=extraction.get("related_projects"),
        memo_type=memo.memo_type,
        registered_user_name=memo.registered_user_name,
        lead_id=lead_id
    )
    db.add(db_memo)
    db.commit()
    db.refresh(db_memo)

    return _memo_to_response(db_memo)


@router.get("/memos", response_model=List[CompanyMemoResponse])
async def get_memos(
    company_name: Optional[str] = None,
    memo_type: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """メモ一覧取得"""
    query = db.query(CompanyMemo)

    if company_name:
        query = query.filter(CompanyMemo.company_name.ilike(f"%{company_name}%"))
    if memo_type:
        query = query.filter(CompanyMemo.memo_type == memo_type)

    memos = query.order_by(CompanyMemo.created_at.desc()).limit(limit).all()
    return [_memo_to_response(m) for m in memos]


@router.get("/memos/{memo_id}", response_model=CompanyMemoResponse)
async def get_memo(memo_id: int, db: Session = Depends(get_db)):
    """メモ詳細取得"""
    memo = db.query(CompanyMemo).filter(CompanyMemo.id == memo_id).first()
    if not memo:
        raise HTTPException(status_code=404, detail="メモが見つかりません")
    return _memo_to_response(memo)


@router.put("/memos/{memo_id}", response_model=CompanyMemoResponse)
async def update_memo(
    memo_id: int,
    update_data: CompanyMemoUpdate,
    db: Session = Depends(get_db)
):
    """メモ更新"""
    memo = db.query(CompanyMemo).filter(CompanyMemo.id == memo_id).first()
    if not memo:
        raise HTTPException(status_code=404, detail="メモが見つかりません")

    update_dict = update_data.model_dump(exclude_unset=True)

    # 日付変換
    if "meeting_date" in update_dict and update_dict["meeting_date"]:
        try:
            update_dict["meeting_date"] = datetime.strptime(
                update_dict["meeting_date"], "%Y-%m-%d"
            ).date()
        except ValueError:
            del update_dict["meeting_date"]

    for key, value in update_dict.items():
        setattr(memo, key, value)

    db.commit()
    db.refresh(memo)
    return _memo_to_response(memo)


@router.delete("/memos/{memo_id}")
async def delete_memo(memo_id: int, db: Session = Depends(get_db)):
    """メモ削除"""
    memo = db.query(CompanyMemo).filter(CompanyMemo.id == memo_id).first()
    if not memo:
        raise HTTPException(status_code=404, detail="メモが見つかりません")

    db.delete(memo)
    db.commit()
    return {"success": True, "message": "メモを削除しました"}


# ========== 検索 ==========

@router.post("/search", response_model=List[CompanyMemoResponse])
async def search_memos(request: MemoSearchRequest, db: Session = Depends(get_db)):
    """メモ検索"""
    query = db.query(CompanyMemo)

    filters = []

    if request.company_name:
        filters.append(CompanyMemo.company_name.ilike(f"%{request.company_name}%"))

    if request.query:
        search_filter = or_(
            CompanyMemo.original_text.ilike(f"%{request.query}%"),
            CompanyMemo.summary.ilike(f"%{request.query}%")
        )
        filters.append(search_filter)

    if request.memo_type:
        filters.append(CompanyMemo.memo_type == request.memo_type)

    if request.date_from:
        try:
            date_from = datetime.strptime(request.date_from, "%Y-%m-%d").date()
            filters.append(CompanyMemo.meeting_date >= date_from)
        except ValueError:
            pass

    if request.date_to:
        try:
            date_to = datetime.strptime(request.date_to, "%Y-%m-%d").date()
            filters.append(CompanyMemo.meeting_date <= date_to)
        except ValueError:
            pass

    if filters:
        query = query.filter(and_(*filters))

    memos = query.order_by(CompanyMemo.created_at.desc()).limit(request.limit).all()
    return [_memo_to_response(m) for m in memos]


@router.get("/memos/by-company/{company_name}", response_model=List[CompanyMemoResponse])
async def get_memos_by_company(company_name: str, db: Session = Depends(get_db)):
    """会社名でメモ取得"""
    memos = db.query(CompanyMemo).filter(
        CompanyMemo.company_name.ilike(f"%{company_name}%")
    ).order_by(CompanyMemo.created_at.desc()).all()
    return [_memo_to_response(m) for m in memos]


# ========== AI抽出プレビュー ==========

@router.post("/extract", response_model=AIExtractionResult)
async def extract_preview(request: CompanyMemoCreate):
    """AI抽出プレビュー（保存なし）"""
    extraction = await llm_service.extract_memo_info(request.original_text)
    return AIExtractionResult(
        summary=extraction.get("summary", ""),
        decisions=extraction.get("decisions", []),
        action_items=[
            {"owner": item.get("owner"), "task": item.get("task", ""), "deadline": item.get("deadline")}
            for item in extraction.get("action_items", [])
        ],
        next_actions=[
            {"action": item.get("action", ""), "date": item.get("date")}
            for item in extraction.get("next_actions", [])
        ],
        meeting_date=extraction.get("meeting_date"),
        related_projects=extraction.get("related_projects", [])
    )


# ========== チャットインターフェース ==========

@router.post("/chat", response_model=KnowledgeChatResponse)
async def knowledge_chat(request: KnowledgeChatRequest, db: Session = Depends(get_db)):
    """自然言語でのチャットインターフェース"""
    message = request.message
    action = request.action

    # アクション自動判定
    if action == "auto":
        # 長文（3行以上または200文字以上）は保存アクション候補
        if message.count("\n") >= 2 or len(message) > 200:
            action = "save"
        else:
            action = "search"

    if action == "save":
        # 保存フローの場合、AI抽出してプレビューを返す
        extraction = await llm_service.extract_memo_info(message)

        return KnowledgeChatResponse(
            success=True,
            message="内容を解析しました。会社名を指定して保存してください。",
            action_performed="extracted",
            extraction=AIExtractionResult(
                summary=extraction.get("summary", ""),
                decisions=extraction.get("decisions", []),
                action_items=extraction.get("action_items", []),
                next_actions=extraction.get("next_actions", []),
                meeting_date=extraction.get("meeting_date"),
                related_projects=extraction.get("related_projects", [])
            )
        )

    else:  # search
        # 検索実行
        memos = db.query(CompanyMemo).filter(
            or_(
                CompanyMemo.company_name.ilike(f"%{message}%"),
                CompanyMemo.original_text.ilike(f"%{message}%"),
                CompanyMemo.summary.ilike(f"%{message}%")
            )
        ).order_by(CompanyMemo.created_at.desc()).limit(10).all()

        if memos:
            return KnowledgeChatResponse(
                success=True,
                message=f"{len(memos)}件の情報が見つかりました。",
                action_performed="searched",
                memos=[_memo_to_response(m) for m in memos]
            )
        else:
            return KnowledgeChatResponse(
                success=True,
                message="該当する情報が見つかりませんでした。",
                action_performed="searched",
                memos=[]
            )


# ========== ヘルパー関数 ==========

def _memo_to_response(memo: CompanyMemo) -> CompanyMemoResponse:
    """DBモデルをレスポンススキーマに変換"""
    return CompanyMemoResponse(
        id=memo.id,
        company_name=memo.company_name,
        original_text=memo.original_text,
        summary=memo.summary,
        decisions=memo.decisions,
        action_items=memo.action_items,
        next_actions=memo.next_actions,
        meeting_date=memo.meeting_date.isoformat() if memo.meeting_date else None,
        related_projects=memo.related_projects,
        memo_type=memo.memo_type,
        registered_user_name=memo.registered_user_name,
        lead_id=memo.lead_id,
        created_at=memo.created_at.isoformat() if memo.created_at else "",
        updated_at=memo.updated_at.isoformat() if memo.updated_at else None
    )

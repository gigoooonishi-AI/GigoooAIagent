"""提案書API エンドポイント"""
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, date
import json

from database import get_db
from models.db_models import ProposalTemplate, Proposal, Quote, Lead, Competitor, WonProposal
from models.schemas import (
    ProposalTemplateCreate, ProposalTemplateResponse,
    ProposalCreate, ProposalResponse,
    QuoteBase, QuoteItem, AIProposalRequest,
    CompetitorCreate, CompetitorResponse, CompetitorComparisonRequest,
    WonProposalCreate, WonProposalResponse,
    RecommendationRequest, AutoQuoteRequest
)
from services.llm_service import LLMService

router = APIRouter()
llm_service = LLMService()


# ========== テンプレートAPI ==========

@router.get("/templates", response_model=List[ProposalTemplateResponse])
async def get_templates(
    industry: Optional[str] = None,
    issue_type: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """提案書テンプレート一覧取得"""
    query = db.query(ProposalTemplate).filter(ProposalTemplate.is_active == True)

    if industry:
        query = query.filter(ProposalTemplate.industry == industry)
    if issue_type:
        query = query.filter(ProposalTemplate.issue_type == issue_type)

    templates = query.all()
    return [
        ProposalTemplateResponse(
            id=t.id,
            name=t.name,
            industry=t.industry,
            issue_type=t.issue_type,
            structure=t.structure,
            is_active=t.is_active,
            created_at=t.created_at.isoformat() if t.created_at else ""
        )
        for t in templates
    ]


@router.post("/templates", response_model=ProposalTemplateResponse)
async def create_template(template: ProposalTemplateCreate, db: Session = Depends(get_db)):
    """提案書テンプレート作成"""
    db_template = ProposalTemplate(**template.model_dump())
    db.add(db_template)
    db.commit()
    db.refresh(db_template)
    return ProposalTemplateResponse(
        id=db_template.id,
        name=db_template.name,
        industry=db_template.industry,
        issue_type=db_template.issue_type,
        structure=db_template.structure,
        is_active=db_template.is_active,
        created_at=db_template.created_at.isoformat() if db_template.created_at else ""
    )


@router.get("/templates/{template_id}", response_model=ProposalTemplateResponse)
async def get_template(template_id: int, db: Session = Depends(get_db)):
    """提案書テンプレート詳細取得"""
    template = db.query(ProposalTemplate).filter(ProposalTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return ProposalTemplateResponse(
        id=template.id,
        name=template.name,
        industry=template.industry,
        issue_type=template.issue_type,
        structure=template.structure,
        is_active=template.is_active,
        created_at=template.created_at.isoformat() if template.created_at else ""
    )


@router.delete("/templates/{template_id}")
async def delete_template(template_id: int, db: Session = Depends(get_db)):
    """提案書テンプレート削除（論理削除）"""
    template = db.query(ProposalTemplate).filter(ProposalTemplate.id == template_id).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    template.is_active = False
    db.commit()
    return {"success": True, "message": "Template deleted"}


# ========== 競合管理API ==========

@router.get("/competitors", response_model=List[CompetitorResponse])
async def get_competitors(
    is_active: bool = True,
    db: Session = Depends(get_db)
):
    """競合一覧取得"""
    query = db.query(Competitor)
    if is_active:
        query = query.filter(Competitor.is_active == True)

    competitors = query.all()
    return [
        CompetitorResponse(
            id=c.id,
            name=c.name,
            description=c.description,
            website=c.website,
            strengths=c.strengths or [],
            weaknesses=c.weaknesses or [],
            pricing_info=c.pricing_info,
            target_market=c.target_market,
            features=c.features or {},
            differentiators=c.differentiators or [],
            is_active=c.is_active,
            created_at=c.created_at.isoformat() if c.created_at else "",
            updated_at=c.updated_at.isoformat() if c.updated_at else None
        )
        for c in competitors
    ]


@router.post("/competitors", response_model=CompetitorResponse)
async def create_competitor(competitor: CompetitorCreate, db: Session = Depends(get_db)):
    """競合情報作成"""
    db_competitor = Competitor(**competitor.model_dump())
    db.add(db_competitor)
    db.commit()
    db.refresh(db_competitor)

    return CompetitorResponse(
        id=db_competitor.id,
        name=db_competitor.name,
        description=db_competitor.description,
        website=db_competitor.website,
        strengths=db_competitor.strengths or [],
        weaknesses=db_competitor.weaknesses or [],
        pricing_info=db_competitor.pricing_info,
        target_market=db_competitor.target_market,
        features=db_competitor.features or {},
        differentiators=db_competitor.differentiators or [],
        is_active=db_competitor.is_active,
        created_at=db_competitor.created_at.isoformat() if db_competitor.created_at else "",
        updated_at=None
    )


@router.get("/competitors/{competitor_id}", response_model=CompetitorResponse)
async def get_competitor(competitor_id: int, db: Session = Depends(get_db)):
    """競合情報詳細取得"""
    competitor = db.query(Competitor).filter(Competitor.id == competitor_id).first()
    if not competitor:
        raise HTTPException(status_code=404, detail="Competitor not found")

    return CompetitorResponse(
        id=competitor.id,
        name=competitor.name,
        description=competitor.description,
        website=competitor.website,
        strengths=competitor.strengths or [],
        weaknesses=competitor.weaknesses or [],
        pricing_info=competitor.pricing_info,
        target_market=competitor.target_market,
        features=competitor.features or {},
        differentiators=competitor.differentiators or [],
        is_active=competitor.is_active,
        created_at=competitor.created_at.isoformat() if competitor.created_at else "",
        updated_at=competitor.updated_at.isoformat() if competitor.updated_at else None
    )


@router.put("/competitors/{competitor_id}", response_model=CompetitorResponse)
async def update_competitor(competitor_id: int, competitor: CompetitorCreate, db: Session = Depends(get_db)):
    """競合情報更新"""
    db_competitor = db.query(Competitor).filter(Competitor.id == competitor_id).first()
    if not db_competitor:
        raise HTTPException(status_code=404, detail="Competitor not found")

    for key, value in competitor.model_dump().items():
        if value is not None:
            setattr(db_competitor, key, value)

    db.commit()
    db.refresh(db_competitor)

    return CompetitorResponse(
        id=db_competitor.id,
        name=db_competitor.name,
        description=db_competitor.description,
        website=db_competitor.website,
        strengths=db_competitor.strengths or [],
        weaknesses=db_competitor.weaknesses or [],
        pricing_info=db_competitor.pricing_info,
        target_market=db_competitor.target_market,
        features=db_competitor.features or {},
        differentiators=db_competitor.differentiators or [],
        is_active=db_competitor.is_active,
        created_at=db_competitor.created_at.isoformat() if db_competitor.created_at else "",
        updated_at=db_competitor.updated_at.isoformat() if db_competitor.updated_at else None
    )


@router.delete("/competitors/{competitor_id}")
async def delete_competitor(competitor_id: int, db: Session = Depends(get_db)):
    """競合情報削除（論理削除）"""
    competitor = db.query(Competitor).filter(Competitor.id == competitor_id).first()
    if not competitor:
        raise HTTPException(status_code=404, detail="Competitor not found")

    competitor.is_active = False
    db.commit()
    return {"success": True, "message": "Competitor deleted"}


# ========== 受注提案書管理API ==========

@router.get("/won-proposals", response_model=List[WonProposalResponse])
async def get_won_proposals(
    industry: Optional[str] = None,
    company_size: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """受注提案書一覧取得"""
    query = db.query(WonProposal)

    if industry:
        query = query.filter(WonProposal.industry == industry)
    if company_size:
        query = query.filter(WonProposal.company_size == company_size)

    won_proposals = query.order_by(WonProposal.close_date.desc()).limit(limit).all()

    return [
        WonProposalResponse(
            id=wp.id,
            proposal_id=wp.proposal_id,
            deal_id=wp.deal_id,
            industry=wp.industry,
            company_size=wp.company_size,
            deal_value=wp.deal_value,
            pain_points=wp.pain_points or [],
            solution_structure=wp.solution_structure or {},
            key_success_factors=wp.key_success_factors or [],
            competitor_defeated=wp.competitor_defeated or [],
            proposal_sections=wp.proposal_sections or [],
            quote_items=wp.quote_items or [],
            close_date=wp.close_date.isoformat() if wp.close_date else None,
            created_at=wp.created_at.isoformat() if wp.created_at else ""
        )
        for wp in won_proposals
    ]


@router.post("/won-proposals", response_model=WonProposalResponse)
async def create_won_proposal(won_proposal: WonProposalCreate, db: Session = Depends(get_db)):
    """受注提案書登録"""
    data = won_proposal.model_dump()
    if data.get("close_date"):
        data["close_date"] = date.fromisoformat(data["close_date"])

    db_won = WonProposal(**data)
    db.add(db_won)
    db.commit()
    db.refresh(db_won)

    return WonProposalResponse(
        id=db_won.id,
        proposal_id=db_won.proposal_id,
        deal_id=db_won.deal_id,
        industry=db_won.industry,
        company_size=db_won.company_size,
        deal_value=db_won.deal_value,
        pain_points=db_won.pain_points or [],
        solution_structure=db_won.solution_structure or {},
        key_success_factors=db_won.key_success_factors or [],
        competitor_defeated=db_won.competitor_defeated or [],
        proposal_sections=db_won.proposal_sections or [],
        quote_items=db_won.quote_items or [],
        close_date=db_won.close_date.isoformat() if db_won.close_date else None,
        created_at=db_won.created_at.isoformat() if db_won.created_at else ""
    )


# ========== AI生成API ==========

@router.post("/ai/generate-story")
async def generate_proposal_story(request: AIProposalRequest):
    """AI提案ストーリー生成"""
    prompt = f"""以下の情報を基に、説得力のある提案書のストーリーを作成してください。

【顧客情報】
- 会社名: {request.client_name}
- 業界: {request.client_industry or '不明'}
- ニーズ・課題: {request.client_needs}

【提案製品・サービス】
- 名称: {request.product_name}
- 特徴: {request.product_features}

【ヒアリング内容】
{request.hearing_notes or 'なし'}

以下の構成で提案ストーリーを作成してください：
1. 現状の課題認識
2. 課題の背景と影響
3. 解決策の提案
4. 期待される効果
5. 導入ステップ

Markdown形式で出力してください。"""

    try:
        response = await llm_service.chat(
            messages=[{"role": "user", "content": prompt}],
            agent_id="proposal"
        )
        return {"success": True, "content": response}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.post("/ai/recommend-structure")
async def recommend_structure(request: AIProposalRequest):
    """AI構成推薦"""
    prompt = f"""以下の顧客情報を基に、最適な提案書の構成を推薦してください。

【顧客情報】
- 会社名: {request.client_name}
- 業界: {request.client_industry or '不明'}
- ニーズ: {request.client_needs}

【提案内容】
- 製品名: {request.product_name}
- 特徴: {request.product_features}

推薦する提案書構成をJSON形式で出力してください。
各セクションには title, type (text/table/chart), description を含めてください。"""

    try:
        response = await llm_service.chat(
            messages=[{"role": "user", "content": prompt}],
            agent_id="proposal"
        )
        return {"success": True, "content": response}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.post("/ai/competitor-comparison")
async def generate_competitor_comparison(
    request: CompetitorComparisonRequest,
    db: Session = Depends(get_db)
):
    """競合比較スライド自動生成"""
    competitors = db.query(Competitor).filter(
        Competitor.id.in_(request.competitor_ids),
        Competitor.is_active == True
    ).all()

    if not competitors:
        raise HTTPException(status_code=404, detail="No competitors found")

    competitor_info = "\n\n".join([
        f"""【{c.name}】
説明: {c.description or '情報なし'}
強み: {', '.join(c.strengths) if c.strengths else '情報なし'}
弱み: {', '.join(c.weaknesses) if c.weaknesses else '情報なし'}
価格: {c.pricing_info or '情報なし'}
機能: {json.dumps(c.features, ensure_ascii=False) if c.features else '情報なし'}"""
        for c in competitors
    ])

    prompt = f"""以下の情報を基に、競合比較スライド用のコンテンツを作成してください。

【自社製品】
- 製品名: {request.product_name}
- 特徴: {request.product_features}

【競合情報】
{competitor_info}

【顧客情報】
- 業界: {request.client_industry or '不明'}
- ニーズ: {request.client_needs or '不明'}

以下の形式でJSON出力してください：
{{
    "comparison_table": "Markdown形式の比較表（自社 vs 競合各社）",
    "our_advantages": ["自社の優位性1", "自社の優位性2", ...],
    "talking_points": ["商談で使えるトークポイント1", "トークポイント2", ...],
    "handling_objections": {{
        "競合Aの強みに対する反論": "対応トーク",
        "競合Bの強みに対する反論": "対応トーク"
    }},
    "slide_outline": [
        {{"title": "スライドタイトル", "content": "内容概要"}},
        ...
    ]
}}"""

    try:
        response = await llm_service.chat(
            messages=[{"role": "user", "content": prompt}],
            agent_id="proposal"
        )
        return {"success": True, "content": response}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.post("/ai/recommend-from-history")
async def recommend_from_won_proposals(
    request: RecommendationRequest,
    db: Session = Depends(get_db)
):
    """過去の受注案件から最適な提案構成を推薦"""
    query = db.query(WonProposal)

    if request.client_industry:
        query = query.filter(WonProposal.industry == request.client_industry)
    if request.client_company_size:
        query = query.filter(WonProposal.company_size == request.client_company_size)

    similar_cases = query.order_by(WonProposal.deal_value.desc()).limit(10).all()

    cases_info = "\n\n".join([
        f"""【案件{i+1}】
業界: {wp.industry or '不明'}
企業規模: {wp.company_size or '不明'}
受注金額: {wp.deal_value or 0:,.0f}円
顧客課題: {', '.join(wp.pain_points) if wp.pain_points else '情報なし'}
ソリューション構成: {json.dumps(wp.solution_structure, ensure_ascii=False) if wp.solution_structure else '情報なし'}
成功要因: {', '.join(wp.key_success_factors) if wp.key_success_factors else '情報なし'}
競合: {', '.join(wp.competitor_defeated) if wp.competitor_defeated else '情報なし'}
提案構成: {json.dumps(wp.proposal_sections, ensure_ascii=False) if wp.proposal_sections else '情報なし'}
見積明細: {json.dumps(wp.quote_items, ensure_ascii=False) if wp.quote_items else '情報なし'}"""
        for i, wp in enumerate(similar_cases)
    ]) if similar_cases else "過去の類似案件データがありません。"

    prompt = f"""以下の過去受注案件データと新規顧客情報を基に、最適な提案構成を推薦してください。

【新規顧客情報】
- 業界: {request.client_industry}
- 企業規模: {request.client_company_size or '不明'}
- ニーズ: {request.client_needs}
- 顧客課題: {', '.join(request.pain_points) if request.pain_points else '不明'}
- 予算感: {request.budget_range or '不明'}
- 競合: {', '.join(request.competitors) if request.competitors else '不明'}

【過去の類似受注案件】
{cases_info}

以下の形式でJSON出力してください：
{{
    "similar_cases_summary": "類似案件の傾向分析",
    "recommended_structure": {{
        "sections": [
            {{"title": "セクション名", "type": "text/table/chart", "description": "内容"}},
            ...
        ],
        "key_messages": ["キーメッセージ1", "キーメッセージ2", ...]
    }},
    "recommended_quote": [
        {{"name": "項目名", "description": "説明", "unit_price": 金額, "quantity": 数量, "amount": 合計}},
        ...
    ],
    "success_factors": ["この案件で重要な成功要因1", "成功要因2", ...],
    "tips": "提案時のアドバイス",
    "risk_factors": ["注意すべきリスク1", "リスク2", ...]
}}"""

    try:
        response = await llm_service.chat(
            messages=[{"role": "user", "content": prompt}],
            agent_id="proposal"
        )

        similar_cases_data = [
            {
                "id": wp.id,
                "industry": wp.industry,
                "company_size": wp.company_size,
                "deal_value": wp.deal_value,
                "key_success_factors": wp.key_success_factors
            }
            for wp in similar_cases
        ]

        return {
            "success": True,
            "similar_cases": similar_cases_data,
            "recommendation": response
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.post("/ai/generate-quote")
async def generate_auto_quote(
    request: AutoQuoteRequest,
    db: Session = Depends(get_db)
):
    """ヒアリング内容から見積を自動生成"""
    similar_quotes = []
    if request.client_industry:
        won_proposals = db.query(WonProposal).filter(
            WonProposal.industry == request.client_industry
        ).limit(5).all()
        similar_quotes = [wp.quote_items for wp in won_proposals if wp.quote_items]

    similar_quotes_info = "\n".join([
        f"参考見積{i+1}: {json.dumps(q, ensure_ascii=False)}"
        for i, q in enumerate(similar_quotes)
    ]) if similar_quotes else "参考データなし"

    prompt = f"""以下の情報を基に、見積明細を自動生成してください。

【顧客情報】
- 会社名: {request.client_name}
- 業界: {request.client_industry or '不明'}
- ニーズ: {request.client_needs}

【提案製品】
- 製品名: {request.product_name}

【ヒアリング内容】
{request.hearing_notes or '情報なし'}

【予算感】
{request.budget_hint or '不明'}

【参考：類似案件の見積】
{similar_quotes_info}

以下の形式でJSON出力してください：
{{
    "quote_items": [
        {{
            "name": "項目名",
            "description": "説明",
            "unit_price": 単価（数値）,
            "quantity": 数量（数値）,
            "amount": 合計（数値）
        }},
        ...
    ],
    "subtotal": 小計（数値）,
    "discount_suggestion": 推奨割引率（0-100の数値）,
    "discount_reason": "割引の根拠",
    "tax_rate": 10,
    "total": 税込合計（数値）,
    "rationale": "見積の根拠・説明",
    "negotiation_margin": "交渉の余地についてのアドバイス"
}}"""

    try:
        response = await llm_service.chat(
            messages=[{"role": "user", "content": prompt}],
            agent_id="proposal"
        )
        return {"success": True, "content": response}
    except Exception as e:
        return {"success": False, "error": str(e)}


# ========== 提案書API ==========

@router.get("/", response_model=List[ProposalResponse])
async def get_proposals(
    status: Optional[str] = None,
    lead_id: Optional[int] = None,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """提案書一覧取得"""
    query = db.query(Proposal)

    if status:
        query = query.filter(Proposal.status == status)
    if lead_id:
        query = query.filter(Proposal.lead_id == lead_id)

    proposals = query.order_by(Proposal.created_at.desc()).limit(limit).all()
    return [
        ProposalResponse(
            id=p.id,
            title=p.title,
            lead_id=p.lead_id,
            deal_id=p.deal_id,
            template_id=p.template_id,
            content=p.content,
            status=p.status,
            version=p.version,
            created_by=p.created_by,
            created_at=p.created_at.isoformat() if p.created_at else "",
            updated_at=p.updated_at.isoformat() if p.updated_at else None,
            quote=None
        )
        for p in proposals
    ]


@router.post("/", response_model=ProposalResponse)
async def create_proposal(proposal: ProposalCreate, db: Session = Depends(get_db)):
    """提案書作成"""
    db_proposal = Proposal(**proposal.model_dump())
    db.add(db_proposal)
    db.commit()
    db.refresh(db_proposal)
    return ProposalResponse(
        id=db_proposal.id,
        title=db_proposal.title,
        lead_id=db_proposal.lead_id,
        deal_id=db_proposal.deal_id,
        template_id=db_proposal.template_id,
        content=db_proposal.content,
        status=db_proposal.status,
        version=db_proposal.version,
        created_by=db_proposal.created_by,
        created_at=db_proposal.created_at.isoformat() if db_proposal.created_at else "",
        updated_at=None,
        quote=None
    )


# ========== 提案書詳細API（パスパラメータは最後に配置） ==========

@router.get("/{proposal_id}", response_model=ProposalResponse)
async def get_proposal(proposal_id: int, db: Session = Depends(get_db)):
    """提案書詳細取得"""
    proposal = db.query(Proposal).filter(Proposal.id == proposal_id).first()
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")

    quote_data = None
    if proposal.quote:
        quote_data = QuoteBase(
            items=proposal.quote.items or [],
            subtotal=float(proposal.quote.subtotal or 0),
            discount_rate=float(proposal.quote.discount_rate or 0),
            tax_rate=float(proposal.quote.tax_rate or 10),
            total=float(proposal.quote.total or 0),
            valid_until=proposal.quote.valid_until.isoformat() if proposal.quote.valid_until else None
        )

    return ProposalResponse(
        id=proposal.id,
        title=proposal.title,
        lead_id=proposal.lead_id,
        deal_id=proposal.deal_id,
        template_id=proposal.template_id,
        content=proposal.content,
        status=proposal.status,
        version=proposal.version,
        created_by=proposal.created_by,
        created_at=proposal.created_at.isoformat() if proposal.created_at else "",
        updated_at=proposal.updated_at.isoformat() if proposal.updated_at else None,
        quote=quote_data
    )


@router.put("/{proposal_id}", response_model=ProposalResponse)
async def update_proposal(proposal_id: int, proposal: ProposalCreate, db: Session = Depends(get_db)):
    """提案書更新"""
    db_proposal = db.query(Proposal).filter(Proposal.id == proposal_id).first()
    if not db_proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")

    for key, value in proposal.model_dump().items():
        if value is not None:
            setattr(db_proposal, key, value)

    db_proposal.version += 1
    db_proposal.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(db_proposal)

    return ProposalResponse(
        id=db_proposal.id,
        title=db_proposal.title,
        lead_id=db_proposal.lead_id,
        deal_id=db_proposal.deal_id,
        template_id=db_proposal.template_id,
        content=db_proposal.content,
        status=db_proposal.status,
        version=db_proposal.version,
        created_by=db_proposal.created_by,
        created_at=db_proposal.created_at.isoformat() if db_proposal.created_at else "",
        updated_at=db_proposal.updated_at.isoformat() if db_proposal.updated_at else None,
        quote=None
    )


@router.post("/{proposal_id}/quote")
async def create_or_update_quote(proposal_id: int, quote: QuoteBase, db: Session = Depends(get_db)):
    """見積作成・更新"""
    proposal = db.query(Proposal).filter(Proposal.id == proposal_id).first()
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")

    if proposal.quote:
        proposal.quote.items = [item.model_dump() for item in quote.items]
        proposal.quote.subtotal = quote.subtotal
        proposal.quote.discount_rate = quote.discount_rate
        proposal.quote.tax_rate = quote.tax_rate
        proposal.quote.total = quote.total
        if quote.valid_until:
            proposal.quote.valid_until = datetime.fromisoformat(quote.valid_until).date()
    else:
        db_quote = Quote(
            proposal_id=proposal_id,
            items=[item.model_dump() for item in quote.items],
            subtotal=quote.subtotal,
            discount_rate=quote.discount_rate,
            tax_rate=quote.tax_rate,
            total=quote.total,
            valid_until=datetime.fromisoformat(quote.valid_until).date() if quote.valid_until else None
        )
        db.add(db_quote)

    db.commit()
    return {"success": True, "message": "Quote saved"}


# ========== 顧客情報自動差し込みAPI ==========

@router.post("/{proposal_id}/autofill-customer")
async def autofill_customer_info(proposal_id: int, db: Session = Depends(get_db)):
    """顧客情報自動差し込み"""
    proposal = db.query(Proposal).filter(Proposal.id == proposal_id).first()
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")

    if not proposal.lead_id:
        raise HTTPException(status_code=400, detail="No lead associated with this proposal")

    lead = db.query(Lead).filter(Lead.id == proposal.lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    # 顧客情報を構造化
    customer_data = {
        "company_name": lead.company_name,
        "contact_name": lead.contact_name,
        "contact_email": lead.contact_email,
        "contact_phone": lead.contact_phone,
        "industry": lead.industry,
        "company_size": lead.company_size,
        "estimated_value": lead.estimated_value,
        "notes": lead.notes
    }

    # 提案書のcontentを更新
    content = proposal.content or {}
    content["customer"] = customer_data
    proposal.content = content
    db.commit()

    return {
        "success": True,
        "customer_data": customer_data,
        "message": "Customer info filled successfully"
    }


@router.get("/leads/{lead_id}/info-for-proposal")
async def get_lead_info_for_proposal(lead_id: int, db: Session = Depends(get_db)):
    """提案書用の顧客情報取得"""
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    return {
        "company_name": lead.company_name,
        "contact_name": lead.contact_name,
        "contact_email": lead.contact_email,
        "contact_phone": lead.contact_phone,
        "industry": lead.industry,
        "company_size": lead.company_size,
        "source": lead.source,
        "estimated_value": lead.estimated_value,
        "notes": lead.notes,
        "temperature": lead.temperature,
        "score": lead.score
    }


# ========== 見積シミュレーションAPI ==========

from pydantic import BaseModel

class SimulateQuoteRequest(BaseModel):
    items: List[dict]
    discount_rate: float = 0
    tax_rate: float = 10

class BulkSimulateRequest(BaseModel):
    base_items: List[dict]
    scenarios: List[dict]


@router.post("/quote/simulate")
async def simulate_quote(request: SimulateQuoteRequest):
    """見積金額シミュレーション"""
    subtotal = 0
    calculated_items = []

    for item in request.items:
        unit_price = float(item.get("unit_price", 0))
        quantity = int(item.get("quantity", 1))
        amount = unit_price * quantity
        subtotal += amount

        calculated_items.append({
            "name": item.get("name", ""),
            "description": item.get("description", ""),
            "unit_price": unit_price,
            "quantity": quantity,
            "amount": amount
        })

    discount_amount = subtotal * (request.discount_rate / 100)
    after_discount = subtotal - discount_amount
    tax_amount = after_discount * (request.tax_rate / 100)
    total = after_discount + tax_amount

    return {
        "items": calculated_items,
        "subtotal": subtotal,
        "discount_rate": request.discount_rate,
        "discount_amount": discount_amount,
        "after_discount": after_discount,
        "tax_rate": request.tax_rate,
        "tax_amount": tax_amount,
        "total": total
    }


@router.post("/quote/bulk-simulate")
async def bulk_simulate_quotes(request: BulkSimulateRequest):
    """複数シナリオの見積シミュレーション"""
    subtotal = sum(float(item.get("unit_price", 0)) * int(item.get("quantity", 1)) for item in request.base_items)

    results = []
    for scenario in request.scenarios:
        discount_rate = float(scenario.get("discount_rate", 0))
        tax_rate = float(scenario.get("tax_rate", 10))

        discount_amount = subtotal * (discount_rate / 100)
        after_discount = subtotal - discount_amount
        tax_amount = after_discount * (tax_rate / 100)
        total = after_discount + tax_amount

        results.append({
            "scenario": scenario,
            "subtotal": subtotal,
            "discount_amount": discount_amount,
            "after_discount": after_discount,
            "tax_amount": tax_amount,
            "total": total
        })

    return {"base_subtotal": subtotal, "scenarios": results}


# ========== PDF出力API ==========

@router.get("/{proposal_id}/export/pdf")
async def export_proposal_pdf(proposal_id: int, db: Session = Depends(get_db)):
    """提案書PDF出力"""
    from fastapi.responses import StreamingResponse
    from io import BytesIO

    proposal = db.query(Proposal).filter(Proposal.id == proposal_id).first()
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")

    # リード情報取得
    lead = None
    if proposal.lead_id:
        lead = db.query(Lead).filter(Lead.id == proposal.lead_id).first()

    try:
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import mm
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
        from reportlab.pdfbase import pdfmetrics
        from reportlab.pdfbase.ttfonts import TTFont

        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=20*mm, bottomMargin=20*mm)

        # 日本語フォント設定（システムフォント使用）
        try:
            pdfmetrics.registerFont(TTFont('MSGothic', 'C:/Windows/Fonts/msgothic.ttc'))
            font_name = 'MSGothic'
        except:
            font_name = 'Helvetica'

        styles = getSampleStyleSheet()
        styles.add(ParagraphStyle(
            name='JapaneseTitle',
            fontName=font_name,
            fontSize=18,
            spaceAfter=20,
            alignment=1
        ))
        styles.add(ParagraphStyle(
            name='JapaneseNormal',
            fontName=font_name,
            fontSize=10,
            spaceAfter=10
        ))
        styles.add(ParagraphStyle(
            name='JapaneseHeading',
            fontName=font_name,
            fontSize=14,
            spaceAfter=10,
            spaceBefore=15
        ))

        elements = []

        # タイトル
        elements.append(Paragraph(proposal.title, styles['JapaneseTitle']))
        elements.append(Spacer(1, 10*mm))

        # 顧客情報
        if lead:
            elements.append(Paragraph("顧客情報", styles['JapaneseHeading']))
            customer_data = [
                ["会社名", lead.company_name or "-"],
                ["担当者", lead.contact_name or "-"],
                ["業界", lead.industry or "-"],
                ["メール", lead.contact_email or "-"],
            ]
            customer_table = Table(customer_data, colWidths=[40*mm, 120*mm])
            customer_table.setStyle(TableStyle([
                ('FONTNAME', (0, 0), (-1, -1), font_name),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('BACKGROUND', (0, 0), (0, -1), colors.lightgrey),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('PADDING', (0, 0), (-1, -1), 5),
            ]))
            elements.append(customer_table)
            elements.append(Spacer(1, 10*mm))

        # 提案内容
        if proposal.content:
            content = proposal.content
            if isinstance(content, dict):
                for section_key, section_value in content.items():
                    if section_key != "customer":
                        elements.append(Paragraph(str(section_key), styles['JapaneseHeading']))
                        if isinstance(section_value, str):
                            elements.append(Paragraph(section_value, styles['JapaneseNormal']))
                        elif isinstance(section_value, list):
                            for item in section_value:
                                elements.append(Paragraph(f"・{item}", styles['JapaneseNormal']))

        # 見積情報
        if proposal.quote:
            elements.append(Spacer(1, 10*mm))
            elements.append(Paragraph("見積明細", styles['JapaneseHeading']))

            quote_header = [["項目", "説明", "単価", "数量", "金額"]]
            quote_rows = []
            for item in (proposal.quote.items or []):
                quote_rows.append([
                    item.get("name", ""),
                    item.get("description", "")[:20] + "..." if len(item.get("description", "")) > 20 else item.get("description", ""),
                    f"¥{item.get('unit_price', 0):,.0f}",
                    str(item.get("quantity", 1)),
                    f"¥{item.get('amount', 0):,.0f}"
                ])

            quote_data = quote_header + quote_rows
            quote_table = Table(quote_data, colWidths=[35*mm, 50*mm, 30*mm, 20*mm, 35*mm])
            quote_table.setStyle(TableStyle([
                ('FONTNAME', (0, 0), (-1, -1), font_name),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
                ('ALIGN', (2, 1), (-1, -1), 'RIGHT'),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('PADDING', (0, 0), (-1, -1), 5),
            ]))
            elements.append(quote_table)

            # 合計
            elements.append(Spacer(1, 5*mm))
            summary_data = [
                ["小計", f"¥{float(proposal.quote.subtotal or 0):,.0f}"],
                [f"割引 ({float(proposal.quote.discount_rate or 0):.1f}%)", f"-¥{float(proposal.quote.subtotal or 0) * float(proposal.quote.discount_rate or 0) / 100:,.0f}"],
                [f"消費税 ({float(proposal.quote.tax_rate or 10):.0f}%)", f"¥{(float(proposal.quote.subtotal or 0) * (1 - float(proposal.quote.discount_rate or 0) / 100)) * float(proposal.quote.tax_rate or 10) / 100:,.0f}"],
                ["合計", f"¥{float(proposal.quote.total or 0):,.0f}"],
            ]
            summary_table = Table(summary_data, colWidths=[130*mm, 40*mm])
            summary_table.setStyle(TableStyle([
                ('FONTNAME', (0, 0), (-1, -1), font_name),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
                ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
                ('BACKGROUND', (0, -1), (-1, -1), colors.lightgrey),
                ('FONTSIZE', (0, -1), (-1, -1), 12),
            ]))
            elements.append(summary_table)

        doc.build(elements)
        buffer.seek(0)

        # ファイル名のエンコード（日本語対応）
        from urllib.parse import quote
        safe_title = quote(proposal.title[:20], safe='')
        filename_ascii = f"proposal_{proposal_id}.pdf"
        filename_utf8 = f"proposal_{proposal_id}_{proposal.title[:20]}.pdf"

        return StreamingResponse(
            buffer,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=\"{filename_ascii}\"; filename*=UTF-8''{quote(filename_utf8)}"
            }
        )

    except ImportError:
        raise HTTPException(status_code=500, detail="PDF library not installed. Run: pip install reportlab")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF generation failed: {str(e)}")


# ========== PowerPoint出力API ==========

@router.get("/{proposal_id}/export/pptx")
async def export_proposal_pptx(proposal_id: int, db: Session = Depends(get_db)):
    """提案書PowerPoint出力"""
    from fastapi.responses import StreamingResponse
    from io import BytesIO

    proposal = db.query(Proposal).filter(Proposal.id == proposal_id).first()
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")

    lead = None
    if proposal.lead_id:
        lead = db.query(Lead).filter(Lead.id == proposal.lead_id).first()

    try:
        from pptx import Presentation
        from pptx.util import Inches, Pt
        from pptx.dml.color import RgbColor
        from pptx.enum.text import PP_ALIGN

        prs = Presentation()
        prs.slide_width = Inches(13.333)
        prs.slide_height = Inches(7.5)

        # タイトルスライド
        title_slide_layout = prs.slide_layouts[6]  # 空白レイアウト
        slide = prs.slides.add_slide(title_slide_layout)

        # タイトルテキストボックス
        title_box = slide.shapes.add_textbox(Inches(0.5), Inches(2.5), Inches(12.333), Inches(1.5))
        title_frame = title_box.text_frame
        title_para = title_frame.paragraphs[0]
        title_para.text = proposal.title
        title_para.font.size = Pt(44)
        title_para.font.bold = True
        title_para.alignment = PP_ALIGN.CENTER

        # 顧客名
        if lead:
            customer_box = slide.shapes.add_textbox(Inches(0.5), Inches(4.5), Inches(12.333), Inches(0.8))
            customer_frame = customer_box.text_frame
            customer_para = customer_frame.paragraphs[0]
            customer_para.text = f"{lead.company_name} 御中"
            customer_para.font.size = Pt(24)
            customer_para.alignment = PP_ALIGN.CENTER

        # 日付
        date_box = slide.shapes.add_textbox(Inches(0.5), Inches(6), Inches(12.333), Inches(0.5))
        date_frame = date_box.text_frame
        date_para = date_frame.paragraphs[0]
        date_para.text = datetime.now().strftime("%Y年%m月%d日")
        date_para.font.size = Pt(18)
        date_para.alignment = PP_ALIGN.CENTER

        # 顧客情報スライド
        if lead:
            content_layout = prs.slide_layouts[6]
            slide2 = prs.slides.add_slide(content_layout)

            # スライドタイトル
            header_box = slide2.shapes.add_textbox(Inches(0.5), Inches(0.3), Inches(12.333), Inches(0.8))
            header_frame = header_box.text_frame
            header_para = header_frame.paragraphs[0]
            header_para.text = "顧客概要"
            header_para.font.size = Pt(32)
            header_para.font.bold = True

            # 顧客情報テーブル
            table_data = [
                ["会社名", lead.company_name or "-"],
                ["担当者", lead.contact_name or "-"],
                ["業界", lead.industry or "-"],
                ["企業規模", lead.company_size or "-"],
                ["想定金額", f"¥{lead.estimated_value:,.0f}" if lead.estimated_value else "-"],
            ]

            rows = len(table_data)
            cols = 2
            table = slide2.shapes.add_table(rows, cols, Inches(1), Inches(1.5), Inches(11), Inches(0.5 * rows)).table

            for i, row_data in enumerate(table_data):
                for j, cell_text in enumerate(row_data):
                    cell = table.cell(i, j)
                    cell.text = str(cell_text)
                    para = cell.text_frame.paragraphs[0]
                    para.font.size = Pt(14)
                    if j == 0:
                        para.font.bold = True

        # 提案内容スライド
        if proposal.content:
            content = proposal.content
            if isinstance(content, dict):
                for section_key, section_value in content.items():
                    if section_key not in ["customer", "quote"]:
                        content_slide = prs.slides.add_slide(prs.slide_layouts[6])

                        # セクションタイトル
                        sec_header = content_slide.shapes.add_textbox(Inches(0.5), Inches(0.3), Inches(12.333), Inches(0.8))
                        sec_frame = sec_header.text_frame
                        sec_para = sec_frame.paragraphs[0]
                        sec_para.text = str(section_key)
                        sec_para.font.size = Pt(32)
                        sec_para.font.bold = True

                        # コンテンツ
                        content_box = content_slide.shapes.add_textbox(Inches(0.5), Inches(1.5), Inches(12.333), Inches(5))
                        content_frame = content_box.text_frame
                        content_frame.word_wrap = True

                        if isinstance(section_value, str):
                            p = content_frame.paragraphs[0]
                            p.text = section_value
                            p.font.size = Pt(18)
                        elif isinstance(section_value, list):
                            for idx, item in enumerate(section_value):
                                if idx == 0:
                                    p = content_frame.paragraphs[0]
                                else:
                                    p = content_frame.add_paragraph()
                                p.text = f"• {item}"
                                p.font.size = Pt(18)

        # 見積スライド
        if proposal.quote and proposal.quote.items:
            quote_slide = prs.slides.add_slide(prs.slide_layouts[6])

            q_header = quote_slide.shapes.add_textbox(Inches(0.5), Inches(0.3), Inches(12.333), Inches(0.8))
            q_frame = q_header.text_frame
            q_para = q_frame.paragraphs[0]
            q_para.text = "お見積り"
            q_para.font.size = Pt(32)
            q_para.font.bold = True

            # 見積テーブル
            items = proposal.quote.items
            rows = len(items) + 1
            cols = 4
            q_table = quote_slide.shapes.add_table(rows, cols, Inches(0.5), Inches(1.3), Inches(12), Inches(0.4 * rows)).table

            # ヘッダー
            headers = ["項目", "単価", "数量", "金額"]
            for j, h in enumerate(headers):
                cell = q_table.cell(0, j)
                cell.text = h
                para = cell.text_frame.paragraphs[0]
                para.font.bold = True
                para.font.size = Pt(12)

            # データ
            for i, item in enumerate(items):
                q_table.cell(i + 1, 0).text = item.get("name", "")
                q_table.cell(i + 1, 1).text = f"¥{item.get('unit_price', 0):,.0f}"
                q_table.cell(i + 1, 2).text = str(item.get("quantity", 1))
                q_table.cell(i + 1, 3).text = f"¥{item.get('amount', 0):,.0f}"

            # 合計表示
            total_box = quote_slide.shapes.add_textbox(Inches(8), Inches(1.3 + 0.4 * rows + 0.3), Inches(4.5), Inches(1.5))
            total_frame = total_box.text_frame

            total_frame.paragraphs[0].text = f"小計: ¥{float(proposal.quote.subtotal or 0):,.0f}"
            total_frame.paragraphs[0].font.size = Pt(16)

            p2 = total_frame.add_paragraph()
            p2.text = f"消費税: ¥{(float(proposal.quote.subtotal or 0) * float(proposal.quote.tax_rate or 10) / 100):,.0f}"
            p2.font.size = Pt(16)

            p3 = total_frame.add_paragraph()
            p3.text = f"合計: ¥{float(proposal.quote.total or 0):,.0f}"
            p3.font.size = Pt(24)
            p3.font.bold = True

        buffer = BytesIO()
        prs.save(buffer)
        buffer.seek(0)

        # ファイル名のエンコード（日本語対応）
        from urllib.parse import quote
        filename_ascii = f"proposal_{proposal_id}.pptx"
        filename_utf8 = f"proposal_{proposal_id}_{proposal.title[:20]}.pptx"

        return StreamingResponse(
            buffer,
            media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
            headers={
                "Content-Disposition": f"attachment; filename=\"{filename_ascii}\"; filename*=UTF-8''{quote(filename_utf8)}"
            }
        )

    except ImportError:
        raise HTTPException(status_code=500, detail="PowerPoint library not installed. Run: pip install python-pptx")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PowerPoint generation failed: {str(e)}")


# ========== プレビューAPI ==========

@router.get("/{proposal_id}/preview/pdf")
async def preview_proposal_pdf(proposal_id: int, db: Session = Depends(get_db)):
    """提案書PDFプレビュー（ブラウザ内表示）"""
    from fastapi.responses import StreamingResponse
    from io import BytesIO

    proposal = db.query(Proposal).filter(Proposal.id == proposal_id).first()
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")

    lead = None
    if proposal.lead_id:
        lead = db.query(Lead).filter(Lead.id == proposal.lead_id).first()

    try:
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import mm
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
        from reportlab.pdfbase import pdfmetrics
        from reportlab.pdfbase.ttfonts import TTFont

        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=20*mm, bottomMargin=20*mm)

        try:
            pdfmetrics.registerFont(TTFont('MSGothic', 'C:/Windows/Fonts/msgothic.ttc'))
            font_name = 'MSGothic'
        except:
            font_name = 'Helvetica'

        styles = getSampleStyleSheet()
        styles.add(ParagraphStyle(name='JapaneseTitle', fontName=font_name, fontSize=18, spaceAfter=20, alignment=1))
        styles.add(ParagraphStyle(name='JapaneseNormal', fontName=font_name, fontSize=10, spaceAfter=10))
        styles.add(ParagraphStyle(name='JapaneseHeading', fontName=font_name, fontSize=14, spaceAfter=10, spaceBefore=15))

        elements = []
        elements.append(Paragraph(proposal.title, styles['JapaneseTitle']))
        elements.append(Spacer(1, 10*mm))

        if lead:
            elements.append(Paragraph("顧客情報", styles['JapaneseHeading']))
            customer_data = [
                ["会社名", lead.company_name or "-"],
                ["担当者", lead.contact_name or "-"],
                ["業界", lead.industry or "-"],
                ["メール", lead.contact_email or "-"],
            ]
            customer_table = Table(customer_data, colWidths=[40*mm, 120*mm])
            customer_table.setStyle(TableStyle([
                ('FONTNAME', (0, 0), (-1, -1), font_name),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('BACKGROUND', (0, 0), (0, -1), colors.lightgrey),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('PADDING', (0, 0), (-1, -1), 5),
            ]))
            elements.append(customer_table)
            elements.append(Spacer(1, 10*mm))

        if proposal.content:
            content = proposal.content
            if isinstance(content, dict):
                for section_key, section_value in content.items():
                    if section_key != "customer":
                        elements.append(Paragraph(str(section_key), styles['JapaneseHeading']))
                        if isinstance(section_value, str):
                            elements.append(Paragraph(section_value, styles['JapaneseNormal']))
                        elif isinstance(section_value, list):
                            for item in section_value:
                                elements.append(Paragraph(f"・{item}", styles['JapaneseNormal']))

        if proposal.quote:
            elements.append(Spacer(1, 10*mm))
            elements.append(Paragraph("見積明細", styles['JapaneseHeading']))

            quote_header = [["項目", "説明", "単価", "数量", "金額"]]
            quote_rows = []
            for item in (proposal.quote.items or []):
                quote_rows.append([
                    item.get("name", ""),
                    item.get("description", "")[:20] + "..." if len(item.get("description", "")) > 20 else item.get("description", ""),
                    f"¥{item.get('unit_price', 0):,.0f}",
                    str(item.get("quantity", 1)),
                    f"¥{item.get('amount', 0):,.0f}"
                ])

            quote_data = quote_header + quote_rows
            quote_table = Table(quote_data, colWidths=[35*mm, 50*mm, 30*mm, 20*mm, 35*mm])
            quote_table.setStyle(TableStyle([
                ('FONTNAME', (0, 0), (-1, -1), font_name),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
                ('ALIGN', (2, 1), (-1, -1), 'RIGHT'),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('PADDING', (0, 0), (-1, -1), 5),
            ]))
            elements.append(quote_table)

            elements.append(Spacer(1, 5*mm))
            summary_data = [
                ["小計", f"¥{float(proposal.quote.subtotal or 0):,.0f}"],
                [f"割引 ({float(proposal.quote.discount_rate or 0):.1f}%)", f"-¥{float(proposal.quote.subtotal or 0) * float(proposal.quote.discount_rate or 0) / 100:,.0f}"],
                [f"消費税 ({float(proposal.quote.tax_rate or 10):.0f}%)", f"¥{(float(proposal.quote.subtotal or 0) * (1 - float(proposal.quote.discount_rate or 0) / 100)) * float(proposal.quote.tax_rate or 10) / 100:,.0f}"],
                ["合計", f"¥{float(proposal.quote.total or 0):,.0f}"],
            ]
            summary_table = Table(summary_data, colWidths=[130*mm, 40*mm])
            summary_table.setStyle(TableStyle([
                ('FONTNAME', (0, 0), (-1, -1), font_name),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
                ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
                ('BACKGROUND', (0, -1), (-1, -1), colors.lightgrey),
                ('FONTSIZE', (0, -1), (-1, -1), 12),
            ]))
            elements.append(summary_table)

        doc.build(elements)
        buffer.seek(0)

        # インライン表示（プレビュー用）
        return StreamingResponse(
            buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": "inline"}
        )

    except ImportError:
        raise HTTPException(status_code=500, detail="PDF library not installed")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF preview failed: {str(e)}")


@router.get("/{proposal_id}/preview/html")
async def preview_proposal_html(proposal_id: int, db: Session = Depends(get_db)):
    """提案書HTMLプレビュー"""
    from fastapi.responses import HTMLResponse

    proposal = db.query(Proposal).filter(Proposal.id == proposal_id).first()
    if not proposal:
        raise HTTPException(status_code=404, detail="Proposal not found")

    lead = None
    if proposal.lead_id:
        lead = db.query(Lead).filter(Lead.id == proposal.lead_id).first()

    # HTMLプレビュー生成
    html_content = f"""
    <!DOCTYPE html>
    <html lang="ja">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>{proposal.title} - プレビュー</title>
        <style>
            * {{ margin: 0; padding: 0; box-sizing: border-box; }}
            body {{
                font-family: 'Hiragino Sans', 'Yu Gothic', sans-serif;
                background: #f5f5f5;
                padding: 20px;
            }}
            .slide {{
                background: white;
                width: 100%;
                max-width: 960px;
                margin: 0 auto 30px;
                padding: 60px;
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.1);
                aspect-ratio: 16/9;
                display: flex;
                flex-direction: column;
            }}
            .slide-title {{
                background: linear-gradient(135deg, #1a1a2e, #16213e);
                color: white;
                text-align: center;
                justify-content: center;
                align-items: center;
            }}
            .slide-title h1 {{ font-size: 2.5em; margin-bottom: 20px; }}
            .slide-title .company {{ font-size: 1.5em; color: #aaa; }}
            .slide-title .date {{ font-size: 1em; color: #888; margin-top: 40px; }}
            .slide-content {{ padding: 20px 0; }}
            .slide-content h2 {{
                font-size: 1.8em;
                color: #1a1a2e;
                border-bottom: 3px solid #4CAF50;
                padding-bottom: 10px;
                margin-bottom: 30px;
            }}
            table {{
                width: 100%;
                border-collapse: collapse;
                margin: 20px 0;
            }}
            th, td {{
                padding: 12px 15px;
                text-align: left;
                border: 1px solid #ddd;
            }}
            th {{
                background: #1a1a2e;
                color: white;
            }}
            tr:nth-child(even) {{ background: #f9f9f9; }}
            .summary {{ margin-top: 20px; text-align: right; }}
            .summary .total {{ font-size: 1.5em; font-weight: bold; color: #1a1a2e; }}
            ul {{ list-style: none; }}
            ul li {{
                padding: 10px 0;
                padding-left: 25px;
                position: relative;
            }}
            ul li::before {{
                content: "✓";
                position: absolute;
                left: 0;
                color: #4CAF50;
                font-weight: bold;
            }}
            .nav {{
                position: fixed;
                bottom: 20px;
                right: 20px;
                display: flex;
                gap: 10px;
            }}
            .nav button {{
                padding: 10px 20px;
                border: none;
                border-radius: 5px;
                background: #1a1a2e;
                color: white;
                cursor: pointer;
            }}
            .nav button:hover {{ background: #16213e; }}
        </style>
    </head>
    <body>
        <!-- タイトルスライド -->
        <div class="slide slide-title">
            <h1>{proposal.title}</h1>
            <div class="company">{lead.company_name if lead else ''} 御中</div>
            <div class="date">{datetime.now().strftime('%Y年%m月%d日')}</div>
        </div>
    """

    # 顧客情報スライド
    if lead:
        html_content += f"""
        <div class="slide slide-content">
            <h2>顧客概要</h2>
            <table>
                <tr><th>項目</th><th>内容</th></tr>
                <tr><td>会社名</td><td>{lead.company_name or '-'}</td></tr>
                <tr><td>担当者</td><td>{lead.contact_name or '-'}</td></tr>
                <tr><td>業界</td><td>{lead.industry or '-'}</td></tr>
                <tr><td>企業規模</td><td>{lead.company_size or '-'}</td></tr>
                <tr><td>想定金額</td><td>¥{lead.estimated_value:,.0f}</td></tr>
            </table>
        </div>
        """

    # 提案内容スライド
    if proposal.content:
        content = proposal.content
        if isinstance(content, dict):
            for section_key, section_value in content.items():
                if section_key not in ["customer", "quote"]:
                    html_content += f"""
                    <div class="slide slide-content">
                        <h2>{section_key}</h2>
                    """
                    if isinstance(section_value, str):
                        html_content += f"<p>{section_value}</p>"
                    elif isinstance(section_value, list):
                        html_content += "<ul>"
                        for item in section_value:
                            html_content += f"<li>{item}</li>"
                        html_content += "</ul>"
                    html_content += "</div>"

    # 見積スライド
    if proposal.quote and proposal.quote.items:
        html_content += """
        <div class="slide slide-content">
            <h2>お見積り</h2>
            <table>
                <tr><th>項目</th><th>単価</th><th>数量</th><th>金額</th></tr>
        """
        for item in proposal.quote.items:
            html_content += f"""
                <tr>
                    <td>{item.get('name', '')}</td>
                    <td style="text-align:right">¥{item.get('unit_price', 0):,.0f}</td>
                    <td style="text-align:center">{item.get('quantity', 1)}</td>
                    <td style="text-align:right">¥{item.get('amount', 0):,.0f}</td>
                </tr>
            """
        html_content += f"""
            </table>
            <div class="summary">
                <p>小計: ¥{float(proposal.quote.subtotal or 0):,.0f}</p>
                <p>消費税: ¥{(float(proposal.quote.subtotal or 0) * float(proposal.quote.tax_rate or 10) / 100):,.0f}</p>
                <p class="total">合計: ¥{float(proposal.quote.total or 0):,.0f}</p>
            </div>
        </div>
        """

    html_content += f"""
        <div class="nav">
            <button onclick="window.print()">🖨️ 印刷</button>
            <a href="/api/proposals/{proposal_id}/export/pdf" class="nav-link" download>📄 PDF</a>
            <a href="/api/proposals/{proposal_id}/export/pptx" class="nav-link" download>📽️ PPTX</a>
            <button onclick="window.close()">✕ 閉じる</button>
        </div>
        <style>
            .nav-link {{
                padding: 10px 20px;
                border: none;
                border-radius: 5px;
                background: #4CAF50;
                color: white;
                cursor: pointer;
                text-decoration: none;
                font-size: 14px;
            }}
            .nav-link:hover {{ background: #45a049; }}
        </style>
    </body>
    </html>
    """

    return HTMLResponse(content=html_content)

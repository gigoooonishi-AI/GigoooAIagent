"""データベースAPI エンドポイント"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime, timedelta

from database import get_db
from models.db_models import Employee, Lead, Deal, Activity, Inquiry, InquiryResponse as InquiryResponseModel

router = APIRouter()


# ========== Pydanticスキーマ ==========

class EmployeeBase(BaseModel):
    name: str
    email: Optional[str] = None
    department: Optional[str] = None
    position: Optional[str] = None
    skills: Optional[dict] = None
    experience_years: Optional[int] = None
    projects: Optional[list] = None
    certifications: Optional[list] = None
    bio: Optional[str] = None


class EmployeeCreate(EmployeeBase):
    pass


class EmployeeResponse(EmployeeBase):
    id: int
    is_active: bool
    created_at: Optional[datetime]

    class Config:
        from_attributes = True


class LeadBase(BaseModel):
    company_name: str
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    source: Optional[str] = None
    status: Optional[str] = "new"
    priority: Optional[str] = "medium"
    estimated_value: Optional[float] = None
    notes: Optional[str] = None
    next_action: Optional[str] = None
    next_action_date: Optional[datetime] = None
    assigned_to: Optional[int] = None


class LeadCreate(LeadBase):
    pass


class LeadResponse(LeadBase):
    id: int
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class DealBase(BaseModel):
    title: str
    lead_id: Optional[int] = None
    stage: Optional[str] = "discovery"
    amount: Optional[float] = None
    probability: Optional[int] = 0
    expected_close_date: Optional[datetime] = None
    description: Optional[str] = None
    notes: Optional[str] = None
    assigned_to: Optional[int] = None


class DealCreate(DealBase):
    pass


class DealResponse(DealBase):
    id: int
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class ActivityBase(BaseModel):
    deal_id: int
    type: str
    subject: Optional[str] = None
    description: Optional[str] = None
    outcome: Optional[str] = None
    next_step: Optional[str] = None
    activity_date: Optional[datetime] = None
    created_by: Optional[int] = None


class ActivityCreate(ActivityBase):
    pass


class ActivityResponse(ActivityBase):
    id: int
    created_at: Optional[datetime]

    class Config:
        from_attributes = True


class InquiryBase(BaseModel):
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    subject: Optional[str] = None
    content: str
    category: Optional[str] = None
    status: Optional[str] = "open"
    priority: Optional[str] = "medium"


class InquiryCreate(InquiryBase):
    pass


class InquiryResponse(InquiryBase):
    id: int
    response: Optional[str]
    responded_by: Optional[int]
    responded_at: Optional[datetime]
    created_at: Optional[datetime]

    class Config:
        from_attributes = True


# ========== 社員（スキル検索）API ==========

@router.get("/employees", response_model=List[EmployeeResponse])
async def get_employees(
    skill: Optional[str] = Query(None, description="検索するスキル"),
    department: Optional[str] = None,
    min_experience: Optional[int] = None,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """社員一覧取得（スキル検索対応）"""
    query = db.query(Employee).filter(Employee.is_active == True)

    if department:
        query = query.filter(Employee.department == department)

    if min_experience:
        query = query.filter(Employee.experience_years >= min_experience)

    employees = query.limit(limit).all()

    # スキルでフィルタリング（JSONフィールドなのでPython側で処理）
    if skill:
        skill_lower = skill.lower()
        employees = [
            e for e in employees
            if e.skills and any(skill_lower in k.lower() for k in e.skills.keys())
        ]

    return employees


@router.post("/employees", response_model=EmployeeResponse)
async def create_employee(employee: EmployeeCreate, db: Session = Depends(get_db)):
    """社員作成"""
    db_employee = Employee(**employee.model_dump())
    db.add(db_employee)
    db.commit()
    db.refresh(db_employee)
    return db_employee


@router.get("/employees/{employee_id}", response_model=EmployeeResponse)
async def get_employee(employee_id: int, db: Session = Depends(get_db)):
    """社員詳細取得"""
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    return employee


@router.get("/employees/search/skills")
async def search_by_skills(
    skills: str = Query(..., description="カンマ区切りのスキル"),
    db: Session = Depends(get_db)
):
    """複数スキルで社員検索"""
    skill_list = [s.strip().lower() for s in skills.split(",")]
    employees = db.query(Employee).filter(Employee.is_active == True).all()

    results = []
    for emp in employees:
        if emp.skills:
            matching_skills = [
                k for k in emp.skills.keys()
                if any(s in k.lower() for s in skill_list)
            ]
            if matching_skills:
                results.append({
                    "id": emp.id,
                    "name": emp.name,
                    "department": emp.department,
                    "matching_skills": matching_skills,
                    "all_skills": emp.skills,
                    "experience_years": emp.experience_years
                })

    return {"results": results, "count": len(results)}


# ========== リード（見込み客）API ==========

@router.get("/leads", response_model=List[LeadResponse])
async def get_leads(
    status: Optional[str] = None,
    priority: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """リード一覧取得"""
    query = db.query(Lead)

    if status:
        query = query.filter(Lead.status == status)
    if priority:
        query = query.filter(Lead.priority == priority)

    return query.order_by(Lead.created_at.desc()).limit(limit).all()


@router.post("/leads", response_model=LeadResponse)
async def create_lead(lead: LeadCreate, db: Session = Depends(get_db)):
    """リード作成"""
    db_lead = Lead(**lead.model_dump())
    db.add(db_lead)
    db.commit()
    db.refresh(db_lead)
    return db_lead


@router.get("/leads/stats/overview")
async def get_leads_stats(db: Session = Depends(get_db)):
    """リード統計取得"""
    now = datetime.utcnow()

    # ステータス別集計
    status_counts = {}
    for status in ["new", "contacting", "proposal", "negotiation", "won", "lost"]:
        status_counts[status] = db.query(Lead).filter(Lead.status == status).count()

    # 温度感別集計
    temperature_counts = {}
    for temp in ["hot", "warm", "cold"]:
        temperature_counts[temp] = db.query(Lead).filter(Lead.temperature == temp).count()

    # 業界別集計
    industry_stats = db.query(
        Lead.industry,
        func.count(Lead.id)
    ).group_by(Lead.industry).all()

    # 規模別集計
    size_stats = db.query(
        Lead.company_size,
        func.count(Lead.id)
    ).group_by(Lead.company_size).all()

    # 流入経路別集計
    source_stats = db.query(
        Lead.source,
        func.count(Lead.id)
    ).group_by(Lead.source).all()

    # アクション期限切れ
    overdue_count = db.query(Lead).filter(
        Lead.status.notin_(["won", "lost"]),
        Lead.next_action_date < now
    ).count()

    # 14日以上接触なし
    no_contact_count = db.query(Lead).filter(
        Lead.status.notin_(["won", "lost"]),
        or_(
            Lead.last_contact_date < now - timedelta(days=14),
            Lead.last_contact_date == None
        )
    ).count()

    # 平均スコア
    avg_score = db.query(func.avg(Lead.score)).filter(
        Lead.status.notin_(["won", "lost"])
    ).scalar() or 0

    return {
        "total": db.query(Lead).count(),
        "active": db.query(Lead).filter(Lead.status.notin_(["won", "lost"])).count(),
        "by_status": status_counts,
        "by_temperature": temperature_counts,
        "by_industry": [{"industry": i[0] or "未設定", "count": i[1]} for i in industry_stats],
        "by_size": [{"size": s[0] or "未設定", "count": s[1]} for s in size_stats],
        "by_source": [{"source": s[0] or "未設定", "count": s[1]} for s in source_stats],
        "overdue_actions": overdue_count,
        "no_recent_contact": no_contact_count,
        "avg_score": round(avg_score, 1)
    }


@router.get("/leads/{lead_id}", response_model=LeadResponse)
async def get_lead(lead_id: int, db: Session = Depends(get_db)):
    """リード詳細取得"""
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead


@router.put("/leads/{lead_id}", response_model=LeadResponse)
async def update_lead(lead_id: int, lead: LeadCreate, db: Session = Depends(get_db)):
    """リード更新"""
    db_lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not db_lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    for key, value in lead.model_dump().items():
        setattr(db_lead, key, value)

    db.commit()
    db.refresh(db_lead)
    return db_lead


@router.put("/leads/{lead_id}/status")
async def update_lead_status(
    lead_id: int,
    status: str,
    lost_reason: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """リードステータス更新"""
    valid_statuses = ["new", "contacting", "proposal", "negotiation", "won", "lost"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")

    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    lead.status = status
    if status == "lost" and lost_reason:
        lead.lost_reason = lost_reason

    db.commit()
    db.refresh(lead)
    return {"success": True, "lead": lead}


@router.put("/leads/{lead_id}/score")
async def update_lead_score(
    lead_id: int,
    score: int,
    temperature: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """リードスコア・温度感更新"""
    if score < 0 or score > 100:
        raise HTTPException(status_code=400, detail="Score must be between 0 and 100")

    if temperature and temperature not in ["hot", "warm", "cold"]:
        raise HTTPException(status_code=400, detail="Temperature must be hot, warm, or cold")

    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    lead.score = score
    if temperature:
        lead.temperature = temperature

    db.commit()
    db.refresh(lead)
    return {"success": True, "lead": lead}


@router.post("/leads/{lead_id}/activities")
async def add_lead_activity(
    lead_id: int,
    type: str,
    subject: str,
    description: Optional[str] = None,
    outcome: Optional[str] = None,
    next_step: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """リード活動履歴追加"""
    valid_types = ["call", "email", "meeting", "demo", "other"]
    if type not in valid_types:
        raise HTTPException(status_code=400, detail=f"Invalid type. Must be one of: {valid_types}")

    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    activity = Activity(
        lead_id=lead_id,
        type=type,
        subject=subject,
        description=description,
        outcome=outcome,
        next_step=next_step,
        activity_date=datetime.utcnow()
    )
    db.add(activity)

    # 最終接触日を更新
    lead.last_contact_date = datetime.utcnow()

    db.commit()
    return {"success": True, "activity_id": activity.id}


@router.get("/leads/{lead_id}/history")
async def get_lead_history(lead_id: int, db: Session = Depends(get_db)):
    """リード活動履歴取得（直接の活動＋案件経由の活動）"""
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    # 直接の活動
    direct_activities = db.query(Activity).filter(
        Activity.lead_id == lead_id
    ).all()

    # 案件経由の活動
    deal_activities = db.query(Activity).join(Deal).filter(
        Deal.lead_id == lead_id
    ).all()

    all_activities = list(direct_activities) + list(deal_activities)
    all_activities.sort(key=lambda x: x.activity_date or x.created_at, reverse=True)

    return {
        "lead_id": lead_id,
        "company_name": lead.company_name,
        "activities": [
            {
                "id": a.id,
                "type": a.type,
                "subject": a.subject,
                "description": a.description,
                "outcome": a.outcome,
                "next_step": a.next_step,
                "activity_date": a.activity_date.isoformat() if a.activity_date else None,
                "created_at": a.created_at.isoformat() if a.created_at else None,
                "deal_id": a.deal_id
            }
            for a in all_activities
        ],
        "total_count": len(all_activities)
    }


@router.put("/leads/{lead_id}/next-action")
async def update_lead_next_action(
    lead_id: int,
    next_action: str,
    next_action_date: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """次アクション更新"""
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    lead.next_action = next_action
    if next_action_date:
        lead.next_action_date = datetime.fromisoformat(next_action_date.replace('Z', '+00:00'))

    db.commit()
    db.refresh(lead)
    return {"success": True, "lead": lead}


# ========== 商談（案件）API ==========

@router.get("/deals", response_model=List[DealResponse])
async def get_deals(
    stage: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """商談一覧取得"""
    query = db.query(Deal)

    if stage:
        query = query.filter(Deal.stage == stage)

    return query.order_by(Deal.created_at.desc()).limit(limit).all()


@router.post("/deals", response_model=DealResponse)
async def create_deal(deal: DealCreate, db: Session = Depends(get_db)):
    """商談作成"""
    db_deal = Deal(**deal.model_dump())
    db.add(db_deal)
    db.commit()
    db.refresh(db_deal)
    return db_deal


@router.get("/deals/summary/pipeline")
async def get_pipeline_summary(db: Session = Depends(get_db)):
    """パイプラインサマリー取得"""
    stages = ["discovery", "proposal", "negotiation", "closed_won", "closed_lost"]
    summary = {}

    for stage in stages:
        deals = db.query(Deal).filter(Deal.stage == stage).all()
        summary[stage] = {
            "count": len(deals),
            "total_amount": sum(d.amount or 0 for d in deals)
        }

    return summary


# ========== 活動履歴API ==========

@router.get("/activities", response_model=List[ActivityResponse])
async def get_activities(
    deal_id: Optional[int] = None,
    type: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """活動一覧取得"""
    query = db.query(Activity)

    if deal_id:
        query = query.filter(Activity.deal_id == deal_id)
    if type:
        query = query.filter(Activity.type == type)

    return query.order_by(Activity.created_at.desc()).limit(limit).all()


@router.post("/activities", response_model=ActivityResponse)
async def create_activity(activity: ActivityCreate, db: Session = Depends(get_db)):
    """活動記録作成"""
    db_activity = Activity(**activity.model_dump())
    db.add(db_activity)
    db.commit()
    db.refresh(db_activity)
    return db_activity


# ========== 問い合わせAPI ==========

@router.get("/inquiries", response_model=List[InquiryResponse])
async def get_inquiries(
    status: Optional[str] = None,
    category: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """問い合わせ一覧取得"""
    query = db.query(Inquiry)

    if status:
        query = query.filter(Inquiry.status == status)
    if category:
        query = query.filter(Inquiry.category == category)

    return query.order_by(Inquiry.created_at.desc()).limit(limit).all()


@router.post("/inquiries", response_model=InquiryResponse)
async def create_inquiry(inquiry: InquiryCreate, db: Session = Depends(get_db)):
    """問い合わせ作成"""
    db_inquiry = Inquiry(**inquiry.model_dump())
    db.add(db_inquiry)
    db.commit()
    db.refresh(db_inquiry)
    return db_inquiry


@router.put("/inquiries/{inquiry_id}/respond")
async def respond_to_inquiry(
    inquiry_id: int,
    response: str,
    responded_by: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """問い合わせに回答"""
    inquiry = db.query(Inquiry).filter(Inquiry.id == inquiry_id).first()
    if not inquiry:
        raise HTTPException(status_code=404, detail="Inquiry not found")

    inquiry.response = response
    inquiry.responded_by = responded_by
    inquiry.responded_at = datetime.utcnow()
    inquiry.status = "resolved"

    db.commit()
    db.refresh(inquiry)
    return inquiry


@router.put("/inquiries/{inquiry_id}/assign")
async def assign_inquiry(
    inquiry_id: int,
    assigned_to: int,
    db: Session = Depends(get_db)
):
    """問い合わせ担当者割当"""
    inquiry = db.query(Inquiry).filter(Inquiry.id == inquiry_id).first()
    if not inquiry:
        raise HTTPException(status_code=404, detail="Inquiry not found")

    inquiry.assigned_to = assigned_to
    if inquiry.status == "open":
        inquiry.status = "in_progress"
    db.commit()
    db.refresh(inquiry)
    return {"success": True, "inquiry": inquiry}


@router.put("/inquiries/{inquiry_id}/status")
async def update_inquiry_status(
    inquiry_id: int,
    status: str,
    db: Session = Depends(get_db)
):
    """問い合わせステータス更新"""
    valid_statuses = ["open", "in_progress", "resolved", "closed"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")

    inquiry = db.query(Inquiry).filter(Inquiry.id == inquiry_id).first()
    if not inquiry:
        raise HTTPException(status_code=404, detail="Inquiry not found")

    inquiry.status = status
    db.commit()
    db.refresh(inquiry)
    return {"success": True, "inquiry": inquiry}


@router.get("/inquiries/by-channel")
async def get_inquiries_by_channel(db: Session = Depends(get_db)):
    """チャネル別問い合わせ集計"""
    channels = ["web", "email", "phone"]
    now = datetime.utcnow()

    result = {}
    for channel in channels:
        total = db.query(Inquiry).filter(Inquiry.channel == channel).count()
        open_count = db.query(Inquiry).filter(
            Inquiry.channel == channel,
            Inquiry.status.in_(["open", "in_progress"])
        ).count()
        resolved_today = db.query(Inquiry).filter(
            Inquiry.channel == channel,
            Inquiry.status.in_(["resolved", "closed"]),
            Inquiry.updated_at >= now.replace(hour=0, minute=0, second=0)
        ).count()

        result[channel] = {
            "total": total,
            "open": open_count,
            "resolved_today": resolved_today
        }

    return {
        "channels": result,
        "total_open": sum(c["open"] for c in result.values()),
        "total_resolved_today": sum(c["resolved_today"] for c in result.values())
    }


@router.get("/inquiries/stats")
async def get_inquiry_stats(db: Session = Depends(get_db)):
    """問い合わせ統計"""
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=7)

    # 全体統計
    total = db.query(Inquiry).count()
    open_count = db.query(Inquiry).filter(Inquiry.status == "open").count()
    in_progress = db.query(Inquiry).filter(Inquiry.status == "in_progress").count()
    resolved = db.query(Inquiry).filter(Inquiry.status.in_(["resolved", "closed"])).count()

    # 今日の統計
    today_new = db.query(Inquiry).filter(Inquiry.created_at >= today_start).count()
    today_resolved = db.query(Inquiry).filter(
        Inquiry.status.in_(["resolved", "closed"]),
        Inquiry.updated_at >= today_start
    ).count()

    # SLA統計
    sla_breached = db.query(Inquiry).filter(
        Inquiry.status.in_(["open", "in_progress"]),
        Inquiry.first_response_at == None,
        Inquiry.created_at < now - timedelta(minutes=60)
    ).count()

    # 平均対応時間
    resolved_inquiries = db.query(Inquiry).filter(
        Inquiry.first_response_at != None,
        Inquiry.created_at >= week_start
    ).all()

    if resolved_inquiries:
        avg_response_time = sum(
            (i.first_response_at - i.created_at).total_seconds() / 60
            for i in resolved_inquiries
        ) / len(resolved_inquiries)
    else:
        avg_response_time = 0

    # 担当者別
    assignee_stats = db.query(
        Inquiry.assigned_to,
        func.count(Inquiry.id)
    ).filter(
        Inquiry.assigned_to != None,
        Inquiry.status.in_(["open", "in_progress"])
    ).group_by(Inquiry.assigned_to).all()

    return {
        "total": total,
        "open": open_count,
        "in_progress": in_progress,
        "resolved": resolved,
        "today_new": today_new,
        "today_resolved": today_resolved,
        "sla_breached": sla_breached,
        "avg_response_time_minutes": round(avg_response_time, 1),
        "by_assignee": [{"assignee_id": a[0], "count": a[1]} for a in assignee_stats]
    }


# ========== 統計API ==========

@router.get("/stats/overview")
async def get_stats_overview(db: Session = Depends(get_db)):
    """全体統計取得"""
    return {
        "employees": {
            "total": db.query(Employee).filter(Employee.is_active == True).count()
        },
        "leads": {
            "total": db.query(Lead).count(),
            "new": db.query(Lead).filter(Lead.status == "new").count(),
            "qualified": db.query(Lead).filter(Lead.status == "qualified").count()
        },
        "deals": {
            "total": db.query(Deal).count(),
            "open": db.query(Deal).filter(Deal.stage.notin_(["closed_won", "closed_lost"])).count(),
            "won": db.query(Deal).filter(Deal.stage == "closed_won").count(),
            "total_value": db.query(func.sum(Deal.amount)).filter(Deal.stage == "closed_won").scalar() or 0
        },
        "inquiries": {
            "total": db.query(Inquiry).count(),
            "open": db.query(Inquiry).filter(Inquiry.status == "open").count()
        }
    }


# ========== ダッシュボード拡張API ==========

@router.get("/leads/monthly-followups")
async def get_monthly_followup_leads(db: Session = Depends(get_db)):
    """今月フォロー対象のリード一覧"""
    now = datetime.utcnow()
    start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    end_of_month = (start_of_month + timedelta(days=32)).replace(day=1) - timedelta(seconds=1)

    leads = db.query(Lead).filter(
        Lead.status.notin_(["won", "lost"]),
        or_(
            Lead.next_action_date.between(start_of_month, end_of_month),
            Lead.next_action_date < now,  # 期限切れも含む
            Lead.last_contact_date < now - timedelta(days=14)  # 14日以上接触なし
        )
    ).order_by(Lead.next_action_date.asc().nullslast()).all()

    return {
        "leads": [
            {
                "id": l.id,
                "company_name": l.company_name,
                "contact_name": l.contact_name,
                "status": l.status,
                "priority": l.priority,
                "score": l.score,
                "temperature": l.temperature,
                "next_action": l.next_action,
                "next_action_date": l.next_action_date.isoformat() if l.next_action_date else None,
                "last_contact_date": l.last_contact_date.isoformat() if l.last_contact_date else None,
                "days_since_contact": (now - l.last_contact_date).days if l.last_contact_date else None,
                "is_overdue": l.next_action_date < now if l.next_action_date else False
            }
            for l in leads
        ],
        "count": len(leads)
    }


@router.get("/leads/{lead_id}/activities")
async def get_lead_activities(lead_id: int, db: Session = Depends(get_db)):
    """リードの活動履歴取得"""
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    # リードに紐づく案件の活動を取得
    activities = db.query(Activity).join(Deal).filter(
        Deal.lead_id == lead_id
    ).order_by(Activity.activity_date.desc()).all()

    return {
        "lead_id": lead_id,
        "company_name": lead.company_name,
        "activities": [
            {
                "id": a.id,
                "type": a.type,
                "subject": a.subject,
                "description": a.description,
                "outcome": a.outcome,
                "next_step": a.next_step,
                "activity_date": a.activity_date.isoformat() if a.activity_date else None,
                "created_at": a.created_at.isoformat() if a.created_at else None
            }
            for a in activities
        ]
    }


@router.get("/deals/stalled")
async def get_stalled_deals(days: int = 14, db: Session = Depends(get_db)):
    """滞留案件一覧取得"""
    threshold = datetime.utcnow() - timedelta(days=days)

    deals = db.query(Deal).filter(
        Deal.stage.notin_(["closed_won", "closed_lost"]),
        Deal.updated_at < threshold
    ).order_by(Deal.updated_at.asc()).all()

    now = datetime.utcnow()
    return {
        "deals": [
            {
                "id": d.id,
                "title": d.title,
                "stage": d.stage,
                "amount": d.amount,
                "probability": d.probability,
                "weighted_value": (d.amount or 0) * (d.probability or 0) / 100,
                "expected_close_date": d.expected_close_date.isoformat() if d.expected_close_date else None,
                "updated_at": d.updated_at.isoformat() if d.updated_at else None,
                "days_stalled": (now - d.updated_at).days if d.updated_at else 0,
                "assigned_to": d.assigned_to
            }
            for d in deals
        ],
        "count": len(deals),
        "threshold_days": days
    }


@router.get("/deals/forecast")
async def get_sales_forecast(period: str = "monthly", db: Session = Depends(get_db)):
    """売上予測取得"""
    now = datetime.utcnow()

    # オープン案件を取得
    open_deals = db.query(Deal).filter(
        Deal.stage.notin_(["closed_won", "closed_lost"])
    ).all()

    # 月次予測
    if period == "monthly":
        forecasts = {}
        for deal in open_deals:
            if deal.expected_close_date:
                month_key = deal.expected_close_date.strftime("%Y-%m")
            else:
                month_key = now.strftime("%Y-%m")

            if month_key not in forecasts:
                forecasts[month_key] = {
                    "period": month_key,
                    "expected_amount": 0,
                    "weighted_amount": 0,
                    "deal_count": 0
                }

            forecasts[month_key]["expected_amount"] += deal.amount or 0
            forecasts[month_key]["weighted_amount"] += (deal.amount or 0) * (deal.probability or 0) / 100
            forecasts[month_key]["deal_count"] += 1

        return {"forecasts": list(sorted(forecasts.values(), key=lambda x: x["period"]))}

    # 四半期予測
    elif period == "quarterly":
        forecasts = {}
        for deal in open_deals:
            if deal.expected_close_date:
                quarter = (deal.expected_close_date.month - 1) // 3 + 1
                quarter_key = f"{deal.expected_close_date.year}-Q{quarter}"
            else:
                quarter = (now.month - 1) // 3 + 1
                quarter_key = f"{now.year}-Q{quarter}"

            if quarter_key not in forecasts:
                forecasts[quarter_key] = {
                    "period": quarter_key,
                    "expected_amount": 0,
                    "weighted_amount": 0,
                    "deal_count": 0
                }

            forecasts[quarter_key]["expected_amount"] += deal.amount or 0
            forecasts[quarter_key]["weighted_amount"] += (deal.amount or 0) * (deal.probability or 0) / 100
            forecasts[quarter_key]["deal_count"] += 1

        return {"forecasts": list(sorted(forecasts.values(), key=lambda x: x["period"]))}

    return {"error": "Invalid period. Use 'monthly' or 'quarterly'"}


@router.get("/deals/metrics")
async def get_pipeline_metrics(db: Session = Depends(get_db)):
    """パイプライン指標取得"""
    stages = ["discovery", "proposal", "negotiation", "closed_won", "closed_lost"]

    # ステージごとの案件数と金額
    stage_metrics = {}
    for stage in stages:
        deals = db.query(Deal).filter(Deal.stage == stage).all()
        stage_metrics[stage] = {
            "count": len(deals),
            "total_amount": sum(d.amount or 0 for d in deals),
            "weighted_amount": sum((d.amount or 0) * (d.probability or 0) / 100 for d in deals)
        }

    # 全体の勝率
    total_closed = stage_metrics["closed_won"]["count"] + stage_metrics["closed_lost"]["count"]
    win_rate = stage_metrics["closed_won"]["count"] / total_closed * 100 if total_closed > 0 else 0

    return {
        "stage_metrics": stage_metrics,
        "win_rate": round(win_rate, 1),
        "total_pipeline_value": sum(m["total_amount"] for s, m in stage_metrics.items() if s not in ["closed_won", "closed_lost"]),
        "total_weighted_value": sum(m["weighted_amount"] for s, m in stage_metrics.items() if s not in ["closed_won", "closed_lost"])
    }


@router.get("/inquiries/sla-status")
async def get_inquiries_sla_status(db: Session = Depends(get_db)):
    """問い合わせSLA状況取得"""
    inquiries = db.query(Inquiry).filter(
        Inquiry.status.in_(["open", "in_progress"])
    ).order_by(Inquiry.created_at.asc()).all()

    now = datetime.utcnow()
    results = []

    for inq in inquiries:
        sla_minutes = inq.sla_target_minutes or 60
        sla_deadline = inq.created_at + timedelta(minutes=sla_minutes)
        is_breached = now > sla_deadline and not inq.first_response_at

        if inq.first_response_at:
            response_time = (inq.first_response_at - inq.created_at).total_seconds() / 60
            sla_met = response_time <= sla_minutes
        else:
            response_time = None
            sla_met = False

        results.append({
            "id": inq.id,
            "subject": inq.subject,
            "customer_name": inq.customer_name,
            "channel": inq.channel,
            "status": inq.status,
            "priority": inq.priority,
            "category": inq.category,
            "created_at": inq.created_at.isoformat() if inq.created_at else None,
            "sla_target_minutes": sla_minutes,
            "sla_deadline": sla_deadline.isoformat(),
            "is_sla_breached": is_breached,
            "first_response_at": inq.first_response_at.isoformat() if inq.first_response_at else None,
            "response_time_minutes": round(response_time, 1) if response_time else None,
            "sla_met": sla_met,
            "urgency_score": inq.urgency_score,
            "assigned_to": inq.assigned_to
        })

    breached_count = sum(1 for r in results if r["is_sla_breached"])
    return {
        "inquiries": results,
        "total": len(results),
        "breached_count": breached_count,
        "compliance_rate": round((len(results) - breached_count) / len(results) * 100, 1) if results else 100
    }


@router.post("/inquiries/{inquiry_id}/responses")
async def add_inquiry_response(
    inquiry_id: int,
    content: str,
    responded_by: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """問い合わせに対応を追加"""
    inquiry = db.query(Inquiry).filter(Inquiry.id == inquiry_id).first()
    if not inquiry:
        raise HTTPException(status_code=404, detail="Inquiry not found")

    # 対応履歴を追加
    response = InquiryResponseModel(
        inquiry_id=inquiry_id,
        content=content,
        responded_by=responded_by
    )
    db.add(response)

    # 初回対応の場合
    if not inquiry.first_response_at:
        inquiry.first_response_at = datetime.utcnow()

    inquiry.status = "in_progress"
    db.commit()

    return {"success": True, "message": "Response added"}


@router.get("/inquiries/{inquiry_id}/responses")
async def get_inquiry_responses(inquiry_id: int, db: Session = Depends(get_db)):
    """問い合わせ対応履歴取得"""
    inquiry = db.query(Inquiry).filter(Inquiry.id == inquiry_id).first()
    if not inquiry:
        raise HTTPException(status_code=404, detail="Inquiry not found")

    responses = db.query(InquiryResponseModel).filter(
        InquiryResponseModel.inquiry_id == inquiry_id
    ).order_by(InquiryResponseModel.created_at.asc()).all()

    return {
        "inquiry_id": inquiry_id,
        "responses": [
            {
                "id": r.id,
                "content": r.content,
                "responded_by": r.responded_by,
                "created_at": r.created_at.isoformat() if r.created_at else None
            }
            for r in responses
        ]
    }


# ========== パイプライン分析API ==========

@router.get("/deals/analytics")
async def get_deals_analytics(db: Session = Depends(get_db)):
    """商談分析データ取得"""
    all_deals = db.query(Deal).all()
    now = datetime.utcnow()

    # フェーズ別集計
    stages = ["discovery", "proposal", "negotiation", "closed_won", "closed_lost"]
    stage_data = {}
    for stage in stages:
        stage_deals = [d for d in all_deals if d.stage == stage]
        stage_data[stage] = {
            "count": len(stage_deals),
            "total_amount": sum(d.amount or 0 for d in stage_deals),
            "weighted_amount": sum((d.amount or 0) * (d.probability or 0) / 100 for d in stage_deals),
            "avg_probability": sum(d.probability or 0 for d in stage_deals) / len(stage_deals) if stage_deals else 0
        }

    # 確度別集計
    probability_ranges = [
        {"label": "0-25%", "min": 0, "max": 25},
        {"label": "26-50%", "min": 26, "max": 50},
        {"label": "51-75%", "min": 51, "max": 75},
        {"label": "76-100%", "min": 76, "max": 100}
    ]
    probability_data = []
    for pr in probability_ranges:
        deals_in_range = [d for d in all_deals if d.stage not in ["closed_won", "closed_lost"]
                         and pr["min"] <= (d.probability or 0) <= pr["max"]]
        probability_data.append({
            "range": pr["label"],
            "count": len(deals_in_range),
            "amount": sum(d.amount or 0 for d in deals_in_range),
            "weighted": sum((d.amount or 0) * (d.probability or 0) / 100 for d in deals_in_range)
        })

    # 失注率計算
    total_closed = stage_data["closed_won"]["count"] + stage_data["closed_lost"]["count"]
    loss_rate = stage_data["closed_lost"]["count"] / total_closed * 100 if total_closed > 0 else 0
    win_rate = stage_data["closed_won"]["count"] / total_closed * 100 if total_closed > 0 else 0

    # フェーズ遷移率（簡易版 - 前フェーズとの比較）
    transition_rates = []
    active_stages = ["discovery", "proposal", "negotiation"]
    for i in range(len(active_stages) - 1):
        current = stage_data[active_stages[i]]["count"]
        next_stage = stage_data[active_stages[i + 1]]["count"]
        rate = next_stage / current * 100 if current > 0 else 0
        transition_rates.append({
            "from": active_stages[i],
            "to": active_stages[i + 1],
            "rate": round(rate, 1)
        })

    return {
        "stage_data": stage_data,
        "probability_data": probability_data,
        "win_rate": round(win_rate, 1),
        "loss_rate": round(loss_rate, 1),
        "transition_rates": transition_rates,
        "total_pipeline": sum(d.amount or 0 for d in all_deals if d.stage not in ["closed_won", "closed_lost"]),
        "weighted_pipeline": sum((d.amount or 0) * (d.probability or 0) / 100 for d in all_deals if d.stage not in ["closed_won", "closed_lost"])
    }


@router.get("/deals/by-owner")
async def get_deals_by_owner(db: Session = Depends(get_db)):
    """担当者別商談集計"""
    deals = db.query(Deal).filter(
        Deal.stage.notin_(["closed_won", "closed_lost"])
    ).all()

    owner_data = {}
    for deal in deals:
        owner_id = deal.assigned_to or 0
        if owner_id not in owner_data:
            # 担当者情報を取得
            employee = db.query(Employee).filter(Employee.id == owner_id).first() if owner_id else None
            owner_data[owner_id] = {
                "owner_id": owner_id,
                "owner_name": employee.name if employee else "未アサイン",
                "deal_count": 0,
                "total_amount": 0,
                "weighted_amount": 0,
                "stages": {}
            }

        owner_data[owner_id]["deal_count"] += 1
        owner_data[owner_id]["total_amount"] += deal.amount or 0
        owner_data[owner_id]["weighted_amount"] += (deal.amount or 0) * (deal.probability or 0) / 100

        stage = deal.stage
        if stage not in owner_data[owner_id]["stages"]:
            owner_data[owner_id]["stages"][stage] = {"count": 0, "amount": 0}
        owner_data[owner_id]["stages"][stage]["count"] += 1
        owner_data[owner_id]["stages"][stage]["amount"] += deal.amount or 0

    return {
        "owners": list(owner_data.values()),
        "total_owners": len(owner_data)
    }


@router.get("/deals/forecast-detailed")
async def get_detailed_forecast(db: Session = Depends(get_db)):
    """詳細売上予測（確度別）"""
    now = datetime.utcnow()
    current_month = now.strftime("%Y-%m")
    current_quarter = f"{now.year}-Q{(now.month - 1) // 3 + 1}"

    deals = db.query(Deal).filter(
        Deal.stage.notin_(["closed_won", "closed_lost"])
    ).all()

    # 当月予測
    monthly_deals = [d for d in deals if d.expected_close_date and
                     d.expected_close_date.strftime("%Y-%m") == current_month]

    # 当四半期予測
    quarterly_deals = [d for d in deals if d.expected_close_date and
                       f"{d.expected_close_date.year}-Q{(d.expected_close_date.month - 1) // 3 + 1}" == current_quarter]

    def calculate_forecast(deal_list):
        total = sum(d.amount or 0 for d in deal_list)
        weighted = sum((d.amount or 0) * (d.probability or 0) / 100 for d in deal_list)
        high_prob = sum(d.amount or 0 for d in deal_list if (d.probability or 0) >= 75)
        mid_prob = sum(d.amount or 0 for d in deal_list if 50 <= (d.probability or 0) < 75)
        low_prob = sum(d.amount or 0 for d in deal_list if (d.probability or 0) < 50)
        return {
            "total_amount": total,
            "weighted_amount": weighted,
            "high_probability": high_prob,
            "mid_probability": mid_prob,
            "low_probability": low_prob,
            "deal_count": len(deal_list)
        }

    return {
        "current_month": {
            "period": current_month,
            **calculate_forecast(monthly_deals)
        },
        "current_quarter": {
            "period": current_quarter,
            **calculate_forecast(quarterly_deals)
        },
        "total_pipeline": {
            **calculate_forecast(deals)
        }
    }


@router.get("/deals/stalled-alerts")
async def get_stalled_alerts(days: int = 14, db: Session = Depends(get_db)):
    """滞留アラート（指定日数以上進んでいない案件）"""
    threshold = datetime.utcnow() - timedelta(days=days)
    now = datetime.utcnow()

    deals = db.query(Deal).filter(
        Deal.stage.notin_(["closed_won", "closed_lost"]),
        Deal.updated_at < threshold
    ).order_by(Deal.amount.desc()).all()

    alerts = []
    for d in deals:
        days_stalled = (now - d.updated_at).days if d.updated_at else 0
        severity = "critical" if days_stalled > 30 else "warning" if days_stalled > 14 else "info"

        # 担当者情報
        owner = db.query(Employee).filter(Employee.id == d.assigned_to).first() if d.assigned_to else None

        alerts.append({
            "id": d.id,
            "title": d.title,
            "stage": d.stage,
            "amount": d.amount,
            "probability": d.probability,
            "weighted_value": (d.amount or 0) * (d.probability or 0) / 100,
            "expected_close_date": d.expected_close_date.isoformat() if d.expected_close_date else None,
            "updated_at": d.updated_at.isoformat() if d.updated_at else None,
            "days_stalled": days_stalled,
            "severity": severity,
            "owner_name": owner.name if owner else "未アサイン",
            "owner_id": d.assigned_to
        })

    return {
        "alerts": alerts,
        "total_count": len(alerts),
        "critical_count": sum(1 for a in alerts if a["severity"] == "critical"),
        "warning_count": sum(1 for a in alerts if a["severity"] == "warning"),
        "total_at_risk": sum(a["amount"] or 0 for a in alerts)
    }


# ========== パラメータ付きルート（最後に配置） ==========

@router.get("/deals/detail/{deal_id}", response_model=DealResponse)
async def get_deal(deal_id: int, db: Session = Depends(get_db)):
    """商談詳細取得"""
    deal = db.query(Deal).filter(Deal.id == deal_id).first()
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")
    return deal

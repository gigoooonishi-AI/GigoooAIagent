"""アラートAPI エンドポイント"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime, timedelta

from database import get_db
from models.db_models import Alert, AlertRule, Lead, Deal, Inquiry
from models.schemas import (
    AlertCreate, AlertResponse,
    AlertRuleCreate, AlertRuleResponse
)

router = APIRouter()


# ========== アラートAPI ==========

@router.get("/", response_model=List[AlertResponse])
async def get_alerts(
    type: Optional[str] = None,
    priority: Optional[str] = None,
    is_read: Optional[bool] = None,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """アラート一覧取得"""
    query = db.query(Alert).filter(Alert.is_dismissed == False)

    if type:
        query = query.filter(Alert.type == type)
    if priority:
        query = query.filter(Alert.priority == priority)
    if is_read is not None:
        query = query.filter(Alert.is_read == is_read)

    alerts = query.order_by(Alert.triggered_at.desc()).limit(limit).all()
    return [
        AlertResponse(
            id=a.id,
            type=a.type,
            entity_type=a.entity_type,
            entity_id=a.entity_id,
            title=a.title,
            description=a.description,
            priority=a.priority,
            due_date=a.due_date.isoformat() if a.due_date else None,
            assigned_to=a.assigned_to,
            is_read=a.is_read,
            is_dismissed=a.is_dismissed,
            triggered_at=a.triggered_at.isoformat() if a.triggered_at else ""
        )
        for a in alerts
    ]


@router.get("/unread-count")
async def get_unread_count(db: Session = Depends(get_db)):
    """未読アラート数取得"""
    count = db.query(Alert).filter(
        Alert.is_read == False,
        Alert.is_dismissed == False
    ).count()
    return {"unread_count": count}


@router.put("/{alert_id}/read")
async def mark_as_read(alert_id: int, db: Session = Depends(get_db)):
    """アラートを既読にする"""
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    alert.is_read = True
    db.commit()
    return {"success": True, "message": "Alert marked as read"}


@router.put("/{alert_id}/dismiss")
async def dismiss_alert(alert_id: int, db: Session = Depends(get_db)):
    """アラートを却下する"""
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    alert.is_dismissed = True
    db.commit()
    return {"success": True, "message": "Alert dismissed"}


@router.post("/", response_model=AlertResponse)
async def create_alert(alert: AlertCreate, db: Session = Depends(get_db)):
    """アラート作成"""
    alert_data = alert.model_dump()
    if alert_data.get("due_date"):
        alert_data["due_date"] = datetime.fromisoformat(alert_data["due_date"])

    db_alert = Alert(**alert_data)
    db.add(db_alert)
    db.commit()
    db.refresh(db_alert)

    return AlertResponse(
        id=db_alert.id,
        type=db_alert.type,
        entity_type=db_alert.entity_type,
        entity_id=db_alert.entity_id,
        title=db_alert.title,
        description=db_alert.description,
        priority=db_alert.priority,
        due_date=db_alert.due_date.isoformat() if db_alert.due_date else None,
        assigned_to=db_alert.assigned_to,
        is_read=db_alert.is_read,
        is_dismissed=db_alert.is_dismissed,
        triggered_at=db_alert.triggered_at.isoformat() if db_alert.triggered_at else ""
    )


# ========== アラート生成API ==========

@router.post("/generate")
async def generate_alerts(db: Session = Depends(get_db)):
    """アラート自動生成（定期実行用）"""
    generated = []

    # 1. フォローアップ期限切れ（リード）
    overdue_leads = db.query(Lead).filter(
        Lead.next_action_date < datetime.utcnow(),
        Lead.status.notin_(["won", "lost"])
    ).all()

    for lead in overdue_leads:
        # 既存アラートチェック
        existing = db.query(Alert).filter(
            Alert.type == "follow_up",
            Alert.entity_type == "lead",
            Alert.entity_id == lead.id,
            Alert.is_dismissed == False
        ).first()

        if not existing:
            alert = Alert(
                type="follow_up",
                entity_type="lead",
                entity_id=lead.id,
                title=f"フォローアップ期限切れ: {lead.company_name}",
                description=f"次アクション「{lead.next_action}」の期限が過ぎています",
                priority="high",
                due_date=lead.next_action_date,
                assigned_to=lead.assigned_to
            )
            db.add(alert)
            generated.append(f"follow_up: {lead.company_name}")

    # 2. 滞留案件（商談）
    stall_threshold = datetime.utcnow() - timedelta(days=14)
    stalled_deals = db.query(Deal).filter(
        Deal.stage.notin_(["closed_won", "closed_lost"]),
        Deal.updated_at < stall_threshold
    ).all()

    for deal in stalled_deals:
        existing = db.query(Alert).filter(
            Alert.type == "stalled_deal",
            Alert.entity_type == "deal",
            Alert.entity_id == deal.id,
            Alert.is_dismissed == False
        ).first()

        if not existing:
            days_stalled = (datetime.utcnow() - deal.updated_at).days if deal.updated_at else 0
            priority = "high" if deal.probability and deal.probability >= 50 else "medium"

            alert = Alert(
                type="stalled_deal",
                entity_type="deal",
                entity_id=deal.id,
                title=f"案件滞留: {deal.title}",
                description=f"{days_stalled}日間進捗なし（確度: {deal.probability}%）",
                priority=priority,
                assigned_to=deal.assigned_to
            )
            db.add(alert)
            generated.append(f"stalled_deal: {deal.title}")

    # 3. SLA違反（問い合わせ）
    inquiries = db.query(Inquiry).filter(
        Inquiry.status.in_(["open", "in_progress"]),
        Inquiry.first_response_at == None
    ).all()

    for inquiry in inquiries:
        sla_minutes = inquiry.sla_target_minutes or 60
        sla_deadline = inquiry.created_at + timedelta(minutes=sla_minutes)

        if datetime.utcnow() > sla_deadline:
            existing = db.query(Alert).filter(
                Alert.type == "inquiry_sla",
                Alert.entity_type == "inquiry",
                Alert.entity_id == inquiry.id,
                Alert.is_dismissed == False
            ).first()

            if not existing:
                alert = Alert(
                    type="inquiry_sla",
                    entity_type="inquiry",
                    entity_id=inquiry.id,
                    title=f"SLA違反: {inquiry.subject or '問い合わせ'}",
                    description=f"初回対応SLA（{sla_minutes}分）を超過しています",
                    priority="high",
                    assigned_to=inquiry.assigned_to
                )
                db.add(alert)
                generated.append(f"inquiry_sla: {inquiry.subject}")

    db.commit()
    return {"success": True, "generated": generated, "count": len(generated)}


# ========== アラートルールAPI ==========

@router.get("/rules", response_model=List[AlertRuleResponse])
async def get_alert_rules(db: Session = Depends(get_db)):
    """アラートルール一覧取得"""
    rules = db.query(AlertRule).all()
    return [
        AlertRuleResponse(
            id=r.id,
            name=r.name,
            type=r.type,
            condition=r.condition,
            action=r.action,
            is_active=r.is_active,
            created_at=r.created_at.isoformat() if r.created_at else ""
        )
        for r in rules
    ]


@router.post("/rules", response_model=AlertRuleResponse)
async def create_alert_rule(rule: AlertRuleCreate, db: Session = Depends(get_db)):
    """アラートルール作成"""
    db_rule = AlertRule(**rule.model_dump())
    db.add(db_rule)
    db.commit()
    db.refresh(db_rule)

    return AlertRuleResponse(
        id=db_rule.id,
        name=db_rule.name,
        type=db_rule.type,
        condition=db_rule.condition,
        action=db_rule.action,
        is_active=db_rule.is_active,
        created_at=db_rule.created_at.isoformat() if db_rule.created_at else ""
    )


@router.put("/rules/{rule_id}")
async def update_alert_rule(rule_id: int, rule: AlertRuleCreate, db: Session = Depends(get_db)):
    """アラートルール更新"""
    db_rule = db.query(AlertRule).filter(AlertRule.id == rule_id).first()
    if not db_rule:
        raise HTTPException(status_code=404, detail="Rule not found")

    for key, value in rule.model_dump().items():
        setattr(db_rule, key, value)

    db.commit()
    db.refresh(db_rule)
    return {"success": True, "message": "Rule updated"}


@router.delete("/rules/{rule_id}")
async def delete_alert_rule(rule_id: int, db: Session = Depends(get_db)):
    """アラートルール削除"""
    db_rule = db.query(AlertRule).filter(AlertRule.id == rule_id).first()
    if not db_rule:
        raise HTTPException(status_code=404, detail="Rule not found")

    db.delete(db_rule)
    db.commit()
    return {"success": True, "message": "Rule deleted"}

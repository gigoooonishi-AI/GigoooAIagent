"""営業コーチAPI エンドポイント"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime, date
import json
import os
import tempfile

from database import get_db
from models.db_models import MeetingLog, EmployeeSkillAssessment, Employee, Deal
from models.schemas import (
    MeetingLogCreate, MeetingLogResponse,
    SkillAssessmentResponse
)
from services.llm_service import LLMService
from openai import OpenAI
from config import settings

router = APIRouter()
llm_service = LLMService()

# OpenAI クライアント初期化（APIキーがある場合のみ）
openai_client = None
if settings.OPENAI_API_KEY and settings.OPENAI_API_KEY != "your_openai_api_key_here":
    openai_client = OpenAI(api_key=settings.OPENAI_API_KEY)


# ========== 商談ログAPI ==========

@router.get("/meetings", response_model=List[MeetingLogResponse])
async def get_meetings(
    deal_id: Optional[int] = None,
    employee_id: Optional[int] = None,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """商談ログ一覧取得"""
    query = db.query(MeetingLog)

    if deal_id:
        query = query.filter(MeetingLog.deal_id == deal_id)
    if employee_id:
        query = query.filter(MeetingLog.employee_id == employee_id)

    meetings = query.order_by(MeetingLog.created_at.desc()).limit(limit).all()
    return [
        MeetingLogResponse(
            id=m.id,
            deal_id=m.deal_id,
            employee_id=m.employee_id,
            meeting_date=m.meeting_date.isoformat() if m.meeting_date else None,
            duration_minutes=m.duration_minutes,
            attendees=m.attendees,
            transcript=m.transcript,
            summary=m.summary,
            key_points=m.key_points,
            action_items=m.action_items,
            ng_words_detected=m.ng_words_detected,
            created_at=m.created_at.isoformat() if m.created_at else ""
        )
        for m in meetings
    ]


@router.post("/meetings", response_model=MeetingLogResponse)
async def create_meeting(meeting: MeetingLogCreate, db: Session = Depends(get_db)):
    """商談ログ作成"""
    meeting_data = meeting.model_dump()
    if meeting_data.get("meeting_date"):
        meeting_data["meeting_date"] = datetime.fromisoformat(meeting_data["meeting_date"])

    db_meeting = MeetingLog(**meeting_data)
    db.add(db_meeting)
    db.commit()
    db.refresh(db_meeting)

    return MeetingLogResponse(
        id=db_meeting.id,
        deal_id=db_meeting.deal_id,
        employee_id=db_meeting.employee_id,
        meeting_date=db_meeting.meeting_date.isoformat() if db_meeting.meeting_date else None,
        duration_minutes=db_meeting.duration_minutes,
        attendees=db_meeting.attendees,
        transcript=db_meeting.transcript,
        summary=db_meeting.summary,
        key_points=db_meeting.key_points,
        action_items=db_meeting.action_items,
        ng_words_detected=db_meeting.ng_words_detected,
        created_at=db_meeting.created_at.isoformat() if db_meeting.created_at else ""
    )


@router.get("/meetings/{meeting_id}", response_model=MeetingLogResponse)
async def get_meeting(meeting_id: int, db: Session = Depends(get_db)):
    """商談ログ詳細取得"""
    meeting = db.query(MeetingLog).filter(MeetingLog.id == meeting_id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    return MeetingLogResponse(
        id=meeting.id,
        deal_id=meeting.deal_id,
        employee_id=meeting.employee_id,
        meeting_date=meeting.meeting_date.isoformat() if meeting.meeting_date else None,
        duration_minutes=meeting.duration_minutes,
        attendees=meeting.attendees,
        transcript=meeting.transcript,
        summary=meeting.summary,
        key_points=meeting.key_points,
        action_items=meeting.action_items,
        ng_words_detected=meeting.ng_words_detected,
        created_at=meeting.created_at.isoformat() if meeting.created_at else ""
    )


# ========== AI分析API ==========

@router.post("/meetings/{meeting_id}/summarize")
async def summarize_meeting(meeting_id: int, db: Session = Depends(get_db)):
    """商談ログをAIで要約"""
    meeting = db.query(MeetingLog).filter(MeetingLog.id == meeting_id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    if not meeting.transcript:
        raise HTTPException(status_code=400, detail="No transcript to summarize")

    prompt = f"""以下の商談議事録を分析し、要約を作成してください。

【議事録】
{meeting.transcript}

以下の形式でJSON出力してください：
{{
    "summary": "全体要約（3-5文）",
    "key_points": ["重要ポイント1", "重要ポイント2", ...],
    "action_items": ["アクションアイテム1", "アクションアイテム2", ...],
    "next_steps": "次回のステップ"
}}"""

    try:
        response = await llm_service.chat(
            messages=[{"role": "user", "content": prompt}],
            agent_id="coach"
        )

        # レスポンスを解析してDBに保存
        import json
        try:
            result = json.loads(response)
            meeting.summary = result.get("summary", "")
            meeting.key_points = result.get("key_points", [])
            meeting.action_items = result.get("action_items", [])
            db.commit()
        except json.JSONDecodeError:
            meeting.summary = response
            db.commit()

        return {"success": True, "content": response}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.post("/meetings/{meeting_id}/detect-ng-words")
async def detect_ng_words(meeting_id: int, db: Session = Depends(get_db)):
    """NGワード検出"""
    meeting = db.query(MeetingLog).filter(MeetingLog.id == meeting_id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    if not meeting.transcript:
        raise HTTPException(status_code=400, detail="No transcript to analyze")

    prompt = f"""以下の商談会話を分析し、営業トークとして改善が必要な表現を検出してください。

【会話内容】
{meeting.transcript}

以下の観点で分析し、JSON形式で出力してください：
{{
    "ng_words": ["検出されたNGワード・表現のリスト"],
    "improvements": [
        {{"original": "元の表現", "suggestion": "改善案", "reason": "理由"}}
    ],
    "overall_feedback": "全体的なフィードバック"
}}

NGワードの例：
- 「できません」→「〜という方法でしたら可能です」
- 「分かりません」→「確認してご連絡します」
- 否定的な表現、曖昧な表現、専門用語の多用など"""

    try:
        response = await llm_service.chat(
            messages=[{"role": "user", "content": prompt}],
            agent_id="coach"
        )

        # NGワードをDBに保存
        import json
        try:
            result = json.loads(response)
            meeting.ng_words_detected = result.get("ng_words", [])
            db.commit()
        except json.JSONDecodeError:
            pass

        return {"success": True, "content": response}
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.post("/meetings/{meeting_id}/suggest-actions")
async def suggest_next_actions(meeting_id: int, db: Session = Depends(get_db)):
    """次アクション提案"""
    meeting = db.query(MeetingLog).filter(MeetingLog.id == meeting_id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    context = meeting.transcript or meeting.summary or ""
    if not context:
        raise HTTPException(status_code=400, detail="No content to analyze")

    prompt = f"""以下の商談内容を基に、効果的な次のアクションを提案してください。

【商談内容】
{context}

以下の形式でJSON出力してください：
{{
    "immediate_actions": ["今すぐ実行すべきアクション"],
    "follow_up_actions": ["フォローアップアクション"],
    "preparation_for_next": ["次回商談に向けた準備"],
    "recommended_timeline": "推奨タイムライン"
}}"""

    try:
        response = await llm_service.chat(
            messages=[{"role": "user", "content": prompt}],
            agent_id="coach"
        )
        return {"success": True, "content": response}
    except Exception as e:
        return {"success": False, "error": str(e)}


# ========== スキル評価API ==========

@router.get("/employees/{employee_id}/skills")
async def get_employee_skills(employee_id: int, db: Session = Depends(get_db)):
    """社員スキル評価取得"""
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    # 最新のスキル評価を取得
    assessment = db.query(EmployeeSkillAssessment).filter(
        EmployeeSkillAssessment.employee_id == employee_id
    ).order_by(EmployeeSkillAssessment.assessment_date.desc()).first()

    if assessment:
        return SkillAssessmentResponse(
            id=assessment.id,
            employee_id=assessment.employee_id,
            assessment_date=assessment.assessment_date.isoformat() if assessment.assessment_date else "",
            skills=assessment.skills or {}
        )

    # デフォルトスキル
    return {
        "employee_id": employee_id,
        "skills": {
            "ヒアリング力": 50,
            "提案力": 50,
            "クロージング力": 50,
            "商品知識": 50,
            "コミュニケーション": 50,
            "課題発見力": 50
        }
    }


@router.post("/employees/{employee_id}/skills/assess")
async def assess_employee_skills(employee_id: int, db: Session = Depends(get_db)):
    """社員スキル自動評価（商談ログを基に）"""
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    # 最近の商談ログを取得
    meetings = db.query(MeetingLog).filter(
        MeetingLog.employee_id == employee_id
    ).order_by(MeetingLog.created_at.desc()).limit(10).all()

    if not meetings:
        raise HTTPException(status_code=400, detail="No meeting logs to assess")

    # 商談内容を集約
    meeting_contents = "\n\n".join([
        f"【商談{i+1}】\n{m.transcript or m.summary or '内容なし'}"
        for i, m in enumerate(meetings)
    ])

    prompt = f"""以下の商談ログを分析し、営業担当者のスキルを評価してください。

{meeting_contents}

以下のスキルを0-100で評価し、JSON形式で出力してください：
{{
    "skills": {{
        "ヒアリング力": 点数,
        "提案力": 点数,
        "クロージング力": 点数,
        "商品知識": 点数,
        "コミュニケーション": 点数,
        "課題発見力": 点数
    }},
    "strengths": ["強み1", "強み2"],
    "areas_for_improvement": ["改善点1", "改善点2"],
    "recommendations": "総合的なアドバイス"
}}"""

    try:
        response = await llm_service.chat(
            messages=[{"role": "user", "content": prompt}],
            agent_id="coach"
        )

        # スキル評価をDBに保存
        import json
        try:
            result = json.loads(response)
            skills = result.get("skills", {})

            assessment = EmployeeSkillAssessment(
                employee_id=employee_id,
                assessment_date=date.today(),
                skills=skills
            )
            db.add(assessment)
            db.commit()
        except json.JSONDecodeError:
            pass

        return {"success": True, "content": response}
    except Exception as e:
        return {"success": False, "error": str(e)}


# ========== ベストプラクティスAPI ==========

@router.get("/best-practices")
async def get_best_practices():
    """ベストプラクティス一覧"""
    return {
        "categories": [
            {
                "name": "初回商談",
                "tips": [
                    "アイスブレイクで関係構築",
                    "ヒアリングシートの活用",
                    "次回アポイントの確約"
                ]
            },
            {
                "name": "提案時",
                "tips": [
                    "課題と解決策の紐付け",
                    "導入事例の活用",
                    "ROI・効果の数値化"
                ]
            },
            {
                "name": "クロージング",
                "tips": [
                    "決裁者の特定",
                    "導入障壁の先回り対応",
                    "具体的な導入スケジュール提示"
                ]
            }
        ]
    }


@router.get("/best-practices/{topic}")
async def get_best_practice_detail(topic: str):
    """トピック別ベストプラクティス"""
    prompt = f"""営業における「{topic}」についてのベストプラクティスを教えてください。

以下の形式で回答してください：
1. 基本的な考え方
2. 具体的なテクニック（3-5つ）
3. 避けるべきこと
4. 実践例

Markdown形式で出力してください。"""

    try:
        response = await llm_service.chat(
            messages=[{"role": "user", "content": prompt}],
            agent_id="coach"
        )
        return {"success": True, "topic": topic, "content": response}
    except Exception as e:
        return {"success": False, "error": str(e)}


# ========== 音声文字起こしAPI ==========

@router.post("/meetings/transcribe")
async def transcribe_audio(
    audio_file: UploadFile = File(...),
    deal_id: Optional[int] = None,
    employee_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """音声ファイルを文字起こし"""
    allowed_extensions = ['.mp3', '.mp4', '.mpeg', '.mpga', '.m4a', '.wav', '.webm']
    file_ext = os.path.splitext(audio_file.filename)[1].lower()

    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format. Allowed: {', '.join(allowed_extensions)}"
        )

    try:
        # 一時ファイルに保存
        with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as tmp_file:
            content = await audio_file.read()
            tmp_file.write(content)
            tmp_path = tmp_file.name

        # OpenAI Whisper APIで文字起こし
        with open(tmp_path, "rb") as f:
            transcript_response = openai_client.audio.transcriptions.create(
                model="whisper-1",
                file=f,
                language="ja",
                response_format="verbose_json"
            )

        # 一時ファイル削除
        os.unlink(tmp_path)

        transcript_text = transcript_response.text
        duration = getattr(transcript_response, 'duration', None)

        # 商談ログとして保存
        meeting = MeetingLog(
            deal_id=deal_id,
            employee_id=employee_id,
            meeting_date=datetime.now(),
            duration_minutes=int(duration / 60) if duration else None,
            transcript=transcript_text
        )
        db.add(meeting)
        db.commit()
        db.refresh(meeting)

        return {
            "success": True,
            "meeting_id": meeting.id,
            "transcript": transcript_text,
            "duration_seconds": duration
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


# ========== トーク改善アドバイスAPI ==========

@router.post("/meetings/{meeting_id}/improve-talk")
async def improve_talk(meeting_id: int, db: Session = Depends(get_db)):
    """トーク改善アドバイス"""
    meeting = db.query(MeetingLog).filter(MeetingLog.id == meeting_id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    if not meeting.transcript:
        raise HTTPException(status_code=400, detail="No transcript to analyze")

    prompt = f"""以下の商談トークを分析し、具体的な改善アドバイスを提供してください。

【会話内容】
{meeting.transcript}

以下の観点で分析し、JSON形式で出力してください：
{{
    "overall_score": 1-100の評価点数,
    "strengths": ["良かった点1", "良かった点2", ...],
    "improvements": [
        {{
            "category": "カテゴリ（例：ヒアリング、提案、クロージング）",
            "current": "現在の発言・行動",
            "suggested": "改善案",
            "impact": "改善による効果"
        }}
    ],
    "talk_patterns": {{
        "positive": ["効果的なパターン1", ...],
        "negative": ["改善が必要なパターン1", ...]
    }},
    "specific_scripts": [
        {{
            "situation": "シチュエーション",
            "script": "推奨トークスクリプト"
        }}
    ],
    "priority_actions": ["最優先で改善すべきこと1", "最優先で改善すべきこと2"]
}}"""

    try:
        response = await llm_service.chat(
            messages=[{"role": "user", "content": prompt}],
            agent_id="coach"
        )
        return {"success": True, "content": response}
    except Exception as e:
        return {"success": False, "error": str(e)}


# ========== 成功営業との比較API ==========

@router.get("/employees/{employee_id}/compare-top-performers")
async def compare_with_top_performers(employee_id: int, db: Session = Depends(get_db)):
    """トップ営業との比較分析"""
    employee = db.query(Employee).filter(Employee.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")

    # 対象社員の成績を取得
    employee_deals = db.query(Deal).filter(Deal.owner_id == employee_id).all()
    employee_won = sum(1 for d in employee_deals if d.stage == "受注")
    employee_total = len(employee_deals)
    employee_win_rate = (employee_won / employee_total * 100) if employee_total > 0 else 0
    employee_avg_amount = sum(d.amount or 0 for d in employee_deals) / employee_total if employee_total > 0 else 0

    # トップパフォーマーを特定（受注率・金額ベース）
    top_performers = db.query(
        Employee.id,
        Employee.name,
        func.count(Deal.id).label('total_deals'),
        func.sum(func.case((Deal.stage == '受注', 1), else_=0)).label('won_deals'),
        func.avg(Deal.amount).label('avg_amount')
    ).join(Deal, Deal.owner_id == Employee.id)\
    .group_by(Employee.id, Employee.name)\
    .having(func.count(Deal.id) >= 5)\
    .order_by(func.sum(func.case((Deal.stage == '受注', 1), else_=0)).desc())\
    .limit(3).all()

    top_performer_data = []
    for tp in top_performers:
        win_rate = (tp.won_deals / tp.total_deals * 100) if tp.total_deals > 0 else 0
        top_performer_data.append({
            "id": tp.id,
            "name": tp.name,
            "total_deals": tp.total_deals,
            "won_deals": tp.won_deals,
            "win_rate": round(win_rate, 1),
            "avg_amount": float(tp.avg_amount or 0)
        })

    # 対象社員のスキル評価を取得
    employee_assessment = db.query(EmployeeSkillAssessment).filter(
        EmployeeSkillAssessment.employee_id == employee_id
    ).order_by(EmployeeSkillAssessment.assessment_date.desc()).first()

    employee_skills = employee_assessment.skills if employee_assessment else {
        "ヒアリング力": 50, "提案力": 50, "クロージング力": 50,
        "商品知識": 50, "コミュニケーション": 50, "課題発見力": 50
    }

    # トップパフォーマーのスキル平均を算出
    top_skills = {}
    if top_performers:
        for skill_name in employee_skills.keys():
            skill_sum = 0
            count = 0
            for tp in top_performers:
                tp_assessment = db.query(EmployeeSkillAssessment).filter(
                    EmployeeSkillAssessment.employee_id == tp.id
                ).order_by(EmployeeSkillAssessment.assessment_date.desc()).first()
                if tp_assessment and tp_assessment.skills:
                    skill_sum += tp_assessment.skills.get(skill_name, 50)
                    count += 1
            top_skills[skill_name] = skill_sum / count if count > 0 else 75
    else:
        top_skills = {k: 75 for k in employee_skills.keys()}

    # 差分分析
    skill_gaps = {}
    for skill_name, score in employee_skills.items():
        top_score = top_skills.get(skill_name, 75)
        skill_gaps[skill_name] = {
            "your_score": score,
            "top_avg": round(top_score, 1),
            "gap": round(top_score - score, 1)
        }

    # AIによる改善アドバイス生成
    prompt = f"""以下の営業担当者とトップパフォーマーの比較データを分析し、具体的な改善アドバイスを提供してください。

【対象営業】
- 案件数: {employee_total}
- 受注数: {employee_won}
- 受注率: {employee_win_rate:.1f}%
- 平均案件金額: ¥{employee_avg_amount:,.0f}

【トップパフォーマー平均】
- 受注率: {sum(tp['win_rate'] for tp in top_performer_data) / len(top_performer_data) if top_performer_data else 0:.1f}%
- 平均案件金額: ¥{sum(tp['avg_amount'] for tp in top_performer_data) / len(top_performer_data) if top_performer_data else 0:,.0f}

【スキル比較】
{json.dumps(skill_gaps, ensure_ascii=False, indent=2)}

以下の形式でJSON出力してください：
{{
    "overall_assessment": "総合評価コメント",
    "key_differences": ["トップとの主な違い1", "違い2", ...],
    "learning_points": ["トップから学ぶべきこと1", ...],
    "action_plan": [
        {{"priority": 1, "action": "具体的なアクション", "expected_impact": "期待効果"}}
    ],
    "recommended_training": ["推奨トレーニング1", ...]
}}"""

    try:
        ai_response = await llm_service.chat(
            messages=[{"role": "user", "content": prompt}],
            agent_id="coach"
        )
        ai_analysis = json.loads(ai_response) if ai_response else {}
    except Exception:
        ai_analysis = {}

    return {
        "employee": {
            "id": employee_id,
            "name": employee.name,
            "total_deals": employee_total,
            "won_deals": employee_won,
            "win_rate": round(employee_win_rate, 1),
            "avg_amount": employee_avg_amount,
            "skills": employee_skills
        },
        "top_performers": top_performer_data,
        "top_avg_skills": top_skills,
        "skill_gaps": skill_gaps,
        "ai_analysis": ai_analysis
    }


# ========== 総合分析API ==========

@router.post("/meetings/{meeting_id}/full-analysis")
async def full_meeting_analysis(meeting_id: int, db: Session = Depends(get_db)):
    """商談の総合分析（要約・NGワード・次アクション・改善アドバイス）"""
    meeting = db.query(MeetingLog).filter(MeetingLog.id == meeting_id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    if not meeting.transcript:
        raise HTTPException(status_code=400, detail="No transcript to analyze")

    prompt = f"""以下の商談議事録を総合的に分析してください。

【議事録】
{meeting.transcript}

以下の形式でJSON出力してください：
{{
    "summary": {{
        "overview": "全体要約（3-5文）",
        "key_points": ["重要ポイント1", "重要ポイント2", ...],
        "customer_needs": ["顧客ニーズ1", ...],
        "objections": ["顧客の懸念・反論1", ...]
    }},
    "ng_words_analysis": {{
        "detected": ["検出されたNGワード・表現"],
        "improvements": [
            {{"original": "元の表現", "suggestion": "改善案", "reason": "理由"}}
        ]
    }},
    "talk_quality": {{
        "score": 1-100,
        "strengths": ["良かった点1", ...],
        "weaknesses": ["改善点1", ...]
    }},
    "next_actions": {{
        "immediate": ["今すぐ実行すべきこと"],
        "follow_up": ["フォローアップ"],
        "preparation": ["次回準備"]
    }},
    "coaching_tips": {{
        "priority_improvements": ["最優先改善点1", ...],
        "recommended_scripts": [
            {{"situation": "シチュエーション", "script": "推奨スクリプト"}}
        ]
    }}
}}"""

    try:
        response = await llm_service.chat(
            messages=[{"role": "user", "content": prompt}],
            agent_id="coach"
        )

        # 結果をDBに保存
        try:
            result = json.loads(response)
            meeting.summary = result.get("summary", {}).get("overview", "")
            meeting.key_points = result.get("summary", {}).get("key_points", [])
            meeting.action_items = result.get("next_actions", {}).get("immediate", [])
            meeting.ng_words_detected = result.get("ng_words_analysis", {}).get("detected", [])
            db.commit()
        except json.JSONDecodeError:
            pass

        return {"success": True, "content": response}
    except Exception as e:
        return {"success": False, "error": str(e)}


# ========== 社員一覧API ==========

@router.get("/employees")
async def get_employees(db: Session = Depends(get_db)):
    """社員一覧取得"""
    employees = db.query(Employee).all()
    return [
        {
            "id": e.id,
            "name": e.name,
            "email": e.email,
            "department": e.department,
            "role": e.role
        }
        for e in employees
    ]

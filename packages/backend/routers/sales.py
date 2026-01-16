"""営業機能APIルーター"""
from fastapi import APIRouter, HTTPException

from models.schemas import (
    LeadRequest, ProgressRequest, InquiryRequest,
    ProposalRequest, CoachRequest
)
from services.llm_service import llm_service

router = APIRouter()


@router.post("/leads")
async def analyze_leads(request: LeadRequest):
    """見込み客分析"""
    try:
        data = {
            "company_name": request.lead_data.company_name,
            "contact_person": request.lead_data.contact_person,
            "industry": request.lead_data.industry,
            "budget": request.lead_data.budget,
            "timeline": request.lead_data.timeline,
            "needs": request.lead_data.needs,
        }

        result = await llm_service.generate_sales_response("leads", data)

        return {
            "success": True,
            "analysis": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/progress")
async def track_progress(request: ProgressRequest):
    """進捗管理"""
    try:
        data = {
            "deal_name": request.deal_info.deal_name,
            "stage": request.deal_info.stage,
            "value": request.deal_info.value,
            "close_date": request.deal_info.close_date,
            "challenges": request.deal_info.challenges,
        }

        result = await llm_service.generate_sales_response("progress", data)

        return {
            "success": True,
            "analysis": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/inquiry")
async def handle_inquiry(request: InquiryRequest):
    """問い合わせ対応"""
    try:
        data = {
            "inquiry": request.inquiry,
            "context": request.context,
        }

        result = await llm_service.generate_sales_response("inquiry", data)

        return {
            "success": True,
            "response": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/proposal")
async def generate_proposal(request: ProposalRequest):
    """提案資料作成"""
    try:
        data = {
            "client_info": {
                "name": request.client_info.name,
                "needs": request.client_info.needs,
            },
            "product_info": {
                "name": request.product_info.name,
                "features": request.product_info.features,
            },
        }

        result = await llm_service.generate_sales_response("proposal", data)

        return {
            "success": True,
            "proposal": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/coach")
async def sales_coaching(request: CoachRequest):
    """営業コーチ"""
    try:
        data = {
            "situation": request.situation,
            "question": request.question,
        }

        result = await llm_service.generate_sales_response("coach", data)

        return {
            "success": True,
            "advice": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

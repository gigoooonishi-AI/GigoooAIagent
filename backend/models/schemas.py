"""Pydanticスキーマ定義"""
from pydantic import BaseModel
from typing import Optional, List
from enum import Enum


class AgentType(str, Enum):
    """エージェントタイプ"""
    ANALYSIS = "analysis"
    LEADS = "leads"
    PROGRESS = "progress"
    INQUIRY = "inquiry"
    PROPOSAL = "proposal"
    COACH = "coach"


class MessageRole(str, Enum):
    """メッセージロール"""
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


# ========== Chat ==========

class ChatMessage(BaseModel):
    """チャットメッセージ"""
    role: MessageRole
    content: str


class ChatRequest(BaseModel):
    """チャットリクエスト"""
    agent_id: AgentType = AgentType.ANALYSIS
    messages: List[ChatMessage]
    use_rag: bool = True


class ChatResponse(BaseModel):
    """チャットレスポンス"""
    success: bool
    message: str
    sources: Optional[List[str]] = None
    usage: Optional[dict] = None


# ========== Sales - Leads ==========

class LeadData(BaseModel):
    """リード情報"""
    company_name: str = ""
    contact_person: str = ""
    industry: str = ""
    budget: str = ""
    timeline: str = ""
    needs: str = ""


class LeadRequest(BaseModel):
    """リード分析リクエスト"""
    lead_data: LeadData
    action: str = "analyze"


# ========== Sales - Progress ==========

class DealInfo(BaseModel):
    """案件情報"""
    deal_name: str = ""
    stage: str = ""
    value: str = ""
    close_date: str = ""
    challenges: str = ""


class ProgressRequest(BaseModel):
    """進捗分析リクエスト"""
    deal_info: DealInfo


# ========== Sales - Inquiry ==========

class InquiryRequest(BaseModel):
    """問い合わせリクエスト"""
    inquiry: str
    context: str = ""


# ========== Sales - Proposal ==========

class ClientInfo(BaseModel):
    """顧客情報"""
    name: str = ""
    needs: str = ""


class ProductInfo(BaseModel):
    """製品情報"""
    name: str = ""
    features: str = ""


class ProposalRequest(BaseModel):
    """提案書作成リクエスト"""
    client_info: ClientInfo
    product_info: ProductInfo


# ========== Sales - Coach ==========

class CoachRequest(BaseModel):
    """営業コーチリクエスト"""
    situation: str
    question: str = ""


# ========== Documents ==========

class DocumentUploadResponse(BaseModel):
    """ドキュメントアップロードレスポンス"""
    success: bool
    message: str
    document_id: Optional[str] = None
    filename: Optional[str] = None


class DocumentSearchRequest(BaseModel):
    """ドキュメント検索リクエスト"""
    query: str
    collection: str = "knowledge"
    top_k: int = 5


class DocumentSearchResult(BaseModel):
    """検索結果"""
    content: str
    metadata: dict
    score: float


class DocumentSearchResponse(BaseModel):
    """ドキュメント検索レスポンス"""
    success: bool
    results: List[DocumentSearchResult]


# ========== Agent ==========

class AgentInfo(BaseModel):
    """エージェント情報"""
    id: str
    name: str
    description: str


class AgentsResponse(BaseModel):
    """エージェント一覧レスポンス"""
    agents: List[AgentInfo]


# ========== Health ==========

class HealthResponse(BaseModel):
    """ヘルスチェックレスポンス"""
    status: str
    message: str

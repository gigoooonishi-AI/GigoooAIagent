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
    KNOWLEDGE = "knowledge"


class MessageRole(str, Enum):
    """メッセージロール"""
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


# ========== Chat ==========

class ImageContent(BaseModel):
    """画像コンテンツ"""
    type: str = "image_url"
    image_url: dict  # {"url": "data:image/jpeg;base64,..."}


class DocumentFile(BaseModel):
    """ドキュメントファイル"""
    filename: str
    content: str  # Base64エンコードされたファイル内容
    mime_type: Optional[str] = None


class ChatMessage(BaseModel):
    """チャットメッセージ"""
    role: MessageRole
    content: str
    images: Optional[List[str]] = None  # Base64エンコードされた画像のリスト
    documents: Optional[List[DocumentFile]] = None  # 添付ドキュメント


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


# ========== Simple Chat ==========

class SimpleChatRequest(BaseModel):
    """シンプルチャットリクエスト"""
    message: str


class SimpleChatResponse(BaseModel):
    """シンプルチャットレスポンス"""
    success: bool
    input: str
    response: str
    usage: Optional[dict] = None


# ========== Document Parsing ==========

class GoogleSheetRequest(BaseModel):
    """GoogleスプレッドシートURL解析リクエスト"""
    url: str


class DocumentParseResponse(BaseModel):
    """ドキュメント解析レスポンス"""
    success: bool
    filename: Optional[str] = None
    content: str
    file_type: Optional[str] = None


# ========== Dashboard - Lead Management ==========

class LeadStatus(str, Enum):
    """リードステータス"""
    NEW = "new"
    CONTACTING = "contacting"
    PROPOSAL = "proposal"
    NEGOTIATION = "negotiation"
    WON = "won"
    LOST = "lost"


class Temperature(str, Enum):
    """温度感"""
    HOT = "hot"
    WARM = "warm"
    COLD = "cold"


class LeadBase(BaseModel):
    """リード基本情報"""
    company_name: str
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    source: Optional[str] = None
    status: str = "new"
    priority: str = "medium"
    estimated_value: Optional[float] = None
    notes: Optional[str] = None
    next_action: Optional[str] = None
    next_action_date: Optional[str] = None
    industry: Optional[str] = None
    company_size: Optional[str] = None
    score: int = 50
    temperature: str = "warm"
    assigned_to: Optional[int] = None


class LeadCreate(LeadBase):
    """リード作成"""
    pass


class LeadUpdate(BaseModel):
    """リード更新"""
    company_name: Optional[str] = None
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    source: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    estimated_value: Optional[float] = None
    notes: Optional[str] = None
    next_action: Optional[str] = None
    next_action_date: Optional[str] = None
    industry: Optional[str] = None
    company_size: Optional[str] = None
    score: Optional[int] = None
    temperature: Optional[str] = None
    lost_reason: Optional[str] = None
    assigned_to: Optional[int] = None


class LeadResponse(LeadBase):
    """リードレスポンス"""
    id: int
    last_contact_date: Optional[str] = None
    lost_reason: Optional[str] = None
    created_at: str
    updated_at: Optional[str] = None

    class Config:
        from_attributes = True


# ========== Dashboard - Deal/Pipeline Management ==========

class DealStage(str, Enum):
    """案件ステージ"""
    DISCOVERY = "discovery"
    PROPOSAL = "proposal"
    NEGOTIATION = "negotiation"
    CLOSED_WON = "closed_won"
    CLOSED_LOST = "closed_lost"


class DealBase(BaseModel):
    """案件基本情報"""
    title: str
    lead_id: Optional[int] = None
    stage: str = "discovery"
    amount: Optional[float] = None
    probability: int = 0
    expected_close_date: Optional[str] = None
    description: Optional[str] = None
    notes: Optional[str] = None
    assigned_to: Optional[int] = None


class DealCreate(DealBase):
    """案件作成"""
    pass


class DealUpdate(BaseModel):
    """案件更新"""
    title: Optional[str] = None
    stage: Optional[str] = None
    amount: Optional[float] = None
    probability: Optional[int] = None
    expected_close_date: Optional[str] = None
    actual_close_date: Optional[str] = None
    description: Optional[str] = None
    notes: Optional[str] = None
    assigned_to: Optional[int] = None


class DealResponse(DealBase):
    """案件レスポンス"""
    id: int
    actual_close_date: Optional[str] = None
    last_stage_change: Optional[str] = None
    created_at: str
    updated_at: Optional[str] = None
    weighted_value: Optional[float] = None  # 計算値: amount * probability / 100

    class Config:
        from_attributes = True


class PipelineSummary(BaseModel):
    """パイプラインサマリー"""
    stage: str
    count: int
    total_amount: float
    weighted_amount: float


class ForecastData(BaseModel):
    """売上予測データ"""
    period: str
    expected_amount: float
    weighted_amount: float
    deal_count: int


# ========== Dashboard - Inquiry Management ==========

class InquiryChannel(str, Enum):
    """問い合わせチャネル"""
    WEB = "web"
    EMAIL = "email"
    PHONE = "phone"


class InquiryBase(BaseModel):
    """問い合わせ基本情報"""
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    subject: Optional[str] = None
    content: str
    category: str = "general"
    status: str = "open"
    priority: str = "medium"
    channel: str = "web"
    assigned_to: Optional[int] = None
    sla_target_minutes: int = 60


class InquiryCreate(InquiryBase):
    """問い合わせ作成"""
    pass


class InquiryUpdate(BaseModel):
    """問い合わせ更新"""
    status: Optional[str] = None
    priority: Optional[str] = None
    category: Optional[str] = None
    assigned_to: Optional[int] = None
    response: Optional[str] = None


class InquiryResponseSchema(BaseModel):
    """問い合わせ対応"""
    content: str
    responded_by: Optional[int] = None


class InquiryDetailResponse(InquiryBase):
    """問い合わせ詳細レスポンス"""
    id: int
    response: Optional[str] = None
    responded_by: Optional[int] = None
    responded_at: Optional[str] = None
    first_response_at: Optional[str] = None
    urgency_score: int = 50
    auto_classification: Optional[str] = None
    suggested_response: Optional[str] = None
    sla_breached: bool = False
    created_at: str
    updated_at: Optional[str] = None

    class Config:
        from_attributes = True


# ========== Dashboard - Proposal Management ==========

class ProposalTemplateBase(BaseModel):
    """提案書テンプレート基本情報"""
    name: str
    industry: Optional[str] = None
    issue_type: Optional[str] = None
    structure: Optional[dict] = None


class ProposalTemplateCreate(ProposalTemplateBase):
    """提案書テンプレート作成"""
    pass


class ProposalTemplateResponse(ProposalTemplateBase):
    """提案書テンプレートレスポンス"""
    id: int
    is_active: bool = True
    created_at: str

    class Config:
        from_attributes = True


class QuoteItem(BaseModel):
    """見積明細"""
    name: str
    description: Optional[str] = None
    unit_price: float
    quantity: int
    amount: float


class QuoteBase(BaseModel):
    """見積基本情報"""
    items: List[QuoteItem] = []
    subtotal: float = 0
    discount_rate: float = 0
    tax_rate: float = 10
    total: float = 0
    valid_until: Optional[str] = None


class ProposalBase(BaseModel):
    """提案書基本情報"""
    title: str
    lead_id: Optional[int] = None
    deal_id: Optional[int] = None
    template_id: Optional[int] = None
    content: Optional[dict] = None
    status: str = "draft"


class ProposalCreate(ProposalBase):
    """提案書作成"""
    created_by: Optional[int] = None


class ProposalResponse(ProposalBase):
    """提案書レスポンス"""
    id: int
    version: int = 1
    created_by: Optional[int] = None
    created_at: str
    updated_at: Optional[str] = None
    quote: Optional[QuoteBase] = None

    class Config:
        from_attributes = True


class AIProposalRequest(BaseModel):
    """AI提案書生成リクエスト"""
    client_name: str
    client_industry: Optional[str] = None
    client_needs: str
    product_name: str
    product_features: str
    hearing_notes: Optional[str] = None


# ========== Dashboard - Coach ==========

class MeetingLogBase(BaseModel):
    """商談ログ基本情報"""
    deal_id: Optional[int] = None
    employee_id: Optional[int] = None
    meeting_date: Optional[str] = None
    duration_minutes: Optional[int] = None
    attendees: Optional[List[str]] = None
    transcript: Optional[str] = None


class MeetingLogCreate(MeetingLogBase):
    """商談ログ作成"""
    pass


class MeetingLogResponse(MeetingLogBase):
    """商談ログレスポンス"""
    id: int
    summary: Optional[str] = None
    key_points: Optional[List[str]] = None
    action_items: Optional[List[str]] = None
    ng_words_detected: Optional[List[str]] = None
    created_at: str

    class Config:
        from_attributes = True


class SkillAssessment(BaseModel):
    """スキル評価"""
    skill_name: str
    score: int  # 0-100


class SkillAssessmentResponse(BaseModel):
    """スキル評価レスポンス"""
    id: int
    employee_id: int
    assessment_date: str
    skills: dict  # {"ヒアリング": 80, "提案力": 75, ...}

    class Config:
        from_attributes = True


# ========== Dashboard - Alerts ==========

class AlertType(str, Enum):
    """アラートタイプ"""
    FOLLOW_UP = "follow_up"
    STALLED_DEAL = "stalled_deal"
    INQUIRY_SLA = "inquiry_sla"
    GOAL_GAP = "goal_gap"


class AlertBase(BaseModel):
    """アラート基本情報"""
    type: str
    entity_type: Optional[str] = None
    entity_id: Optional[int] = None
    title: str
    description: Optional[str] = None
    priority: str = "medium"
    due_date: Optional[str] = None
    assigned_to: Optional[int] = None


class AlertCreate(AlertBase):
    """アラート作成"""
    pass


class AlertResponse(AlertBase):
    """アラートレスポンス"""
    id: int
    is_read: bool = False
    is_dismissed: bool = False
    triggered_at: str

    class Config:
        from_attributes = True


class AlertRuleBase(BaseModel):
    """アラートルール基本情報"""
    name: str
    type: str
    condition: dict
    action: dict
    is_active: bool = True


class AlertRuleCreate(AlertRuleBase):
    """アラートルール作成"""
    pass


class AlertRuleResponse(AlertRuleBase):
    """アラートルールレスポンス"""
    id: int
    created_at: str

    class Config:
        from_attributes = True


# ========== Dashboard Stats ==========

class DashboardStats(BaseModel):
    """ダッシュボード統計"""
    total_leads: int = 0
    active_leads: int = 0
    total_deals: int = 0
    pipeline_value: float = 0
    weighted_pipeline: float = 0
    open_inquiries: int = 0
    sla_breached_inquiries: int = 0
    unread_alerts: int = 0


# ========== Competitor Management ==========

class CompetitorBase(BaseModel):
    """競合基本情報"""
    name: str
    description: Optional[str] = None
    website: Optional[str] = None
    strengths: Optional[List[str]] = None
    weaknesses: Optional[List[str]] = None
    pricing_info: Optional[str] = None
    target_market: Optional[str] = None
    features: Optional[dict] = None
    differentiators: Optional[List[str]] = None


class CompetitorCreate(CompetitorBase):
    """競合作成"""
    pass


class CompetitorResponse(CompetitorBase):
    """競合レスポンス"""
    id: int
    is_active: bool = True
    created_at: str
    updated_at: Optional[str] = None

    class Config:
        from_attributes = True


class CompetitorComparisonRequest(BaseModel):
    """競合比較リクエスト"""
    competitor_ids: List[int]
    product_name: str
    product_features: str
    client_industry: Optional[str] = None
    client_needs: Optional[str] = None


class CompetitorComparisonResponse(BaseModel):
    """競合比較レスポンス"""
    success: bool
    comparison_table: Optional[str] = None  # Markdown形式の比較表
    our_advantages: Optional[List[str]] = None
    talking_points: Optional[List[str]] = None
    handling_objections: Optional[dict] = None  # {"競合の強み": "対応策"}


# ========== Won Proposal / Recommendation ==========

class WonProposalBase(BaseModel):
    """受注提案書基本情報"""
    proposal_id: Optional[int] = None
    deal_id: Optional[int] = None
    industry: Optional[str] = None
    company_size: Optional[str] = None
    deal_value: Optional[float] = None
    pain_points: Optional[List[str]] = None
    solution_structure: Optional[dict] = None
    key_success_factors: Optional[List[str]] = None
    competitor_defeated: Optional[List[str]] = None
    proposal_sections: Optional[List[dict]] = None
    quote_items: Optional[List[dict]] = None
    close_date: Optional[str] = None


class WonProposalCreate(WonProposalBase):
    """受注提案書作成"""
    pass


class WonProposalResponse(WonProposalBase):
    """受注提案書レスポンス"""
    id: int
    created_at: str

    class Config:
        from_attributes = True


class RecommendationRequest(BaseModel):
    """構成推薦リクエスト"""
    client_industry: str
    client_company_size: Optional[str] = None
    client_needs: str
    pain_points: Optional[List[str]] = None
    budget_range: Optional[str] = None
    competitors: Optional[List[str]] = None


class RecommendationResponse(BaseModel):
    """構成推薦レスポンス"""
    success: bool
    similar_cases: Optional[List[dict]] = None  # 類似受注案件
    recommended_structure: Optional[dict] = None  # 推薦提案構成
    recommended_quote: Optional[List[dict]] = None  # 推薦見積明細
    success_factors: Optional[List[str]] = None  # 成功要因
    tips: Optional[str] = None  # アドバイス


# ========== Auto Quote Generation ==========

class AutoQuoteRequest(BaseModel):
    """自動見積生成リクエスト"""
    client_name: str
    client_industry: Optional[str] = None
    client_needs: str
    product_name: str
    hearing_notes: Optional[str] = None
    budget_hint: Optional[str] = None


class AutoQuoteResponse(BaseModel):
    """自動見積レスポンス"""
    success: bool
    quote_items: Optional[List[QuoteItem]] = None
    subtotal: Optional[float] = None
    discount_suggestion: Optional[float] = None
    total: Optional[float] = None
    rationale: Optional[str] = None  # 見積根拠


# ========== Knowledge Base (会社ナレッジベース) ==========

class MemoType(str, Enum):
    """メモタイプ"""
    MEETING_NOTE = "meeting_note"
    COMPANY_INFO = "company_info"
    GENERAL = "general"


class ActionItemSchema(BaseModel):
    """アクションアイテム"""
    owner: Optional[str] = None
    task: str
    deadline: Optional[str] = None


class NextActionSchema(BaseModel):
    """次回アクション"""
    action: str
    date: Optional[str] = None


class AIExtractionResult(BaseModel):
    """AI抽出結果"""
    summary: str
    decisions: List[str] = []
    action_items: List[ActionItemSchema] = []
    next_actions: List[NextActionSchema] = []
    meeting_date: Optional[str] = None
    related_projects: List[str] = []


class CompanyMemoCreate(BaseModel):
    """メモ作成リクエスト"""
    company_name: str
    original_text: str
    memo_type: str = "meeting_note"
    registered_user_name: str
    lead_id: Optional[int] = None


class CompanyMemoUpdate(BaseModel):
    """メモ更新リクエスト"""
    company_name: Optional[str] = None
    original_text: Optional[str] = None
    summary: Optional[str] = None
    decisions: Optional[List[str]] = None
    action_items: Optional[List[dict]] = None
    next_actions: Optional[List[dict]] = None
    meeting_date: Optional[str] = None
    related_projects: Optional[List[str]] = None
    memo_type: Optional[str] = None


class CompanyMemoResponse(BaseModel):
    """メモレスポンス"""
    id: int
    company_name: str
    original_text: str
    summary: Optional[str] = None
    decisions: Optional[List[str]] = None
    action_items: Optional[List[dict]] = None
    next_actions: Optional[List[dict]] = None
    meeting_date: Optional[str] = None
    related_projects: Optional[List[str]] = None
    memo_type: str
    registered_user_name: Optional[str] = None
    lead_id: Optional[int] = None
    created_at: str
    updated_at: Optional[str] = None

    class Config:
        from_attributes = True


class MemoSearchRequest(BaseModel):
    """メモ検索リクエスト"""
    query: Optional[str] = None
    company_name: Optional[str] = None
    memo_type: Optional[str] = None
    date_from: Optional[str] = None
    date_to: Optional[str] = None
    limit: int = 50


class KnowledgeChatRequest(BaseModel):
    """ナレッジベースチャットリクエスト"""
    message: str
    user_name: str
    action: str = "auto"  # auto, save, search


class KnowledgeChatResponse(BaseModel):
    """ナレッジベースチャットレスポンス"""
    success: bool
    message: str
    action_performed: str  # saved, searched, answered
    extraction: Optional[AIExtractionResult] = None
    memos: Optional[List[CompanyMemoResponse]] = None


class SimpleUserCreate(BaseModel):
    """シンプルユーザー作成"""
    name: str
    department: Optional[str] = None


class SimpleUserResponse(BaseModel):
    """シンプルユーザーレスポンス"""
    id: int
    name: str
    department: Optional[str] = None
    is_active: bool = True
    created_at: str

    class Config:
        from_attributes = True


class CompanyListItem(BaseModel):
    """会社一覧アイテム"""
    company_name: str
    source: str  # lead, memo
    lead_id: Optional[int] = None
    memo_count: int = 0

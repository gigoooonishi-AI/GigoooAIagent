"""データベースモデル定義"""
from sqlalchemy import Column, Integer, String, Text, DateTime, Float, ForeignKey, Boolean, JSON, Date, Numeric
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class Employee(Base):
    """社員（スキルシート用）"""
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True)
    department = Column(String(100))
    position = Column(String(100))
    skills = Column(JSON)  # スキル一覧 {"Python": 5, "React": 3, ...}
    experience_years = Column(Integer)
    projects = Column(JSON)  # プロジェクト履歴
    certifications = Column(JSON)  # 資格一覧
    bio = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class Lead(Base):
    """見込み客"""
    __tablename__ = "leads"

    id = Column(Integer, primary_key=True, index=True)
    company_name = Column(String(200), nullable=False)
    contact_name = Column(String(100))
    contact_email = Column(String(255))
    contact_phone = Column(String(50))
    source = Column(String(100))  # リード獲得元
    status = Column(String(50), default="new")  # new, contacting, proposal, negotiation, won, lost
    priority = Column(String(20), default="medium")  # high, medium, low
    estimated_value = Column(Float)
    notes = Column(Text)
    next_action = Column(String(500))
    next_action_date = Column(DateTime(timezone=True))
    assigned_to = Column(Integer, ForeignKey("employees.id"))
    # 新規追加フィールド
    industry = Column(String(100))  # 業界
    company_size = Column(String(50))  # small, medium, large, enterprise
    score = Column(Integer, default=50)  # スコア 0-100
    temperature = Column(String(20), default="warm")  # hot, warm, cold
    last_contact_date = Column(DateTime(timezone=True))  # 最終接触日
    lost_reason = Column(Text)  # 失注理由
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # リレーション
    assignee = relationship("Employee", backref="leads")
    deals = relationship("Deal", back_populates="lead")


class Deal(Base):
    """商談・案件"""
    __tablename__ = "deals"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(300), nullable=False)
    lead_id = Column(Integer, ForeignKey("leads.id"))
    stage = Column(String(50), default="discovery")  # discovery, proposal, negotiation, closed_won, closed_lost
    amount = Column(Float)
    probability = Column(Integer, default=0)  # 成約確率 0-100
    expected_close_date = Column(DateTime(timezone=True))
    actual_close_date = Column(DateTime(timezone=True))
    description = Column(Text)
    notes = Column(Text)
    assigned_to = Column(Integer, ForeignKey("employees.id"))
    # 新規追加フィールド
    last_stage_change = Column(DateTime(timezone=True))  # 最終ステージ変更日
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # リレーション
    lead = relationship("Lead", back_populates="deals")
    assignee = relationship("Employee", backref="deals")
    activities = relationship("Activity", back_populates="deal")


class Activity(Base):
    """営業活動履歴"""
    __tablename__ = "activities"

    id = Column(Integer, primary_key=True, index=True)
    deal_id = Column(Integer, ForeignKey("deals.id"))
    lead_id = Column(Integer, ForeignKey("leads.id"))  # 見込み客用
    type = Column(String(50))  # call, email, meeting, demo, proposal
    subject = Column(String(300))
    description = Column(Text)
    outcome = Column(String(100))
    next_step = Column(String(500))
    activity_date = Column(DateTime(timezone=True))
    created_by = Column(Integer, ForeignKey("employees.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # リレーション
    deal = relationship("Deal", back_populates="activities")
    lead = relationship("Lead", backref="activities")
    creator = relationship("Employee", backref="activities")


class Inquiry(Base):
    """顧客問い合わせ"""
    __tablename__ = "inquiries"

    id = Column(Integer, primary_key=True, index=True)
    customer_name = Column(String(100))
    customer_email = Column(String(255))
    subject = Column(String(300))
    content = Column(Text, nullable=False)
    category = Column(String(100))  # general, support, sales, billing
    status = Column(String(50), default="open")  # open, in_progress, resolved, closed
    priority = Column(String(20), default="medium")
    response = Column(Text)
    responded_by = Column(Integer, ForeignKey("employees.id"))
    responded_at = Column(DateTime(timezone=True))
    # 新規追加フィールド
    channel = Column(String(20), default="web")  # web, email, phone
    assigned_to = Column(Integer, ForeignKey("employees.id"))
    first_response_at = Column(DateTime(timezone=True))  # 初回対応日時
    sla_target_minutes = Column(Integer, default=60)  # SLA目標（分）
    urgency_score = Column(Integer, default=50)  # 緊急度 0-100
    auto_classification = Column(String(100))  # AI自動分類結果
    suggested_response = Column(Text)  # AI提案回答
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # リレーション
    responder = relationship("Employee", foreign_keys=[responded_by], backref="responded_inquiries")
    assignee = relationship("Employee", foreign_keys=[assigned_to], backref="assigned_inquiries")
    responses = relationship("InquiryResponse", back_populates="inquiry", cascade="all, delete-orphan")


class Conversation(Base):
    """チャット会話"""
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(100), index=True)  # フロントエンドのセッションID
    agent_id = Column(String(50), nullable=False)  # analysis, leads, progress, etc.
    title = Column(String(300))
    project_name = Column(String(200))  # プロジェクト名
    user_id = Column(Integer, ForeignKey("employees.id"))  # ユーザー（オプション）
    is_archived = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # リレーション
    messages = relationship("ChatMessage", back_populates="conversation", cascade="all, delete-orphan")
    user = relationship("Employee", backref="conversations")


class ChatMessage(Base):
    """チャットメッセージ"""
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=False)
    role = Column(String(20), nullable=False)  # user, assistant, system
    content = Column(Text, nullable=False)
    token_count = Column(Integer)  # トークン数（オプション）
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # リレーション
    conversation = relationship("Conversation", back_populates="messages")
    attachments = relationship("MessageAttachment", back_populates="message", cascade="all, delete-orphan")


class MessageAttachment(Base):
    """メッセージ添付ファイル（画像・ドキュメント）"""
    __tablename__ = "message_attachments"

    id = Column(Integer, primary_key=True, index=True)
    message_id = Column(Integer, ForeignKey("chat_messages.id"), nullable=False)
    file_type = Column(String(50))  # image, document, excel, word, csv
    file_name = Column(String(500))
    file_size = Column(Integer)  # bytes
    mime_type = Column(String(100))
    content_data = Column(Text)  # Base64エンコードされたデータ or 解析されたテキスト
    thumbnail_data = Column(Text)  # 画像のサムネイル（Base64）
    extra_data = Column(JSON)  # 追加メタデータ
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # リレーション
    message = relationship("ChatMessage", back_populates="attachments")


# ========== 新規追加テーブル ==========

class InquiryResponse(Base):
    """問い合わせ対応履歴"""
    __tablename__ = "inquiry_responses"

    id = Column(Integer, primary_key=True, index=True)
    inquiry_id = Column(Integer, ForeignKey("inquiries.id"), nullable=False)
    content = Column(Text, nullable=False)
    responded_by = Column(Integer, ForeignKey("employees.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # リレーション
    inquiry = relationship("Inquiry", back_populates="responses")
    responder = relationship("Employee", backref="inquiry_responses")


class ProposalTemplate(Base):
    """提案書テンプレート"""
    __tablename__ = "proposal_templates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    industry = Column(String(100))  # 業界
    issue_type = Column(String(100))  # 課題タイプ
    structure = Column(JSON)  # テンプレート構造
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class Proposal(Base):
    """提案書"""
    __tablename__ = "proposals"

    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id"))
    deal_id = Column(Integer, ForeignKey("deals.id"))
    template_id = Column(Integer, ForeignKey("proposal_templates.id"))
    title = Column(String(300), nullable=False)
    content = Column(JSON)  # 提案書内容
    status = Column(String(50), default="draft")  # draft, sent, accepted, rejected
    version = Column(Integer, default=1)
    created_by = Column(Integer, ForeignKey("employees.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # リレーション
    lead = relationship("Lead", backref="proposals")
    deal = relationship("Deal", backref="proposals")
    template = relationship("ProposalTemplate", backref="proposals")
    creator = relationship("Employee", backref="created_proposals")
    quote = relationship("Quote", back_populates="proposal", uselist=False)


class Quote(Base):
    """見積"""
    __tablename__ = "quotes"

    id = Column(Integer, primary_key=True, index=True)
    proposal_id = Column(Integer, ForeignKey("proposals.id"), nullable=False)
    items = Column(JSON)  # 見積明細
    subtotal = Column(Numeric(15, 2))
    discount_rate = Column(Numeric(5, 2), default=0)
    tax_rate = Column(Numeric(5, 2), default=10)
    total = Column(Numeric(15, 2))
    valid_until = Column(Date)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # リレーション
    proposal = relationship("Proposal", back_populates="quote")


class MeetingLog(Base):
    """商談ログ"""
    __tablename__ = "meeting_logs"

    id = Column(Integer, primary_key=True, index=True)
    deal_id = Column(Integer, ForeignKey("deals.id"))
    employee_id = Column(Integer, ForeignKey("employees.id"))
    meeting_date = Column(DateTime(timezone=True))
    duration_minutes = Column(Integer)
    attendees = Column(JSON)  # 参加者リスト
    transcript = Column(Text)  # 議事録
    summary = Column(Text)  # AI要約
    key_points = Column(JSON)  # 重要ポイント
    action_items = Column(JSON)  # アクションアイテム
    ng_words_detected = Column(JSON)  # 検出されたNGワード
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # リレーション
    deal = relationship("Deal", backref="meeting_logs")
    employee = relationship("Employee", backref="meeting_logs")


class EmployeeSkillAssessment(Base):
    """社員スキル評価"""
    __tablename__ = "employee_skill_assessments"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"), nullable=False)
    assessment_date = Column(Date)
    skills = Column(JSON)  # {"ヒアリング": 80, "提案力": 75, ...}
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # リレーション
    employee = relationship("Employee", backref="skill_assessments")


class Alert(Base):
    """アラート"""
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    type = Column(String(50), nullable=False)  # follow_up, stalled_deal, inquiry_sla, goal_gap
    entity_type = Column(String(50))  # lead, deal, inquiry
    entity_id = Column(Integer)
    title = Column(String(300), nullable=False)
    description = Column(Text)
    priority = Column(String(20), default="medium")
    is_read = Column(Boolean, default=False)
    is_dismissed = Column(Boolean, default=False)
    triggered_at = Column(DateTime(timezone=True), server_default=func.now())
    due_date = Column(DateTime(timezone=True))
    assigned_to = Column(Integer, ForeignKey("employees.id"))

    # リレーション
    assignee = relationship("Employee", backref="alerts")


class AlertRule(Base):
    """アラートルール"""
    __tablename__ = "alert_rules"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    type = Column(String(50), nullable=False)
    condition = Column(JSON)  # {"field": "days_since_contact", "operator": ">", "value": 14}
    action = Column(JSON)  # {"type": "notification", "recipients": [1, 2]}
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Competitor(Base):
    """競合情報"""
    __tablename__ = "competitors"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text)
    website = Column(String(500))
    strengths = Column(JSON)  # ["強み1", "強み2", ...]
    weaknesses = Column(JSON)  # ["弱み1", "弱み2", ...]
    pricing_info = Column(Text)  # 価格情報
    target_market = Column(String(200))  # ターゲット市場
    features = Column(JSON)  # {"機能名": "説明", ...}
    differentiators = Column(JSON)  # 自社との差別化ポイント
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class WonProposal(Base):
    """受注提案書（過去の成功事例）"""
    __tablename__ = "won_proposals"

    id = Column(Integer, primary_key=True, index=True)
    proposal_id = Column(Integer, ForeignKey("proposals.id"))
    deal_id = Column(Integer, ForeignKey("deals.id"))
    industry = Column(String(100))  # 業界
    company_size = Column(String(50))  # 企業規模
    deal_value = Column(Float)  # 受注金額
    pain_points = Column(JSON)  # 顧客課題 ["課題1", "課題2", ...]
    solution_structure = Column(JSON)  # ソリューション構成
    key_success_factors = Column(JSON)  # 受注の決め手 ["要因1", "要因2", ...]
    competitor_defeated = Column(JSON)  # 競合情報 ["競合A", "競合B", ...]
    proposal_sections = Column(JSON)  # 提案書構成
    quote_items = Column(JSON)  # 見積明細
    close_date = Column(Date)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # リレーション
    proposal = relationship("Proposal", backref="won_record")
    deal = relationship("Deal", backref="won_record")


# ========== 会社ナレッジベース ==========

class SimpleUser(Base):
    """シンプルユーザー（認証なし、ドロップダウン選択用）"""
    __tablename__ = "simple_users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)
    department = Column(String(100))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class ImportedSpreadsheet(Base):
    """インポート済みスプレッドシート"""
    __tablename__ = "imported_spreadsheets"

    id = Column(Integer, primary_key=True, index=True)
    spreadsheet_url = Column(String(500), nullable=False)  # 完全なURL
    spreadsheet_id = Column(String(100), nullable=False, index=True)  # スプレッドシートID
    sheet_name = Column(String(200))  # シート名
    columns = Column(JSON)  # カラム一覧
    data = Column(JSON)  # データ（JSON形式）
    total_rows = Column(Integer, default=0)  # 行数
    auto_refresh = Column(Boolean, default=True)  # 自動更新有効
    refresh_interval_minutes = Column(Integer, default=30)  # 更新間隔（分）
    last_synced_at = Column(DateTime(timezone=True))  # 最終同期日時
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class CompanyMemo(Base):
    """会社メモ・議事録"""
    __tablename__ = "company_memos"

    id = Column(Integer, primary_key=True, index=True)

    # 会社情報（Leadとの連携）
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=True)
    company_name = Column(String(200), nullable=False, index=True)

    # 原文
    original_text = Column(Text, nullable=False)

    # AI抽出フィールド
    summary = Column(Text)  # 要約
    decisions = Column(JSON)  # 決定事項 ["item1", "item2", ...]
    action_items = Column(JSON)  # 宿題 [{"owner": "name", "task": "content", "deadline": "date"}, ...]
    next_actions = Column(JSON)  # 次回アクション [{"action": "content", "date": "YYYY-MM-DD"}, ...]
    meeting_date = Column(Date)  # 日付
    related_projects = Column(JSON)  # 関連案件 ["project1", "project2", ...]

    # メタデータ
    memo_type = Column(String(50), default="meeting_note")  # meeting_note, company_info, general
    registered_user_name = Column(String(100))  # 登録ユーザー名

    # タイムスタンプ
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # リレーション
    lead = relationship("Lead", backref="memos")



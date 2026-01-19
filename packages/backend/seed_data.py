"""テストデータ投入スクリプト"""
import sys
from datetime import datetime, timedelta
from database import SessionLocal, engine, Base
from models.db_models import (
    Employee, Lead, Deal, Activity, Inquiry, InquiryResponse,
    ProposalTemplate, Proposal, Quote, MeetingLog, EmployeeSkillAssessment,
    Alert, AlertRule, Competitor, WonProposal, SimpleUser, CompanyMemo
)

# テーブル作成
Base.metadata.create_all(bind=engine)

def seed_data():
    db = SessionLocal()

    try:
        # 既存データ削除（順序重要）
        db.query(CompanyMemo).delete()
        db.query(WonProposal).delete()
        db.query(Quote).delete()
        db.query(Proposal).delete()
        db.query(ProposalTemplate).delete()
        db.query(Alert).delete()
        db.query(AlertRule).delete()
        db.query(Competitor).delete()
        db.query(MeetingLog).delete()
        db.query(EmployeeSkillAssessment).delete()
        db.query(InquiryResponse).delete()
        db.query(Inquiry).delete()
        db.query(Activity).delete()
        db.query(Deal).delete()
        db.query(Lead).delete()
        db.query(SimpleUser).delete()
        db.query(Employee).delete()
        db.commit()

        print("Existing data cleared.")

        # ========== 1. 社員データ ==========
        employees = [
            Employee(
                id=1, name="田中太郎", email="tanaka@example.com",
                department="営業部", position="営業マネージャー",
                skills={"Python": 3, "営業": 5, "プレゼン": 4, "交渉": 5},
                experience_years=10, is_active=True
            ),
            Employee(
                id=2, name="山田花子", email="yamada@example.com",
                department="営業部", position="シニア営業",
                skills={"Excel": 4, "営業": 4, "ヒアリング": 5, "資料作成": 4},
                experience_years=7, is_active=True
            ),
            Employee(
                id=3, name="佐藤次郎", email="sato@example.com",
                department="営業部", position="営業",
                skills={"営業": 3, "電話対応": 4, "CRM": 3},
                experience_years=3, is_active=True
            ),
            Employee(
                id=4, name="鈴木美咲", email="suzuki@example.com",
                department="カスタマーサポート", position="サポートリーダー",
                skills={"サポート": 5, "問題解決": 4, "コミュニケーション": 5},
                experience_years=5, is_active=True
            ),
            Employee(
                id=5, name="高橋健一", email="takahashi@example.com",
                department="営業部", position="ジュニア営業",
                skills={"営業": 2, "電話対応": 3, "学習意欲": 5},
                experience_years=1, is_active=True
            ),
        ]
        db.add_all(employees)
        db.commit()
        print("Employees created: 5")

        # ========== 2. シンプルユーザー ==========
        simple_users = [
            SimpleUser(id=1, name="田中太郎", department="営業部"),
            SimpleUser(id=2, name="山田花子", department="営業部"),
            SimpleUser(id=3, name="佐藤次郎", department="営業部"),
        ]
        db.add_all(simple_users)
        db.commit()
        print("Simple users created: 3")

        # ========== 3. リード（見込み客）データ ==========
        now = datetime.now()
        leads = [
            Lead(
                id=1, company_name="株式会社ABC", contact_name="加藤一郎",
                contact_email="kato@abc.co.jp", contact_phone="03-1234-5678",
                source="Web問い合わせ", status="negotiating", priority="high",
                estimated_value=5000000, industry="製造業", company_size="medium",
                score=85, temperature="hot",
                next_action="デモ日程調整", next_action_date=now - timedelta(days=1),
                last_contact_date=now - timedelta(days=2), assigned_to=1
            ),
            Lead(
                id=2, company_name="株式会社XYZ", contact_name="伊藤美穂",
                contact_email="ito@xyz.co.jp", contact_phone="03-2345-6789",
                source="展示会", status="contacting", priority="medium",
                estimated_value=3000000, industry="IT", company_size="small",
                score=65, temperature="warm",
                next_action="資料送付", next_action_date=now + timedelta(days=3),
                last_contact_date=now - timedelta(days=5), assigned_to=2
            ),
            Lead(
                id=3, company_name="DEF工業株式会社", contact_name="渡辺健太",
                contact_email="watanabe@def.co.jp", contact_phone="06-3456-7890",
                source="紹介", status="proposal", priority="high",
                estimated_value=8000000, industry="製造業", company_size="large",
                score=78, temperature="hot",
                next_action="提案書送付", next_action_date=now + timedelta(days=1),
                last_contact_date=now - timedelta(days=1), assigned_to=1
            ),
            Lead(
                id=4, company_name="GHI商事", contact_name="中村直樹",
                contact_email="nakamura@ghi.co.jp", contact_phone="052-4567-8901",
                source="Web問い合わせ", status="new", priority="low",
                estimated_value=1500000, industry="商社", company_size="small",
                score=40, temperature="cold",
                next_action="初回連絡", next_action_date=now + timedelta(days=7),
                last_contact_date=None, assigned_to=3
            ),
            Lead(
                id=5, company_name="JKLシステムズ", contact_name="小林麻衣",
                contact_email="kobayashi@jkl.co.jp", contact_phone="03-5678-9012",
                source="セミナー", status="negotiating", priority="high",
                estimated_value=6000000, industry="IT", company_size="medium",
                score=72, temperature="warm",
                next_action="見積提出", next_action_date=now + timedelta(days=2),
                last_contact_date=now - timedelta(days=3), assigned_to=2
            ),
            Lead(
                id=6, company_name="MNO金融", contact_name="松本裕子",
                contact_email="matsumoto@mno.co.jp", contact_phone="03-6789-0123",
                source="紹介", status="contacting", priority="medium",
                estimated_value=4000000, industry="金融", company_size="large",
                score=55, temperature="warm",
                next_action="ヒアリング設定", next_action_date=now + timedelta(days=5),
                last_contact_date=now - timedelta(days=7), assigned_to=1
            ),
            Lead(
                id=7, company_name="PQR物流", contact_name="井上達也",
                contact_email="inoue@pqr.co.jp", contact_phone="045-7890-1234",
                source="テレアポ", status="won", priority="high",
                estimated_value=3500000, industry="物流", company_size="medium",
                score=95, temperature="hot",
                next_action=None, next_action_date=None,
                last_contact_date=now - timedelta(days=10), assigned_to=2
            ),
            Lead(
                id=8, company_name="STU建設", contact_name="木村雄太",
                contact_email="kimura@stu.co.jp", contact_phone="03-8901-2345",
                source="Web問い合わせ", status="lost", priority="medium",
                estimated_value=2500000, industry="建設", company_size="medium",
                score=30, temperature="cold", lost_reason="予算不足",
                next_action=None, next_action_date=None,
                last_contact_date=now - timedelta(days=30), assigned_to=3
            ),
        ]
        db.add_all(leads)
        db.commit()
        print("Leads created: 8")

        # ========== 4. 商談データ ==========
        deals = [
            Deal(
                id=1, title="ABC社 CRM導入プロジェクト", lead_id=1,
                stage="proposal", amount=5000000, probability=50,
                expected_close_date=now + timedelta(days=30),
                description="製造業向けCRM導入案件", assigned_to=1,
                last_stage_change=now - timedelta(days=14)
            ),
            Deal(
                id=2, title="XYZ社 クラウド移行支援", lead_id=2,
                stage="discovery", amount=3000000, probability=20,
                expected_close_date=now + timedelta(days=60),
                description="オンプレからクラウドへの移行", assigned_to=2,
                last_stage_change=now - timedelta(days=7)
            ),
            Deal(
                id=3, title="DEF工業 ERP刷新", lead_id=3,
                stage="negotiation", amount=8000000, probability=70,
                expected_close_date=now + timedelta(days=14),
                description="基幹システム刷新プロジェクト", assigned_to=1,
                last_stage_change=now - timedelta(days=5)
            ),
            Deal(
                id=4, title="JKLシステムズ セキュリティ強化", lead_id=5,
                stage="proposal", amount=6000000, probability=40,
                expected_close_date=now + timedelta(days=45),
                description="セキュリティ対策パッケージ導入", assigned_to=2,
                last_stage_change=now - timedelta(days=21)
            ),
            Deal(
                id=5, title="PQR物流 WMS導入", lead_id=7,
                stage="closed_won", amount=3500000, probability=100,
                expected_close_date=now - timedelta(days=5),
                actual_close_date=now - timedelta(days=5),
                description="倉庫管理システム導入", assigned_to=2,
                last_stage_change=now - timedelta(days=5)
            ),
            Deal(
                id=6, title="MNO金融 データ分析基盤", lead_id=6,
                stage="discovery", amount=4000000, probability=15,
                expected_close_date=now + timedelta(days=90),
                description="BI/データ分析環境構築", assigned_to=1,
                last_stage_change=now - timedelta(days=3)
            ),
        ]
        db.add_all(deals)
        db.commit()
        print("Deals created: 6")

        # ========== 5. 活動履歴データ ==========
        activities = [
            Activity(
                lead_id=1, deal_id=1, type="meeting", subject="初回商談",
                description="課題ヒアリング実施", outcome="好感触",
                next_step="提案書作成", activity_date=now - timedelta(days=14), created_by=1
            ),
            Activity(
                lead_id=1, deal_id=1, type="email", subject="資料送付",
                description="製品カタログ送付", outcome="受領確認済",
                activity_date=now - timedelta(days=10), created_by=1
            ),
            Activity(
                lead_id=1, deal_id=1, type="call", subject="フォローコール",
                description="資料確認状況の確認", outcome="検討中",
                next_step="デモ実施", activity_date=now - timedelta(days=5), created_by=1
            ),
            Activity(
                lead_id=3, deal_id=3, type="demo", subject="製品デモ",
                description="オンラインデモ実施", outcome="高評価",
                next_step="見積提出", activity_date=now - timedelta(days=7), created_by=1
            ),
            Activity(
                lead_id=3, deal_id=3, type="proposal", subject="提案書提出",
                description="正式提案書を提出", outcome="検討開始",
                activity_date=now - timedelta(days=3), created_by=1
            ),
            Activity(
                lead_id=2, type="call", subject="初回コンタクト",
                description="展示会後のフォロー電話", outcome="興味あり",
                next_step="詳細資料送付", activity_date=now - timedelta(days=5), created_by=2
            ),
            Activity(
                lead_id=5, deal_id=4, type="meeting", subject="要件定義MTG",
                description="セキュリティ要件のヒアリング", outcome="要件整理完了",
                next_step="見積作成", activity_date=now - timedelta(days=10), created_by=2
            ),
        ]
        db.add_all(activities)
        db.commit()
        print("Activities created: 7")

        # ========== 6. 問い合わせデータ ==========
        inquiries = [
            Inquiry(
                id=1, customer_name="株式会社A", customer_email="info@company-a.co.jp",
                subject="料金プランについて", content="御社のCRMシステムの料金プランについて教えてください。50名規模の会社で利用を検討しています。",
                category="sales", status="in_progress", priority="high", channel="email",
                sla_target_minutes=60, urgency_score=75, assigned_to=4,
                first_response_at=now - timedelta(minutes=30),
                created_at=now - timedelta(hours=1)
            ),
            Inquiry(
                id=2, customer_name="株式会社B", customer_email="support@company-b.co.jp",
                subject="導入時期の相談", content="来年度からの導入を検討しています。導入までのスケジュール感を教えてください。",
                category="sales", status="open", priority="medium", channel="phone",
                sla_target_minutes=60, urgency_score=60, assigned_to=4,
                created_at=now - timedelta(hours=2)
            ),
            Inquiry(
                id=3, customer_name="個人C", customer_email="user-c@example.com",
                subject="機能追加の要望", content="ダッシュボードにグラフ表示機能を追加してほしいです。",
                category="support", status="resolved", priority="low", channel="chat",
                sla_target_minutes=120, urgency_score=30, assigned_to=4,
                first_response_at=now - timedelta(days=1, hours=1),
                response="ご要望ありがとうございます。次期バージョンで対応予定です。",
                responded_at=now - timedelta(days=1),
                created_at=now - timedelta(days=1, hours=2)
            ),
            Inquiry(
                id=4, customer_name="株式会社D", customer_email="admin@company-d.co.jp",
                subject="ログインできない", content="パスワードを忘れてしまいログインできません。リセット方法を教えてください。",
                category="support", status="open", priority="high", channel="email",
                sla_target_minutes=30, urgency_score=90, assigned_to=4,
                created_at=now - timedelta(minutes=45)
            ),
            Inquiry(
                id=5, customer_name="株式会社E", customer_email="sales@company-e.co.jp",
                subject="デモのお願い", content="製品デモを見せていただきたいのですが、可能でしょうか？",
                category="sales", status="in_progress", priority="medium", channel="web",
                sla_target_minutes=60, urgency_score=50, assigned_to=4,
                first_response_at=now - timedelta(hours=3),
                created_at=now - timedelta(hours=4)
            ),
        ]
        db.add_all(inquiries)
        db.commit()
        print("Inquiries created: 5")

        # ========== 7. 問い合わせ対応履歴 ==========
        inquiry_responses = [
            InquiryResponse(
                inquiry_id=1, content="お問い合わせありがとうございます。料金プランについてご案内いたします。50名規模でしたら、スタンダードプランがおすすめです。",
                responded_by=4, created_at=now - timedelta(minutes=30)
            ),
            InquiryResponse(
                inquiry_id=3, content="ご要望ありがとうございます。グラフ表示機能は次期バージョン（v2.5）で対応予定です。",
                responded_by=4, created_at=now - timedelta(days=1)
            ),
            InquiryResponse(
                inquiry_id=5, content="デモのご依頼ありがとうございます。ご都合の良い日時をいくつかお知らせください。",
                responded_by=4, created_at=now - timedelta(hours=3)
            ),
        ]
        db.add_all(inquiry_responses)
        db.commit()
        print("Inquiry responses created: 3")

        # ========== 8. 提案書テンプレート ==========
        templates = [
            ProposalTemplate(
                id=1, name="製造業向け基本テンプレート", industry="製造業",
                issue_type="業務効率化",
                structure={
                    "sections": [
                        {"title": "御社の課題", "type": "text"},
                        {"title": "弊社ソリューション", "type": "text"},
                        {"title": "導入効果", "type": "bullet"},
                        {"title": "導入スケジュール", "type": "timeline"},
                        {"title": "お見積り", "type": "quote"}
                    ]
                }
            ),
            ProposalTemplate(
                id=2, name="IT企業向けテンプレート", industry="IT",
                issue_type="DX推進",
                structure={
                    "sections": [
                        {"title": "エグゼクティブサマリー", "type": "text"},
                        {"title": "技術要件", "type": "text"},
                        {"title": "アーキテクチャ", "type": "diagram"},
                        {"title": "導入ロードマップ", "type": "timeline"},
                        {"title": "費用見積", "type": "quote"}
                    ]
                }
            ),
            ProposalTemplate(
                id=3, name="小規模企業向けテンプレート", industry=None,
                issue_type="コスト削減",
                structure={
                    "sections": [
                        {"title": "ご提案の背景", "type": "text"},
                        {"title": "ソリューション概要", "type": "text"},
                        {"title": "期待効果", "type": "bullet"},
                        {"title": "お見積り", "type": "quote"}
                    ]
                }
            ),
        ]
        db.add_all(templates)
        db.commit()
        print("Proposal templates created: 3")

        # ========== 9. 提案書 ==========
        proposals = [
            Proposal(
                id=1, lead_id=1, deal_id=1, template_id=1,
                title="CRMシステム導入のご提案", status="draft",
                content={"sections": [{"title": "御社の課題", "content": "顧客管理の効率化が必要"}]},
                version=1, created_by=1
            ),
            Proposal(
                id=2, lead_id=3, deal_id=3, template_id=1,
                title="ERP刷新のご提案", status="sent",
                content={"sections": [{"title": "御社の課題", "content": "基幹システムの老朽化対応"}]},
                version=2, created_by=1
            ),
            Proposal(
                id=3, lead_id=7, deal_id=5, template_id=2,
                title="WMS導入のご提案", status="accepted",
                content={"sections": [{"title": "ご提案の背景", "content": "倉庫業務の効率化"}]},
                version=1, created_by=2
            ),
        ]
        db.add_all(proposals)
        db.commit()
        print("Proposals created: 3")

        # ========== 10. 見積 ==========
        quotes = [
            Quote(
                proposal_id=1,
                items=[
                    {"name": "CRMライセンス（50ユーザー）", "unit_price": 5000, "quantity": 50, "amount": 250000},
                    {"name": "初期導入支援", "unit_price": 500000, "quantity": 1, "amount": 500000},
                    {"name": "カスタマイズ", "unit_price": 300000, "quantity": 1, "amount": 300000},
                ],
                subtotal=1050000, discount_rate=5, tax_rate=10, total=1102500,
                valid_until=now.date() + timedelta(days=30)
            ),
            Quote(
                proposal_id=2,
                items=[
                    {"name": "ERPライセンス", "unit_price": 100000, "quantity": 30, "amount": 3000000},
                    {"name": "導入コンサルティング", "unit_price": 2000000, "quantity": 1, "amount": 2000000},
                    {"name": "データ移行", "unit_price": 1500000, "quantity": 1, "amount": 1500000},
                ],
                subtotal=6500000, discount_rate=10, tax_rate=10, total=6435000,
                valid_until=now.date() + timedelta(days=14)
            ),
        ]
        db.add_all(quotes)
        db.commit()
        print("Quotes created: 2")

        # ========== 11. 競合情報 ==========
        competitors = [
            Competitor(
                id=1, name="競合A社", description="大手CRMベンダー",
                website="https://competitor-a.example.com",
                strengths=["価格が安い", "知名度が高い", "サポート拠点が多い"],
                weaknesses=["カスタマイズ性が低い", "日本語対応が不十分"],
                pricing_info="月額3,000円/ユーザー〜",
                target_market="中小企業",
                features={"顧客管理": "基本機能のみ", "分析": "簡易レポート"}
            ),
            Competitor(
                id=2, name="競合B社", description="国産CRMベンダー",
                website="https://competitor-b.example.com",
                strengths=["日本語対応が充実", "機能が豊富"],
                weaknesses=["価格が高い", "導入に時間がかかる"],
                pricing_info="月額8,000円/ユーザー〜",
                target_market="大企業",
                features={"顧客管理": "高度な機能", "分析": "AI分析搭載"}
            ),
        ]
        db.add_all(competitors)
        db.commit()
        print("Competitors created: 2")

        # ========== 12. スキル評価 ==========
        skill_assessments = [
            EmployeeSkillAssessment(
                employee_id=1, assessment_date=now.date(),
                skills={"ヒアリング力": 85, "提案力": 80, "クロージング力": 90, "商品知識": 75, "コミュニケーション": 85, "課題発見力": 80}
            ),
            EmployeeSkillAssessment(
                employee_id=2, assessment_date=now.date(),
                skills={"ヒアリング力": 80, "提案力": 70, "クロージング力": 65, "商品知識": 80, "コミュニケーション": 85, "課題発見力": 75}
            ),
            EmployeeSkillAssessment(
                employee_id=3, assessment_date=now.date(),
                skills={"ヒアリング力": 60, "提案力": 55, "クロージング力": 50, "商品知識": 65, "コミュニケーション": 70, "課題発見力": 55}
            ),
            EmployeeSkillAssessment(
                employee_id=5, assessment_date=now.date(),
                skills={"ヒアリング力": 50, "提案力": 45, "クロージング力": 40, "商品知識": 55, "コミュニケーション": 65, "課題発見力": 45}
            ),
        ]
        db.add_all(skill_assessments)
        db.commit()
        print("Skill assessments created: 4")

        # ========== 13. 商談ログ ==========
        meeting_logs = [
            MeetingLog(
                deal_id=1, employee_id=1, meeting_date=now - timedelta(days=14),
                duration_minutes=60, attendees=["加藤一郎", "田中太郎"],
                transcript="本日はお時間いただきありがとうございます。御社の課題についてお聞かせください。",
                summary="顧客管理の効率化が課題。現在Excelで管理しており限界を感じている。",
                key_points=["Excel管理の限界", "50名規模での利用想定", "来年度予算で検討"],
                action_items=["提案書作成", "デモ日程調整"],
                ng_words_detected=[]
            ),
            MeetingLog(
                deal_id=3, employee_id=1, meeting_date=now - timedelta(days=7),
                duration_minutes=90, attendees=["渡辺健太", "工場長", "田中太郎"],
                transcript="本日は製品デモをご覧いただきます。",
                summary="デモを実施。工場長から高評価。予算確保の見通しあり。",
                key_points=["工場長が決裁者", "予算8000万円確保済み", "4月導入希望"],
                action_items=["見積提出", "契約書ドラフト作成"],
                ng_words_detected=[]
            ),
        ]
        db.add_all(meeting_logs)
        db.commit()
        print("Meeting logs created: 2")

        # ========== 14. アラートルール ==========
        alert_rules = [
            AlertRule(
                id=1, name="フォローアップ期限切れ", type="follow_up",
                condition={"field": "next_action_date", "operator": "<", "value": "now"},
                action={"type": "notification", "priority": "high"},
                is_active=True
            ),
            AlertRule(
                id=2, name="案件滞留（14日）", type="stalled_deal",
                condition={"field": "days_since_stage_change", "operator": ">", "value": 14},
                action={"type": "notification", "priority": "medium"},
                is_active=True
            ),
            AlertRule(
                id=3, name="SLA違反", type="inquiry_sla",
                condition={"field": "response_time", "operator": ">", "value": "sla_target"},
                action={"type": "notification", "priority": "high"},
                is_active=True
            ),
            AlertRule(
                id=4, name="HOTリード未対応", type="hot_lead",
                condition={"field": "days_since_contact", "operator": ">", "value": 3, "temperature": "hot"},
                action={"type": "notification", "priority": "high"},
                is_active=False
            ),
        ]
        db.add_all(alert_rules)
        db.commit()
        print("Alert rules created: 4")

        # ========== 15. アラート ==========
        alerts = [
            Alert(
                type="follow_up", entity_type="lead", entity_id=1,
                title="フォローアップ期限切れ: 株式会社ABC",
                description="次アクション「デモ日程調整」の期限が過ぎています",
                priority="high", is_read=False,
                triggered_at=now - timedelta(hours=1), assigned_to=1
            ),
            Alert(
                type="inquiry_sla", entity_type="inquiry", entity_id=2,
                title="SLA違反: 問い合わせ#2",
                description="初回対応SLA（60分）を超過しています",
                priority="high", is_read=False,
                triggered_at=now - timedelta(hours=1), assigned_to=4
            ),
            Alert(
                type="stalled_deal", entity_type="deal", entity_id=4,
                title="案件滞留: JKLシステムズ セキュリティ強化",
                description="「提案中」ステージで21日間進捗なし",
                priority="medium", is_read=False,
                triggered_at=now - timedelta(days=1), assigned_to=2
            ),
            Alert(
                type="stalled_deal", entity_type="deal", entity_id=1,
                title="案件滞留: ABC社 CRM導入プロジェクト",
                description="「提案中」ステージで14日間進捗なし",
                priority="medium", is_read=True,
                triggered_at=now - timedelta(days=2), assigned_to=1
            ),
        ]
        db.add_all(alerts)
        db.commit()
        print("Alerts created: 4")

        # ========== 16. 受注提案書 ==========
        won_proposals = [
            WonProposal(
                proposal_id=3, deal_id=5,
                industry="物流", company_size="medium", deal_value=3500000,
                pain_points=["在庫管理の非効率", "ピッキングミスの多発", "リアルタイム把握ができない"],
                key_success_factors=["ROIの明確な提示", "同業他社の導入事例", "段階的導入プラン"],
                competitor_defeated=["競合A社"],
                proposal_sections=[
                    {"title": "課題整理", "content": "在庫管理の課題を詳細に整理"},
                    {"title": "ソリューション", "content": "WMSによる解決策を提示"}
                ],
                quote_items=[
                    {"name": "WMSライセンス", "amount": 2000000},
                    {"name": "導入支援", "amount": 1500000}
                ],
                close_date=now.date() - timedelta(days=5)
            ),
        ]
        db.add_all(won_proposals)
        db.commit()
        print("Won proposals created: 1")

        # ========== 17. 会社メモ ==========
        company_memos = [
            CompanyMemo(
                lead_id=1, company_name="株式会社ABC",
                original_text="2026/1/10 商談メモ\n参加者：加藤様、田中\n\n現状、顧客管理はExcelで行っている。50名規模になり限界を感じている。\n来年度予算で導入を検討したい。\n\n決定事項：\n・デモを実施する\n・提案書を作成する\n\n宿題：\n・田中：提案書作成（1/20まで）\n・加藤様：社内稟議の準備",
                summary="顧客管理の効率化を検討中。Excel管理の限界を感じており、来年度予算での導入を希望。",
                decisions=["デモを実施する", "提案書を作成する"],
                action_items=[
                    {"owner": "田中", "task": "提案書作成", "deadline": "2026-01-20"},
                    {"owner": "加藤様", "task": "社内稟議の準備", "deadline": None}
                ],
                next_actions=[{"action": "デモ実施", "date": "2026-01-25"}],
                meeting_date=now.date() - timedelta(days=6),
                related_projects=["CRM導入プロジェクト"],
                memo_type="meeting_note",
                registered_user_name="田中太郎"
            ),
            CompanyMemo(
                lead_id=3, company_name="DEF工業株式会社",
                original_text="2026/1/12 デモ実施報告\n参加者：渡辺様、工場長、田中\n\nデモを実施。工場長から高評価をいただいた。\n予算8000万円は確保済みとのこと。4月導入を希望されている。\n\n決定事項：\n・見積を提出する\n・契約書ドラフトを準備する",
                summary="デモ実施で高評価。予算確保済み、4月導入希望。",
                decisions=["見積を提出する", "契約書ドラフトを準備する"],
                action_items=[
                    {"owner": "田中", "task": "見積提出", "deadline": "2026-01-17"},
                    {"owner": "田中", "task": "契約書ドラフト作成", "deadline": "2026-01-20"}
                ],
                next_actions=[{"action": "契約交渉", "date": "2026-01-25"}],
                meeting_date=now.date() - timedelta(days=4),
                related_projects=["ERP刷新プロジェクト"],
                memo_type="meeting_note",
                registered_user_name="田中太郎"
            ),
        ]
        db.add_all(company_memos)
        db.commit()
        print("Company memos created: 2")

        print("\n" + "=" * 50)
        print("Test data seeding completed successfully!")
        print("=" * 50)

    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_data()

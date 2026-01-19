"""RAG（Retrieval-Augmented Generation）サービス"""
from typing import List, Optional, AsyncGenerator
from datetime import datetime, timedelta

from services.llm_service import llm_service
from services.vector_store import vector_store
from database import SessionLocal
from models.db_models import Employee, Lead, Deal, Activity, Inquiry, MeetingLog, EmployeeSkillAssessment, Alert


class RAGService:
    """RAGサービス - ベクトル検索 + データベース検索 + LLM応答生成"""

    def __init__(self):
        self.llm = llm_service
        self.store = vector_store

    def _get_db_context_for_agent(self, agent_id: str, query: str) -> str:
        """エージェントIDに応じてデータベースからコンテキストを取得"""
        db = SessionLocal()
        try:
            context_parts = []

            if agent_id == "analysis":
                # 社員・スキルデータを取得
                employees = db.query(Employee).filter(Employee.is_active == True).all()
                if employees:
                    context_parts.append("【登録されている社員とスキル情報】")
                    for emp in employees:
                        skills_str = ", ".join([f"{k}({v})" for k, v in (emp.skills or {}).items()])
                        context_parts.append(f"- {emp.name}（{emp.department}, {emp.position}）: {skills_str}")

            elif agent_id == "leads":
                # リードデータを取得
                leads = db.query(Lead).filter(Lead.status.notin_(["won", "lost"])).order_by(Lead.score.desc()).limit(20).all()
                if leads:
                    context_parts.append("【現在のリード（見込み客）一覧】")
                    for lead in leads:
                        next_action_str = f"次アクション: {lead.next_action}" if lead.next_action else ""
                        context_parts.append(
                            f"- {lead.company_name}: 担当={lead.contact_name}, "
                            f"温度={lead.temperature}, スコア={lead.score}, "
                            f"ステータス={lead.status}, 想定金額={lead.estimated_value:,.0f}円, "
                            f"{next_action_str}"
                        )

                # 統計情報
                total = db.query(Lead).count()
                hot = db.query(Lead).filter(Lead.temperature == "hot").count()
                warm = db.query(Lead).filter(Lead.temperature == "warm").count()
                context_parts.append(f"\n【リード統計】総数: {total}件, HOT: {hot}件, WARM: {warm}件")

            elif agent_id == "progress":
                # 商談・パイプラインデータを取得
                deals = db.query(Deal).filter(Deal.stage.notin_(["closed_won", "closed_lost"])).order_by(Deal.amount.desc()).limit(15).all()
                if deals:
                    context_parts.append("【進行中の商談一覧】")
                    for deal in deals:
                        # リード情報を取得
                        lead = db.query(Lead).filter(Lead.id == deal.lead_id).first()
                        company = lead.company_name if lead else "不明"
                        context_parts.append(
                            f"- {deal.title}（{company}）: ステージ={deal.stage}, "
                            f"金額={deal.amount:,.0f}円, 確度={deal.probability}%, "
                            f"クローズ予定={deal.expected_close_date.strftime('%Y-%m-%d') if deal.expected_close_date else '未定'}"
                        )

                # 滞留案件
                threshold = datetime.utcnow() - timedelta(days=14)
                stalled = db.query(Deal).filter(
                    Deal.stage.notin_(["closed_won", "closed_lost"]),
                    Deal.updated_at < threshold
                ).count()
                context_parts.append(f"\n【注意】14日以上滞留している案件: {stalled}件")

            elif agent_id == "inquiry":
                # 問い合わせデータを取得
                inquiries = db.query(Inquiry).filter(
                    Inquiry.status.in_(["open", "in_progress"])
                ).order_by(Inquiry.created_at.desc()).limit(10).all()
                if inquiries:
                    context_parts.append("【未解決の問い合わせ一覧】")
                    for inq in inquiries:
                        context_parts.append(
                            f"- #{inq.id} {inq.subject}: 顧客={inq.customer_name}, "
                            f"チャネル={inq.channel}, ステータス={inq.status}, "
                            f"優先度={inq.priority}"
                        )

                # 統計
                open_count = db.query(Inquiry).filter(Inquiry.status == "open").count()
                context_parts.append(f"\n【問い合わせ統計】未対応: {open_count}件")

            elif agent_id == "proposal":
                # 提案書作成に必要なリード・商談情報
                leads = db.query(Lead).filter(Lead.status.in_(["proposal", "negotiating"])).limit(10).all()
                if leads:
                    context_parts.append("【提案段階のリード】")
                    for lead in leads:
                        context_parts.append(
                            f"- {lead.company_name}: 業界={lead.industry}, "
                            f"規模={lead.company_size}, 想定金額={lead.estimated_value:,.0f}円"
                        )

            elif agent_id == "coach":
                # コーチング用データ
                employees = db.query(Employee).filter(Employee.is_active == True).limit(10).all()
                if employees:
                    context_parts.append("【営業メンバー】")
                    for emp in employees:
                        # スキル評価を取得
                        assessment = db.query(EmployeeSkillAssessment).filter(
                            EmployeeSkillAssessment.employee_id == emp.id
                        ).order_by(EmployeeSkillAssessment.assessment_date.desc()).first()
                        if assessment and assessment.skills:
                            skills_str = ", ".join([f"{k}:{v}" for k, v in assessment.skills.items()])
                            context_parts.append(f"- {emp.name}: {skills_str}")
                        else:
                            context_parts.append(f"- {emp.name}（スキル評価未実施）")

                # 商談ログ
                logs = db.query(MeetingLog).order_by(MeetingLog.meeting_date.desc()).limit(5).all()
                if logs:
                    context_parts.append("\n【最近の商談ログ】")
                    for log in logs:
                        emp = db.query(Employee).filter(Employee.id == log.employee_id).first()
                        emp_name = emp.name if emp else "不明"
                        context_parts.append(
                            f"- {log.meeting_date.strftime('%Y-%m-%d') if log.meeting_date else '日付不明'} "
                            f"担当: {emp_name}, 要約: {(log.summary or '')[:50]}..."
                        )

            # アラート情報（全エージェント共通で有用）
            alerts = db.query(Alert).filter(Alert.is_read == False, Alert.is_dismissed == False).limit(5).all()
            if alerts:
                context_parts.append("\n【未対応のアラート】")
                for alert in alerts:
                    context_parts.append(f"- [{alert.priority}] {alert.title}")

            return "\n".join(context_parts) if context_parts else ""

        finally:
            db.close()

    async def chat_with_rag(
        self,
        agent_id: str,
        messages: List[dict],
        use_rag: bool = True
    ) -> dict:
        """RAGを使用したチャット応答"""
        context = None
        sources = []

        if use_rag and messages:
            # 最新のユーザーメッセージを取得
            user_messages = [m for m in messages if m.get("role") == "user"]
            if user_messages:
                query = user_messages[-1].get("content", "")

                # データベースからコンテキストを取得
                db_context = self._get_db_context_for_agent(agent_id, query)

                # エージェントに応じたコレクションを選択
                collections = self._get_collections_for_agent(agent_id)

                # ベクトルストアからコンテキストを取得
                vector_context = await self.store.get_context(
                    query=query,
                    collections=collections,
                    top_k=3
                )

                # コンテキストを統合
                context_parts = []
                if db_context:
                    context_parts.append("【データベース情報】\n" + db_context)
                if vector_context:
                    context_parts.append("【ドキュメント情報】\n" + vector_context)
                context = "\n\n".join(context_parts) if context_parts else None

                if vector_context:
                    # ソース情報を抽出
                    search_results = []
                    for collection in collections:
                        try:
                            results = await self.store.search(collection, query, top_k=3)
                            search_results.extend(results)
                        except Exception:
                            pass

                    sources = list(set([
                        r["metadata"].get("filename", "")
                        for r in search_results
                        if r["metadata"].get("filename")
                    ]))

        # LLMで応答生成
        response = await self.llm.chat(agent_id, messages, context)

        if sources:
            response["sources"] = sources

        return response

    async def chat_with_rag_stream(
        self,
        agent_id: str,
        messages: List[dict],
        use_rag: bool = True
    ) -> AsyncGenerator[str, None]:
        """RAGを使用したストリーミングチャット"""
        context = None

        if use_rag and messages:
            user_messages = [m for m in messages if m.get("role") == "user"]
            if user_messages:
                query = user_messages[-1].get("content", "")

                # データベースからコンテキストを取得
                db_context = self._get_db_context_for_agent(agent_id, query)

                # エージェントに応じたコレクションを選択
                collections = self._get_collections_for_agent(agent_id)

                # ベクトルストアからコンテキストを取得
                vector_context = await self.store.get_context(
                    query=query,
                    collections=collections,
                    top_k=3
                )

                # コンテキストを統合
                context_parts = []
                if db_context:
                    context_parts.append("【データベース情報】\n" + db_context)
                if vector_context:
                    context_parts.append("【ドキュメント情報】\n" + vector_context)
                context = "\n\n".join(context_parts) if context_parts else None

        async for token in self.llm.chat_stream(agent_id, messages, context):
            yield token

    def _get_collections_for_agent(self, agent_id: str) -> List[str]:
        """エージェントIDに対応するコレクションを取得"""
        agent_collections = {
            "analysis": ["skills"],  # スキル検索はスキルシートのみ
            "leads": ["knowledge"],
            "progress": ["knowledge"],
            "inquiry": ["knowledge"],
            "proposal": ["knowledge", "skills"],
            "coach": ["knowledge"],
        }

        return agent_collections.get(agent_id, ["knowledge"])


# シングルトンインスタンス
rag_service = RAGService()

"""LLMサービス（OpenAI SDK直接使用版）"""
from typing import AsyncGenerator, List, Optional
import asyncio
from openai import AsyncOpenAI

from config import settings


class LLMService:
    """OpenAI LLMサービス"""

    def __init__(self):
        self.api_key = settings.OPENAI_API_KEY
        self.is_mock_mode = not self.api_key or self.api_key == "your_openai_api_key_here"

        if not self.is_mock_mode:
            self.client = AsyncOpenAI(api_key=self.api_key)
        else:
            self.client = None
            print("WARNING: OpenAI API key not set. Running in MOCK mode.")

        self.model = settings.OPENAI_MODEL
        self.temperature = settings.TEMPERATURE
        self.max_tokens = settings.MAX_TOKENS

    def get_system_prompt(self, agent_id: str) -> str:
        """エージェントIDに対応するシステムプロンプトを取得"""
        return settings.AGENT_PROMPTS.get(agent_id, settings.AGENT_PROMPTS["analysis"])

    def _build_messages(
        self,
        agent_id: str,
        messages: List[dict],
        context: Optional[str] = None
    ) -> List[dict]:
        """メッセージリストを構築（画像対応）"""
        openai_messages = []

        # システムプロンプト
        system_prompt = self.get_system_prompt(agent_id)

        # RAGコンテキストがあれば追加
        if context:
            system_prompt += f"\n\n参考情報:\n{context}"

        openai_messages.append({"role": "system", "content": system_prompt})

        # ユーザーメッセージを追加
        for msg in messages:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            images = msg.get("images", [])

            if role in ("user", "assistant"):
                # 画像がある場合はマルチモーダル形式
                if images and role == "user":
                    content_parts = [{"type": "text", "text": content}]
                    for img_base64 in images:
                        # data:image/...;base64, のプレフィックスがない場合は追加
                        if not img_base64.startswith("data:"):
                            img_base64 = f"data:image/jpeg;base64,{img_base64}"
                        content_parts.append({
                            "type": "image_url",
                            "image_url": {"url": img_base64}
                        })
                    openai_messages.append({"role": role, "content": content_parts})
                else:
                    openai_messages.append({"role": role, "content": content})
            # systemロールはスキップ（最初のシステムプロンプトで処理済み）

        return openai_messages

    def _generate_mock_response(self, agent_id: str, messages: List[dict]) -> str:
        """モックレスポンスを生成"""
        last_message = messages[-1] if messages else {}
        last_content = last_message.get("content", "")
        last_images = last_message.get("images", [])

        # 画像が含まれている場合
        if last_images:
            return f"画像を{len(last_images)}枚受け取りました。\n\n【画像分析結果（モック）】\n- 画像タイプ：ビジネス関連資料\n- 検出された要素：テキスト、図表、グラフ\n\nご質問があれば、具体的にお聞かせください。\n\n（モックモードのため、実際の画像解析は行われていません）"

        mock_responses = {
            "analysis": {
                "default": "社内スキル検索の結果です。\n\n該当する人材が見つかりました：\n1. 田中太郎 - Python, FastAPI経験5年\n2. 鈴木花子 - データ分析, 機械学習経験3年\n\n詳細な検索条件を教えていただければ、さらに絞り込みます。",
                "python": "Python開発経験者を検索しました。\n\n【候補者】\n1. 田中太郎 - Python歴5年、Django/FastAPI経験あり\n2. 鈴木花子 - Python歴3年、機械学習・データ分析が得意\n3. 佐藤一郎 - Python歴7年、バックエンド開発のスペシャリスト",
            },
            "leads": {
                "default": "見込み客の分析結果です。\n\n【優先度：高】\n- 成約確度が高く、予算も確保されています\n- 推奨アクション：今週中に提案書を送付\n- フォローアップ：3日以内に電話連絡",
            },
            "progress": {
                "default": "案件進捗の分析結果です。\n\n【現状】\n- 順調に進行中です\n\n【推奨アクション】\n- 次回ミーティングで詳細要件を確認\n- 技術検証のスケジュールを調整",
            },
            "inquiry": {
                "default": "お問い合わせへの回答案です。\n\n---\n\nお問い合わせいただきありがとうございます。\n\nご質問いただいた件について、以下の通りご回答いたします。\n\n詳細についてご不明な点がございましたら、お気軽にお問い合わせください。",
            },
            "proposal": {
                "default": "提案書を作成しました。\n\n【提案概要】\n- ソリューション名：カスタムAIソリューション\n- 導入効果：業務効率30%向上\n- 費用：お見積り別途\n\n詳細な提案内容は添付資料をご確認ください。",
            },
            "coach": {
                "default": "営業アドバイスです。\n\n【ポイント】\n1. 顧客の課題を深掘りしましょう\n2. 競合との差別化ポイントを明確に\n3. 次のステップを具体的に提案\n\n何か具体的な状況があればお聞かせください。",
            },
        }

        agent_responses = mock_responses.get(agent_id, mock_responses["analysis"])

        # キーワードマッチ
        for keyword, response in agent_responses.items():
            if keyword != "default" and keyword.lower() in last_content.lower():
                return response

        return agent_responses.get("default", "ご質問ありがとうございます。（モックモード）")

    async def chat(
        self,
        agent_id: str,
        messages: List[dict],
        context: Optional[str] = None
    ) -> dict:
        """チャット応答を生成（非ストリーミング）"""
        # モックモードの場合
        if self.is_mock_mode:
            mock_response = self._generate_mock_response(agent_id, messages)
            return {
                "success": True,
                "message": mock_response,
                "usage": {
                    "model": "mock",
                    "prompt_tokens": 0,
                    "completion_tokens": 0,
                }
            }

        openai_messages = self._build_messages(agent_id, messages, context)

        response = await self.client.chat.completions.create(
            model=self.model,
            messages=openai_messages,
            temperature=self.temperature,
            max_tokens=self.max_tokens,
        )

        return {
            "success": True,
            "message": response.choices[0].message.content,
            "usage": {
                "model": self.model,
                "prompt_tokens": response.usage.prompt_tokens,
                "completion_tokens": response.usage.completion_tokens,
            }
        }

    async def chat_stream(
        self,
        agent_id: str,
        messages: List[dict],
        context: Optional[str] = None
    ) -> AsyncGenerator[str, None]:
        """チャット応答をストリーミング生成"""
        # モックモードの場合
        if self.is_mock_mode:
            mock_response = self._generate_mock_response(agent_id, messages)
            # 文字ごとにストリーミング風に返す
            for char in mock_response:
                yield char
                await asyncio.sleep(0.02)  # 20msの遅延でタイピング風に
            return

        openai_messages = self._build_messages(agent_id, messages, context)

        stream = await self.client.chat.completions.create(
            model=self.model,
            messages=openai_messages,
            temperature=self.temperature,
            max_tokens=self.max_tokens,
            stream=True,
        )

        async for chunk in stream:
            if chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content

    async def generate_sales_response(
        self,
        prompt_type: str,
        data: dict
    ) -> str:
        """営業機能向けの応答生成"""
        prompts = {
            "leads": self._build_leads_prompt(data),
            "progress": self._build_progress_prompt(data),
            "inquiry": self._build_inquiry_prompt(data),
            "proposal": self._build_proposal_prompt(data),
            "coach": self._build_coach_prompt(data),
        }

        system_prompt = settings.AGENT_PROMPTS.get(prompt_type, "")
        user_prompt = prompts.get(prompt_type, "")

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ]

        response = await self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=self.temperature,
            max_tokens=self.max_tokens,
        )

        return response.choices[0].message.content

    def _build_leads_prompt(self, data: dict) -> str:
        """リード分析プロンプト構築"""
        return f"""以下のリード情報を分析してください：

会社名: {data.get('company_name', '')}
担当者: {data.get('contact_person', '')}
業界: {data.get('industry', '')}
予算: {data.get('budget', '')}
導入時期: {data.get('timeline', '')}
ニーズ: {data.get('needs', '')}

優先度判定、ネクストアクション、フォローアップ計画を提案してください。"""

    def _build_progress_prompt(self, data: dict) -> str:
        """進捗分析プロンプト構築"""
        return f"""以下の案件情報を分析してください：

案件名: {data.get('deal_name', '')}
現在のステージ: {data.get('stage', '')}
案件金額: {data.get('value', '')}
成約予定日: {data.get('close_date', '')}
課題: {data.get('challenges', '')}

ボトルネック特定、次のステップ、リスク対策を提案してください。"""

    def _build_inquiry_prompt(self, data: dict) -> str:
        """問い合わせ対応プロンプト構築"""
        context = data.get('context', '')
        context_text = f"\n背景情報: {context}" if context else ""

        return f"""以下の問い合わせに対する回答案を作成してください：

問い合わせ内容: {data.get('inquiry', '')}{context_text}

プロフェッショナルで親しみやすい回答を作成してください。"""

    def _build_proposal_prompt(self, data: dict) -> str:
        """提案書作成プロンプト構築"""
        client = data.get('client_info', {})
        product = data.get('product_info', {})

        return f"""以下の情報を基に提案書を作成してください：

【顧客情報】
顧客名: {client.get('name', '')}
ニーズ: {client.get('needs', '')}

【提案製品/サービス】
名称: {product.get('name', '')}
特徴: {product.get('features', '')}"""

    def _build_coach_prompt(self, data: dict) -> str:
        """営業コーチプロンプト構築"""
        question = data.get('question', '')
        question_text = f"\n具体的な質問: {question}" if question else ""

        return f"""以下の状況についてアドバイスをください：

現在の状況: {data.get('situation', '')}{question_text}

実践的で具体的なアドバイスをお願いします。"""


# シングルトンインスタンス
llm_service = LLMService()

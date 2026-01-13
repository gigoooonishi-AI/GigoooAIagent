"""LLMサービス（OpenAI SDK直接使用版）"""
from typing import AsyncGenerator, List, Optional
import asyncio
from openai import AsyncOpenAI

from config import settings


class LLMService:
    """OpenAI LLMサービス"""

    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
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
        """メッセージリストを構築"""
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

            if role in ("user", "assistant"):
                openai_messages.append({"role": role, "content": content})
            # systemロールはスキップ（最初のシステムプロンプトで処理済み）

        return openai_messages

    async def chat(
        self,
        agent_id: str,
        messages: List[dict],
        context: Optional[str] = None
    ) -> dict:
        """チャット応答を生成（非ストリーミング）"""
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

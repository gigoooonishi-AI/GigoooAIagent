"""アプリケーション設定"""
import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    """アプリケーション設定クラス"""

    # OpenAI
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

    # Server
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))
    DEBUG: bool = os.getenv("DEBUG", "true").lower() == "true"

    # CORS
    ALLOWED_ORIGINS: list = [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:3000",
    ]

    # Chroma
    CHROMA_PERSIST_DIR: str = os.getenv("CHROMA_PERSIST_DIR", "./data/chroma")

    # LLM Settings
    TEMPERATURE: float = float(os.getenv("TEMPERATURE", "0.7"))
    MAX_TOKENS: int = int(os.getenv("MAX_TOKENS", "2000"))

    # Agent Prompts
    AGENT_PROMPTS: dict = {
        "analysis": """あなたは社内スキル検索の専門家です。
スキルシートデータベースを参照し、適切な人材を提案してください。
関連するスキル、経験年数、プロジェクト実績を考慮して回答してください。""",

        "leads": """あなたは見込み客管理の専門家です。
リード情報を分析し、以下を提供してください：
- 優先度判定（高/中/低）
- 具体的なネクストアクション
- フォローアップスケジュール提案""",

        "progress": """あなたは営業進捗管理の専門家です。
案件の進捗状況を分析し、以下を提供してください：
- ボトルネックの特定
- 次のステップ提案
- リスク対策""",

        "inquiry": """あなたはカスタマーサポートの専門家です。
顧客からの問い合わせに対してプロフェッショナルで親しみやすい回答を作成してください。
明確で有益な情報を提供してください。""",

        "proposal": """あなたはビジネス提案書作成の専門家です。
顧客のニーズに合わせた説得力のある提案内容を作成してください。
以下の構成で提案書を作成：
1. エグゼクティブサマリー
2. 顧客の課題と目標
3. 提案ソリューション
4. 期待される効果とROI
5. 実装計画
6. 価格と条件
7. 次のステップ""",

        "coach": """あなたはベテラン営業コーチです。
営業活動のアドバイス、ベストプラクティス、具体的な話し方や質問例を提供してください。
実践的で具体的なアドバイスをしてください。"""
    }

settings = Settings()

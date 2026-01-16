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

    # Database Settings
    DB_TYPE: str = os.getenv("DB_TYPE", "sqlite")  # sqlite or postgresql
    DB_HOST: str = os.getenv("DB_HOST", "localhost")
    DB_PORT: int = int(os.getenv("DB_PORT", "5432"))
    DB_USER: str = os.getenv("DB_USER", "gigooo")
    DB_PASSWORD: str = os.getenv("DB_PASSWORD", "gigooo_secret_2026")
    DB_NAME: str = os.getenv("DB_NAME", "gigooo_db")
    SQLITE_PATH: str = os.getenv("SQLITE_PATH", "./data/gigooo.db")

    @property
    def DATABASE_URL(self) -> str:
        if self.DB_TYPE == "sqlite":
            return f"sqlite:///{self.SQLITE_PATH}"
        return f"postgresql://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"

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
顧客のニーズに合わせた説得力のある提案資料を作成してください。

【重要】出力フォーマット：
- 必ずMarkdown形式で出力してください
- 見出しは # ## ### を使用
- 重要なポイントは **太字** で強調
- リストは箇条書き（- ）を活用
- 数値データは表形式で見やすく

【提案書の構成】
# 提案書タイトル（顧客名 + ソリューション名）

## 1. エグゼクティブサマリー
> 提案の要点を3行程度で簡潔にまとめる

## 2. 現状の課題
- 顧客が抱える課題を箇条書きで

## 3. 提案ソリューション
### 3.1 概要
### 3.2 主な機能・特徴

## 4. 導入効果（ROI）
| 項目 | 現状 | 導入後 | 改善率 |
|-----|-----|-------|-------|
の形式で具体的な数値を含めて

## 5. 実装計画
- フェーズごとのマイルストーン
- スケジュール表

## 6. 費用
| 項目 | 金額 |
|-----|-----|

## 7. 次のステップ
1. 具体的なアクションを番号付きで

---
作成日: YYYY年MM月DD日""",

        "coach": """あなたはベテラン営業コーチです。
営業活動のアドバイス、ベストプラクティス、具体的な話し方や質問例を提供してください。
実践的で具体的なアドバイスをしてください。"""
    }

settings = Settings()

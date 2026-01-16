"""FastAPI メインアプリケーション"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from config import settings
from routers import chat, sales, documents, database, chat_history, proposals, coach, alerts
from models.schemas import HealthResponse, AgentsResponse, AgentInfo
from database import init_db

# FastAPIアプリケーション作成
app = FastAPI(
    title="GIGOOO AI Agent API",
    description="営業支援AIエージェントAPI - LangChain + RAG + WebSocket対応",
    version="2.0.0",
)

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ルーター登録
app.include_router(chat.router, prefix="/api", tags=["Chat"])
app.include_router(sales.router, prefix="/api/sales", tags=["Sales"])
app.include_router(documents.router, prefix="/api/documents", tags=["Documents"])
app.include_router(database.router, prefix="/api/db", tags=["Database"])
app.include_router(chat_history.router, prefix="/api/history", tags=["Chat History"])
app.include_router(proposals.router, prefix="/api/proposals", tags=["Proposals"])
app.include_router(coach.router, prefix="/api/coach", tags=["Coach"])
app.include_router(alerts.router, prefix="/api/alerts", tags=["Alerts"])


@app.get("/api/health", response_model=HealthResponse)
async def health_check():
    """ヘルスチェック"""
    return HealthResponse(
        status="ok",
        message="API is running with FastAPI + LangChain"
    )


@app.get("/api/agents", response_model=AgentsResponse)
async def get_agents():
    """利用可能なエージェント一覧"""
    agents = [
        AgentInfo(id="analysis", name="社内スキル検索", description="スキルシート参照・人材検索"),
        AgentInfo(id="leads", name="見込み客管理", description="優先度分析・アクション提案"),
        AgentInfo(id="progress", name="進捗管理", description="ボトルネック特定・対策提案"),
        AgentInfo(id="inquiry", name="問い合わせ対応", description="回答案自動作成"),
        AgentInfo(id="proposal", name="提案資料作成", description="提案書の自動生成"),
        AgentInfo(id="coach", name="営業コーチ", description="アドバイス・ベストプラクティス"),
    ]
    return AgentsResponse(agents=agents)


@app.on_event("startup")
async def startup_event():
    """起動時の初期化処理"""
    print("=" * 50)
    print("GIGOOO AI Agent API Starting...")
    print(f"OpenAI Model: {settings.OPENAI_MODEL}")
    print(f"Chroma Directory: {settings.CHROMA_PERSIST_DIR}")
    print(f"Database: {settings.DB_HOST}:{settings.DB_PORT}/{settings.DB_NAME}")
    print("=" * 50)

    # OpenAI APIキーチェック
    if not settings.OPENAI_API_KEY:
        print("WARNING: OPENAI_API_KEY is not set!")

    # データベース初期化
    try:
        init_db()
        print("Database tables initialized successfully")
    except Exception as e:
        print(f"WARNING: Database initialization failed: {e}")


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )

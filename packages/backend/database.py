"""データベース接続設定"""
import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

from config import settings

# データディレクトリ作成
os.makedirs(os.path.dirname(settings.SQLITE_PATH), exist_ok=True)

# SQLAlchemyエンジン作成
if settings.DB_TYPE == "sqlite":
    engine = create_engine(
        settings.DATABASE_URL,
        connect_args={"check_same_thread": False}  # SQLite用
    )
else:
    engine = create_engine(
        settings.DATABASE_URL,
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=20
    )

# セッションファクトリ
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# ベースクラス
Base = declarative_base()


def get_db():
    """データベースセッションを取得（依存性注入用）"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """データベーステーブルを初期化"""
    Base.metadata.create_all(bind=engine)

"""チャット履歴保存API"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from database import get_db
from models.db_models import Conversation, ChatMessage, MessageAttachment

router = APIRouter()


# ========== Pydanticスキーマ ==========

class AttachmentCreate(BaseModel):
    file_type: str  # image, document, excel, word, csv
    file_name: Optional[str] = None
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    content_data: Optional[str] = None  # Base64 or parsed text
    thumbnail_data: Optional[str] = None
    extra_data: Optional[dict] = None


class AttachmentResponse(AttachmentCreate):
    id: int
    message_id: int
    created_at: Optional[datetime]

    class Config:
        from_attributes = True


class MessageCreate(BaseModel):
    role: str  # user, assistant, system
    content: str
    token_count: Optional[int] = None
    attachments: Optional[List[AttachmentCreate]] = None


class MessageResponse(BaseModel):
    id: int
    conversation_id: int
    role: str
    content: str
    token_count: Optional[int]
    created_at: Optional[datetime]
    attachments: List[AttachmentResponse] = []

    class Config:
        from_attributes = True


class ConversationCreate(BaseModel):
    session_id: str
    agent_id: str
    title: Optional[str] = None
    project_name: Optional[str] = None
    user_id: Optional[int] = None


class ConversationResponse(BaseModel):
    id: int
    session_id: str
    agent_id: str
    title: Optional[str]
    project_name: Optional[str]
    user_id: Optional[int]
    is_archived: bool
    created_at: Optional[datetime]
    updated_at: Optional[datetime]
    message_count: int = 0

    class Config:
        from_attributes = True


class ConversationWithMessages(ConversationResponse):
    messages: List[MessageResponse] = []


class SaveChatRequest(BaseModel):
    """チャット全体を保存するリクエスト"""
    session_id: str
    agent_id: str
    title: Optional[str] = None
    project_name: Optional[str] = None
    messages: List[MessageCreate]


# ========== 会話API ==========

@router.post("/conversations", response_model=ConversationResponse)
async def create_conversation(
    conversation: ConversationCreate,
    db: Session = Depends(get_db)
):
    """会話を作成"""
    db_conversation = Conversation(**conversation.model_dump())
    db.add(db_conversation)
    db.commit()
    db.refresh(db_conversation)
    return db_conversation


@router.get("/conversations", response_model=List[ConversationResponse])
async def get_conversations(
    agent_id: Optional[str] = None,
    session_id: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """会話一覧取得"""
    query = db.query(Conversation).filter(Conversation.is_archived == False)

    if agent_id:
        query = query.filter(Conversation.agent_id == agent_id)
    if session_id:
        query = query.filter(Conversation.session_id == session_id)

    conversations = query.order_by(Conversation.updated_at.desc()).limit(limit).all()

    # メッセージ数を追加
    result = []
    for conv in conversations:
        conv_dict = {
            "id": conv.id,
            "session_id": conv.session_id,
            "agent_id": conv.agent_id,
            "title": conv.title,
            "project_name": conv.project_name,
            "user_id": conv.user_id,
            "is_archived": conv.is_archived,
            "created_at": conv.created_at,
            "updated_at": conv.updated_at,
            "message_count": len(conv.messages)
        }
        result.append(conv_dict)

    return result


@router.get("/conversations/{conversation_id}", response_model=ConversationWithMessages)
async def get_conversation(conversation_id: int, db: Session = Depends(get_db)):
    """会話詳細取得（メッセージ含む）"""
    conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    return {
        "id": conversation.id,
        "session_id": conversation.session_id,
        "agent_id": conversation.agent_id,
        "title": conversation.title,
        "project_name": conversation.project_name,
        "user_id": conversation.user_id,
        "is_archived": conversation.is_archived,
        "created_at": conversation.created_at,
        "updated_at": conversation.updated_at,
        "message_count": len(conversation.messages),
        "messages": conversation.messages
    }


@router.delete("/conversations/{conversation_id}")
async def delete_conversation(conversation_id: int, db: Session = Depends(get_db)):
    """会話を削除"""
    conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    db.delete(conversation)
    db.commit()
    return {"success": True, "message": "Conversation deleted"}


@router.put("/conversations/{conversation_id}/archive")
async def archive_conversation(conversation_id: int, db: Session = Depends(get_db)):
    """会話をアーカイブ"""
    conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    conversation.is_archived = True
    db.commit()
    return {"success": True, "message": "Conversation archived"}


# ========== メッセージAPI ==========

@router.post("/conversations/{conversation_id}/messages", response_model=MessageResponse)
async def add_message(
    conversation_id: int,
    message: MessageCreate,
    db: Session = Depends(get_db)
):
    """メッセージを追加"""
    conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # メッセージ作成
    db_message = ChatMessage(
        conversation_id=conversation_id,
        role=message.role,
        content=message.content,
        token_count=message.token_count
    )
    db.add(db_message)
    db.flush()  # IDを取得

    # 添付ファイルがあれば追加
    if message.attachments:
        for attachment in message.attachments:
            db_attachment = MessageAttachment(
                message_id=db_message.id,
                **attachment.model_dump()
            )
            db.add(db_attachment)

    # 会話のタイトルを更新（最初のユーザーメッセージから）
    if message.role == "user" and not conversation.title:
        conversation.title = message.content[:50] + ("..." if len(message.content) > 50 else "")

    db.commit()
    db.refresh(db_message)
    return db_message


# ========== 一括保存API ==========

@router.post("/save", response_model=ConversationWithMessages)
async def save_chat(request: SaveChatRequest, db: Session = Depends(get_db)):
    """チャット全体を一括保存"""

    # 既存の会話を検索（session_id + agent_idで）
    existing = db.query(Conversation).filter(
        Conversation.session_id == request.session_id,
        Conversation.agent_id == request.agent_id
    ).first()

    if existing:
        # 既存の会話を更新
        conversation = existing
        # 既存メッセージを削除して新しいものに置き換え
        db.query(ChatMessage).filter(ChatMessage.conversation_id == conversation.id).delete()
    else:
        # 新しい会話を作成
        conversation = Conversation(
            session_id=request.session_id,
            agent_id=request.agent_id,
            title=request.title,
            project_name=request.project_name
        )
        db.add(conversation)
        db.flush()

    # タイトルを更新
    if request.title:
        conversation.title = request.title
    elif request.messages:
        first_user_msg = next((m for m in request.messages if m.role == "user"), None)
        if first_user_msg:
            conversation.title = first_user_msg.content[:50] + ("..." if len(first_user_msg.content) > 50 else "")

    # メッセージを追加
    for msg in request.messages:
        db_message = ChatMessage(
            conversation_id=conversation.id,
            role=msg.role,
            content=msg.content,
            token_count=msg.token_count
        )
        db.add(db_message)
        db.flush()

        # 添付ファイル
        if msg.attachments:
            for attachment in msg.attachments:
                db_attachment = MessageAttachment(
                    message_id=db_message.id,
                    **attachment.model_dump()
                )
                db.add(db_attachment)

    db.commit()
    db.refresh(conversation)

    return {
        "id": conversation.id,
        "session_id": conversation.session_id,
        "agent_id": conversation.agent_id,
        "title": conversation.title,
        "project_name": conversation.project_name,
        "user_id": conversation.user_id,
        "is_archived": conversation.is_archived,
        "created_at": conversation.created_at,
        "updated_at": conversation.updated_at,
        "message_count": len(conversation.messages),
        "messages": conversation.messages
    }


# ========== 検索API ==========

@router.get("/search")
async def search_messages(
    q: str = Query(..., min_length=1, description="検索キーワード"),
    agent_id: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """メッセージを全文検索"""
    query = db.query(ChatMessage).join(Conversation)

    if agent_id:
        query = query.filter(Conversation.agent_id == agent_id)

    # 簡易的な全文検索
    messages = query.filter(
        ChatMessage.content.ilike(f"%{q}%")
    ).order_by(ChatMessage.created_at.desc()).limit(limit).all()

    results = []
    for msg in messages:
        results.append({
            "message_id": msg.id,
            "conversation_id": msg.conversation_id,
            "role": msg.role,
            "content": msg.content[:200] + ("..." if len(msg.content) > 200 else ""),
            "created_at": msg.created_at,
            "conversation_title": msg.conversation.title,
            "agent_id": msg.conversation.agent_id
        })

    return {"results": results, "count": len(results)}


# ========== 統計API ==========

@router.get("/stats")
async def get_chat_stats(db: Session = Depends(get_db)):
    """チャット統計を取得"""
    from sqlalchemy import func

    total_conversations = db.query(Conversation).count()
    total_messages = db.query(ChatMessage).count()

    # エージェント別統計
    agent_stats = db.query(
        Conversation.agent_id,
        func.count(Conversation.id).label("conversation_count")
    ).group_by(Conversation.agent_id).all()

    # ロール別メッセージ数
    role_stats = db.query(
        ChatMessage.role,
        func.count(ChatMessage.id).label("message_count")
    ).group_by(ChatMessage.role).all()

    return {
        "total_conversations": total_conversations,
        "total_messages": total_messages,
        "by_agent": {stat.agent_id: stat.conversation_count for stat in agent_stats},
        "by_role": {stat.role: stat.message_count for stat in role_stats}
    }

"""チャットAPIルーター（WebSocket対応）"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import List
import json

from models.schemas import ChatRequest, ChatResponse, SimpleChatRequest, SimpleChatResponse
from services.rag_service import rag_service
from services.llm_service import llm_service

router = APIRouter()


# WebSocket接続管理
class ConnectionManager:
    """WebSocket接続マネージャー"""

    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def send_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)


manager = ConnectionManager()


@router.post("/simple-chat", response_model=SimpleChatResponse)
async def simple_chat(request: SimpleChatRequest):
    """シンプルチャットAPI - テキストを入力して返信を取得"""
    result = await llm_service.chat(
        agent_id="analysis",
        messages=[{"role": "user", "content": request.message}]
    )

    return SimpleChatResponse(
        success=result.get("success", True),
        input=request.message,
        response=result.get("message", ""),
        usage=result.get("usage")
    )


@router.post("/simple-chat/mock", response_model=SimpleChatResponse)
async def simple_chat_mock(request: SimpleChatRequest):
    """モックチャットAPI - APIを使わずにテスト用レスポンスを返す"""
    # 入力に基づいたモックレスポンスを生成
    mock_responses = {
        "こんにちは": "こんにちは！何かお手伝いできることはありますか？",
        "hello": "Hello! How can I help you today?",
        "Python": "Python開発経験者を検索しました。田中太郎さん（5年）、鈴木花子さん（3年）が見つかりました。",
        "テスト": "テストメッセージを受信しました。システムは正常に動作しています。",
    }

    # キーワードマッチでレスポンスを選択
    response_text = "メッセージを受信しました。これはモックレスポンスです。"
    for keyword, resp in mock_responses.items():
        if keyword.lower() in request.message.lower():
            response_text = resp
            break

    return SimpleChatResponse(
        success=True,
        input=request.message,
        response=response_text,
        usage={"model": "mock", "prompt_tokens": 0, "completion_tokens": 0}
    )


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """チャットAPI（非ストリーミング・画像対応）"""
    messages = [
        {
            "role": msg.role.value,
            "content": msg.content,
            "images": msg.images or []
        }
        for msg in request.messages
    ]

    result = await rag_service.chat_with_rag(
        agent_id=request.agent_id.value,
        messages=messages,
        use_rag=request.use_rag
    )

    return ChatResponse(
        success=result.get("success", True),
        message=result.get("message", ""),
        sources=result.get("sources"),
        usage=result.get("usage")
    )


@router.websocket("/ws/chat/{agent_id}")
async def websocket_chat(websocket: WebSocket, agent_id: str):
    """WebSocketチャット（ストリーミング）"""
    await manager.connect(websocket)

    try:
        while True:
            # クライアントからメッセージ受信
            data = await websocket.receive_text()
            request_data = json.loads(data)

            messages = request_data.get("messages", [])
            use_rag = request_data.get("use_rag", True)

            # ストリーミング開始を通知
            await manager.send_message(
                json.dumps({"type": "start"}),
                websocket
            )

            # ストリーミング応答
            full_response = ""
            async for token in rag_service.chat_with_rag_stream(
                agent_id=agent_id,
                messages=messages,
                use_rag=use_rag
            ):
                full_response += token
                await manager.send_message(
                    json.dumps({"type": "token", "content": token}),
                    websocket
                )

            # 完了通知
            await manager.send_message(
                json.dumps({
                    "type": "end",
                    "content": full_response
                }),
                websocket
            )

    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        await manager.send_message(
            json.dumps({"type": "error", "message": str(e)}),
            websocket
        )
        manager.disconnect(websocket)

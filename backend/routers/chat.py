"""チャットAPIルーター（WebSocket対応）"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import List
import json

from models.schemas import ChatRequest, ChatResponse
from services.rag_service import rag_service

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


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """チャットAPI（非ストリーミング）"""
    messages = [
        {"role": msg.role.value, "content": msg.content}
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

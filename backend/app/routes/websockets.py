from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from app.ws_manager import manager
from app.config import settings
import jwt
import logging

router = APIRouter(tags=["WebSockets"])
logger = logging.getLogger(__name__)

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str = Query(None)):
    user_id = None
    if token:
        try:
            payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
            user_id = payload.get("sub")
        except Exception as e:
            logger.warning(f"WebSocket token decode failed: {e}")

    await manager.connect(websocket, user_id)
    try:
        while True:
            data = await websocket.receive_text()
            # Handle client messages if needed (e.g. ping/pong)
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)

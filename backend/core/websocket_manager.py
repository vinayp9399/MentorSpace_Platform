from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from typing import Dict, List
import json
from datetime import datetime

router = APIRouter()


class ConnectionManager:
    def __init__(self):
        # session_id -> list of (websocket, user_id, user_name, role)
        self.active_connections: Dict[str, List[dict]] = {}

    async def connect(self, session_id: str, websocket: WebSocket, user_id: str, user_name: str, role: str):
        await websocket.accept()
        if session_id not in self.active_connections:
            self.active_connections[session_id] = []
        self.active_connections[session_id].append({
            "ws": websocket,
            "user_id": user_id,
            "user_name": user_name,
            "role": role
        })
        # Notify others
        await self.broadcast(session_id, {
            "type": "system",
            "message": f"{user_name} joined the session",
            "timestamp": datetime.utcnow().isoformat()
        }, exclude_ws=websocket)

    def disconnect(self, session_id: str, websocket: WebSocket):
        if session_id in self.active_connections:
            conn = next((c for c in self.active_connections[session_id] if c["ws"] == websocket), None)
            if conn:
                self.active_connections[session_id].remove(conn)
                return conn.get("user_name", "User")
        return "User"

    async def broadcast(self, session_id: str, message: dict, exclude_ws: WebSocket = None):
        if session_id not in self.active_connections:
            return
        dead = []
        for conn in self.active_connections[session_id]:
            if conn["ws"] == exclude_ws:
                continue
            try:
                await conn["ws"].send_json(message)
            except Exception:
                dead.append(conn)
        for d in dead:
            self.active_connections[session_id].remove(d)

    async def send_to(self, session_id: str, websocket: WebSocket, message: dict):
        try:
            await websocket.send_json(message)
        except Exception:
            pass

    def get_participants(self, session_id: str) -> List[dict]:
        if session_id not in self.active_connections:
            return []
        return [{"user_id": c["user_id"], "user_name": c["user_name"], "role": c["role"]}
                for c in self.active_connections[session_id]]


manager = ConnectionManager()


@router.websocket("/ws/{session_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    session_id: str,
    user_id: str = Query(...),
    user_name: str = Query(...),
    role: str = Query(default="student")
):
    await manager.connect(session_id, websocket, user_id, user_name, role)

    # Send current participants list
    await manager.send_to(session_id, websocket, {
        "type": "participants",
        "participants": manager.get_participants(session_id)
    })

    # Broadcast updated participant list to all
    await manager.broadcast(session_id, {
        "type": "participants",
        "participants": manager.get_participants(session_id)
    })

    try:
        while True:
            raw = await websocket.receive_text()
            data = json.loads(raw)
            msg_type = data.get("type")

            if msg_type == "code_update":
                # Real-time code sync - broadcast to others only
                await manager.broadcast(session_id, {
                    "type": "code_update",
                    "code": data.get("code"),
                    "cursor": data.get("cursor"),
                    "sender_id": user_id,
                    "sender_name": user_name
                }, exclude_ws=websocket)

            elif msg_type == "chat":
                # Chat message - broadcast to all including sender
                await manager.broadcast(session_id, {
                    "type": "chat",
                    "message": data.get("message"),
                    "sender_id": user_id,
                    "sender_name": user_name,
                    "role": role,
                    "timestamp": datetime.utcnow().isoformat()
                })
                await manager.send_to(session_id, websocket, {
                    "type": "chat",
                    "message": data.get("message"),
                    "sender_id": user_id,
                    "sender_name": user_name,
                    "role": role,
                    "timestamp": datetime.utcnow().isoformat(),
                    "is_self": True
                })

            elif msg_type == "language_change":
                await manager.broadcast(session_id, {
                    "type": "language_change",
                    "language": data.get("language"),
                    "changed_by": user_name
                }, exclude_ws=websocket)

            # WebRTC signaling
            elif msg_type in ("offer", "answer", "ice_candidate"):
                target_id = data.get("target_id")
                # Find target connection and forward
                if session_id in manager.active_connections:
                    for conn in manager.active_connections[session_id]:
                        if conn["user_id"] == target_id:
                            await manager.send_to(session_id, conn["ws"], {
                                **data,
                                "from_id": user_id,
                                "from_name": user_name
                            })
                            break

            elif msg_type == "ping":
                await manager.send_to(session_id, websocket, {"type": "pong"})

    except WebSocketDisconnect:
        user_name_left = manager.disconnect(session_id, websocket)
        await manager.broadcast(session_id, {
            "type": "system",
            "message": f"{user_name_left} left the session",
            "timestamp": datetime.utcnow().isoformat()
        })
        await manager.broadcast(session_id, {
            "type": "participants",
            "participants": manager.get_participants(session_id)
        })

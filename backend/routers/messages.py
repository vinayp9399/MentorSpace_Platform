from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session as DBSession
from pydantic import BaseModel
from core.database import get_db
from core.auth import get_current_user
from models.models import Message, Session, User

router = APIRouter()


class SaveMessageRequest(BaseModel):
    session_id: str
    content: str
    message_type: str = "chat"  # chat | code | system


@router.post("/save")
def save_message(
    data: SaveMessageRequest,
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    session = db.query(Session).filter(Session.id == data.session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    msg = Message(
        session_id=session.id,
        sender_id=current_user.id,
        content=data.content,
        message_type=data.message_type
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return {"id": str(msg.id), "saved": True}


@router.get("/{session_id}")
def get_messages(
    session_id: str,
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    messages = db.query(Message).filter(Message.session_id == session_id).order_by(Message.timestamp).all()
    return [
        {
            "id": str(m.id),
            "content": m.content,
            "message_type": m.message_type,
            "sender_id": str(m.sender_id) if m.sender_id else None,
            "sender_name": m.sender.full_name if m.sender else "System",
            "timestamp": m.timestamp.isoformat()
        }
        for m in messages
    ]

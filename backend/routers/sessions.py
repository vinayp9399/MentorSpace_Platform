from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session as DBSession
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from core.database import get_db
from core.auth import get_current_user
from models.models import Session, User, SessionStatus, UserRole
import uuid

router = APIRouter()


class CreateSessionRequest(BaseModel):
    title: str
    scheduled_at: datetime
    duration_minutes: str = "60"
    language: str = "javascript"
    initial_code: str = "// Start coding here\n"


class JoinSessionRequest(BaseModel):
    invite_token: str


def session_to_dict(s: Session, include_users: bool = True) -> dict:
    data = {
        "id": str(s.id),
        "title": s.title,
        "status": s.status.value,
        "scheduled_at": s.scheduled_at.isoformat(),
        "duration_minutes": s.duration_minutes,
        "language": s.language,
        "initial_code": s.initial_code,
        "invite_token": s.invite_token,
        "created_at": s.created_at.isoformat(),
        "started_at": s.started_at.isoformat() if s.started_at else None,
        "ended_at": s.ended_at.isoformat() if s.ended_at else None,
    }
    if include_users and s.mentor:
        data["mentor"] = {"id": str(s.mentor.id), "full_name": s.mentor.full_name, "email": s.mentor.email}
    if include_users and s.student:
        data["student"] = {"id": str(s.student.id), "full_name": s.student.full_name, "email": s.student.email}
    return data


@router.post("/create")
def create_session(
    data: CreateSessionRequest,
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != UserRole.mentor:
        raise HTTPException(status_code=403, detail="Only mentors can create sessions")

    session = Session(
        title=data.title,
        mentor_id=current_user.id,
        scheduled_at=data.scheduled_at,
        duration_minutes=data.duration_minutes,
        language=data.language,
        initial_code=data.initial_code
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session_to_dict(session)


@router.post("/join")
def join_session(
    data: JoinSessionRequest,
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    session = db.query(Session).filter(Session.invite_token == data.invite_token).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.status == SessionStatus.ended:
        raise HTTPException(status_code=400, detail="Session has ended")

    if current_user.role == UserRole.student and not session.student_id:
        session.student_id = current_user.id

    if session.status == SessionStatus.scheduled:
        session.status = SessionStatus.active
        session.started_at = datetime.utcnow()

    db.commit()
    db.refresh(session)
    return session_to_dict(session)


@router.post("/{session_id}/end")
def end_session(
    session_id: str,
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    session = db.query(Session).filter(Session.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if str(session.mentor_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Only the mentor can end the session")

    session.status = SessionStatus.ended
    session.ended_at = datetime.utcnow()
    db.commit()
    db.refresh(session)
    return session_to_dict(session)


@router.get("/my")
def my_sessions(
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role == UserRole.mentor:
        sessions = db.query(Session).filter(Session.mentor_id == current_user.id).order_by(Session.scheduled_at.desc()).all()
    # else:
    #     sessions = db.query(Session).filter(Session.student_id == current_user.id).order_by(Session.scheduled_at.desc()).all()
    return [session_to_dict(s) for s in sessions]


@router.get("/by-token/{invite_token}")
def get_by_token(invite_token: str, db: DBSession = Depends(get_db)):
    session = db.query(Session).filter(Session.invite_token == invite_token).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session_to_dict(session)


@router.get("/{session_id}")
def get_session(
    session_id: str,
    db: DBSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    session = db.query(Session).filter(Session.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session_to_dict(session)

from sqlalchemy import Column, String, DateTime, Enum, Text, ForeignKey, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
import uuid
import enum
from datetime import datetime

Base = declarative_base()


class UserRole(str, enum.Enum):
    mentor = "mentor"
    student = "student"


class SessionStatus(str, enum.Enum):
    scheduled = "scheduled"
    active = "active"
    ended = "ended"


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    role = Column(Enum(UserRole), nullable=False)
    avatar_url = Column(String, nullable=True)
    bio = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    mentor_sessions = relationship("Session", back_populates="mentor", foreign_keys="Session.mentor_id")
    student_sessions = relationship("Session", back_populates="student", foreign_keys="Session.student_id")
    messages = relationship("Message", back_populates="sender")


class Session(Base):
    __tablename__ = "sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String, nullable=False)
    mentor_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    student_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    status = Column(Enum(SessionStatus), default=SessionStatus.scheduled)
    scheduled_at = Column(DateTime, nullable=False)
    duration_minutes = Column(String, default="60")
    language = Column(String, default="javascript")
    initial_code = Column(Text, default="// Start coding here\n")
    invite_token = Column(String, unique=True, default=lambda: str(uuid.uuid4()))
    created_at = Column(DateTime, default=datetime.utcnow)
    started_at = Column(DateTime, nullable=True)
    ended_at = Column(DateTime, nullable=True)

    mentor = relationship("User", back_populates="mentor_sessions", foreign_keys=[mentor_id])
    student = relationship("User", back_populates="student_sessions", foreign_keys=[student_id])
    messages = relationship("Message", back_populates="session")
    snapshots = relationship("CodeSnapshot", back_populates="session")


class Message(Base):
    __tablename__ = "messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey("sessions.id"), nullable=False)
    sender_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    content = Column(Text, nullable=False)
    message_type = Column(String, default="chat")  # chat | code | system
    timestamp = Column(DateTime, default=datetime.utcnow)

    session = relationship("Session", back_populates="messages")
    sender = relationship("User", back_populates="messages")


class CodeSnapshot(Base):
    __tablename__ = "code_snapshots"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey("sessions.id"), nullable=False)
    code = Column(Text, nullable=False)
    language = Column(String, default="javascript")
    saved_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("Session", back_populates="snapshots")

"""Submission model for quest photo submissions."""
from sqlalchemy import Column, String, Text, Integer, Float, DateTime, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from geoalchemy2 import Geography
from app.database import Base
from app.models.quest import EnumValueType
import uuid
import enum


class SubmissionStatus(str, enum.Enum):
    """Submission status options."""
    PENDING = "pending"
    PROCESSING = "processing"
    AI_REVIEW = "ai_review"
    PENDING_REVIEW = "pending_review"
    VERIFIED = "verified"
    REJECTED = "rejected"


class Submission(Base):
    """Submission model for quest photo submissions."""
    
    __tablename__ = "submissions"
    
    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True
    )
    quest_id = Column(
        UUID(as_uuid=True),
        ForeignKey("quests.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    explorer_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    
    # Image storage
    image_url_full = Column(String(500), nullable=False)
    capture_method = Column(String(10), nullable=False, default="live")  # "live" or "upload"
    gemini_result = Column(JSONB, nullable=True)
    
    # Location data
    captured_location = Column(
        Geography(geometry_type="POINT", srid=4326),
        nullable=False
    )
    captured_accuracy = Column(Float, nullable=True)  # GPS accuracy in meters
    captured_at = Column(DateTime(timezone=True), nullable=False)
    
    # Verification results
    verification_result = Column(JSONB, nullable=True)  # Full verification details
    content_match_score = Column(Integer, nullable=True)  # 0-100, nullable for now (AI matching later)
    quality_score = Column(Integer, nullable=True)  # 0-100
    faces_detected = Column(Integer, default=0, nullable=False)
    faces_blurred = Column(Integer, default=0, nullable=False)
    
    # Status
    status = Column(
        EnumValueType(SubmissionStatus),
        nullable=False,
        default=SubmissionStatus.PENDING
    )
    rejection_reason = Column(Text, nullable=True)
    
    # Timestamps
    submitted_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Relationships
    quest = relationship("Quest", backref="submissions")
    explorer = relationship("User", backref="submissions")
    
    __table_args__ = (
        # Indexes for common queries (users may submit multiple photos per quest)
        Index('idx_submissions_status', 'status'),
        Index('idx_submissions_quest_status', 'quest_id', 'status'),
    )

"""Quest model for location-based quests."""
from sqlalchemy import Column, String, Text, Integer, Boolean, DateTime, ForeignKey, Enum as SQLEnum, TypeDecorator
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from geoalchemy2 import Geography
from app.database import Base
import uuid
import enum


class QuestVisibility(str, enum.Enum):
    """Quest visibility options."""
    PUBLIC = "public"
    PRIVATE = "private"


class QuestStatus(str, enum.Enum):
    """Quest status options."""
    DRAFT = "draft"
    ACTIVE = "active"
    COMPLETED = "completed"
    ARCHIVED = "archived"


class QuestParticipantStatus(str, enum.Enum):
    """Quest participant status options."""
    JOINED = "joined"
    COMPLETED = "completed"
    LEFT = "left"


class EnumValueType(TypeDecorator):
    """TypeDecorator that ensures enum VALUES (not names) are stored in database."""
    impl = String
    cache_ok = True
    
    def __init__(self, enum_class, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.enum_class = enum_class
    
    def process_bind_param(self, value, dialect):
        """Convert enum to its VALUE (lowercase string) when binding to database."""
        if value is None:
            return None
        if isinstance(value, enum.Enum):
            # Use the enum VALUE, not the name
            return value.value
        # If it's already a string, return as-is
        return str(value)
    
    def process_result_value(self, value, dialect):
        """Convert database value back to enum when reading."""
        if value is None:
            return None
        return self.enum_class(value)


class Quest(Base):
    """Quest model for location-based quests."""
    
    __tablename__ = "quests"
    
    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True
    )
    creator_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    
    # Location (PostGIS geography point)
    location = Column(
        Geography(geometry_type="POINT", srid=4326),
        nullable=False
    )
    
    # Quest details
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    radius_meters = Column(Integer, nullable=False, default=50)
    
    # Quest settings
    # Use EnumValueType to ensure enum VALUES (lowercase) are stored, not enum names
    visibility = Column(
        EnumValueType(QuestVisibility),
        nullable=False,
        default=QuestVisibility.PUBLIC
    )
    photo_count = Column(Integer, nullable=False, default=1)
    
    # Quest type
    is_paid = Column(Boolean, nullable=False, default=False)
    
    # Shareable slug for URLs
    slug = Column(String(255), unique=True, nullable=True, index=True)
    
    # Dates
    start_date = Column(DateTime(timezone=True), nullable=True)
    end_date = Column(DateTime(timezone=True), nullable=True)
    
    # Status
    status = Column(
        EnumValueType(QuestStatus),
        nullable=False,
        default=QuestStatus.ACTIVE
    )
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)
    
    # Relationships
    creator = relationship("User", backref="quests")
    participants = relationship("QuestParticipant", back_populates="quest", cascade="all, delete-orphan")
class QuestParticipant(Base):
    """Quest participant model for tracking users who join quests."""
    
    __tablename__ = "quest_participants"
    
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
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    status = Column(
        EnumValueType(QuestParticipantStatus),
        nullable=False,
        default=QuestParticipantStatus.JOINED
    )
    joined_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Relationships
    quest = relationship("Quest", back_populates="participants")
    user = relationship("User", backref="quest_participations")
    
    __table_args__ = (
        # Unique constraint: one participation per user per quest
        {"comment": "Tracks users who have joined quests"}
    )
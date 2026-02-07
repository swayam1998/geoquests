"""Quest Pydantic schemas for request/response validation."""
from pydantic import BaseModel, Field, field_validator
from uuid import UUID
from datetime import datetime
from typing import Optional
from app.models.quest import QuestVisibility


class QuestLocation(BaseModel):
    """Location coordinates."""
    lat: float = Field(..., ge=-90, le=90, description="Latitude")
    lng: float = Field(..., ge=-180, le=180, description="Longitude")


class QuestCreate(BaseModel):
    """Schema for creating a new quest."""
    title: str = Field(..., min_length=1, max_length=200, description="Quest title")
    description: str = Field(..., min_length=1, description="Quest description")
    lat: float = Field(..., ge=-90, le=90, description="Latitude")
    lng: float = Field(..., ge=-180, le=180, description="Longitude")
    radius_meters: int = Field(..., ge=10, le=1000, description="Radius in meters")
    visibility: QuestVisibility = Field(default=QuestVisibility.PUBLIC, description="Quest visibility")
    photo_count: int = Field(default=1, ge=1, le=5, description="Number of photos required")
    is_paid: bool = Field(default=False, description="Whether this is a paid quest (disabled for now)")
    start_date: Optional[datetime] = Field(default=None, description="Quest start date (only for paid quests)")
    end_date: Optional[datetime] = Field(default=None, description="Quest end date (only for paid quests)")
    
    @field_validator("end_date")
    @classmethod
    def validate_end_date(cls, v, info):
        """Ensure end_date is after start_date if both are provided."""
        if v is not None:
            start_date = info.data.get("start_date")
            if start_date is not None and v <= start_date:
                raise ValueError("end_date must be after start_date")
        return v
    
    @field_validator("is_paid")
    @classmethod
    def validate_is_paid(cls, v):
        """For now, paid quests are disabled."""
        if v is True:
            raise ValueError("Paid quests are not yet enabled")
        return False


class QuestResponse(BaseModel):
    """Schema for quest response."""
    id: UUID
    creator_id: UUID
    title: str
    description: str
    location: QuestLocation
    radius_meters: int
    visibility: QuestVisibility
    photo_count: int
    is_paid: bool
    slug: Optional[str] = None
    share_link: Optional[str] = None
    participant_count: int = 0
    has_joined: Optional[bool] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    status: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    model_config = {"from_attributes": True}


class QuestShareResponse(BaseModel):
    """Schema for quest share link response."""
    share_link: str
    can_share: bool

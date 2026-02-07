"""Submission Pydantic schemas for request/response validation."""
from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime
from typing import Optional, Dict, Any


class LocationData(BaseModel):
    """Location data for submission."""
    lat: float = Field(..., ge=-90, le=90, description="Latitude")
    lng: float = Field(..., ge=-180, le=180, description="Longitude")
    accuracy: Optional[float] = Field(None, ge=0, description="GPS accuracy in meters")


class SubmissionCreate(BaseModel):
    """Schema for creating a new submission."""
    quest_id: UUID = Field(..., description="Quest ID")
    location: LocationData = Field(..., description="Location where photo was captured")
    captured_at: datetime = Field(..., description="Timestamp when photo was captured")


class VerificationResult(BaseModel):
    """Verification result details."""
    gps_verified: bool
    distance_meters: float
    gps_reason: str
    quality_score: int
    is_blurry: bool
    is_too_dark: bool
    is_too_small: bool
    faces_detected: int
    faces_blurred: int
    exif_validated: Optional[bool] = None
    exif_reason: Optional[str] = None


class SubmissionResponse(BaseModel):
    """Schema for submission response."""
    id: UUID
    quest_id: UUID
    explorer_id: UUID
    image_url: str
    captured_location: Dict[str, float]  # {lat, lng}
    captured_accuracy: Optional[float]
    captured_at: datetime
    verification_result: Optional[Dict[str, Any]]
    content_match_score: Optional[int]
    quality_score: Optional[int]
    faces_detected: int
    faces_blurred: int
    status: str
    rejection_reason: Optional[str]
    submitted_at: datetime
    
    model_config = {"from_attributes": True}


class SubmissionRejection(BaseModel):
    """Schema for submission rejection error response."""
    error: str = Field(..., description="Error type")
    code: str = Field(..., description="Error code")
    message: str = Field(..., description="Error message")
    details: Optional[Dict[str, Any]] = Field(None, description="Additional error details")

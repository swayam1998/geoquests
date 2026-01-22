"""Authentication Pydantic schemas."""
from pydantic import BaseModel, EmailStr
from typing import Optional


class MagicLinkRequest(BaseModel):
    """Schema for requesting a magic link."""
    email: EmailStr


class TokenResponse(BaseModel):
    """Schema for JWT token response."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshTokenRequest(BaseModel):
    """Schema for refresh token request."""
    refresh_token: str


class OAuthCallback(BaseModel):
    """Schema for OAuth callback."""
    code: str
    state: Optional[str] = None

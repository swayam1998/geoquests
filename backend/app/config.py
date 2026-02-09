"""Application configuration settings."""
from pydantic import field_validator
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Server (Railway sets PORT)
    PORT: int = 8000

    # Database
    DATABASE_URL: str = "postgresql://geoquests:geoquests_dev@localhost:5432/geoquests"

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def normalize_database_url(cls, v: str) -> str:
        """Strip whitespace and normalize postgres:// to postgresql:// (e.g. Railway)."""
        if not v:
            return v
        v = v.strip()
        if v.startswith("postgres://"):
            v = v.replace("postgres://", "postgresql://", 1)
        return v
    
    # JWT
    SECRET_KEY: str = "dev-secret-key-change-in-production-min-32-chars"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # OAuth - Google
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/api/v1/auth/google/callback"
    
    # Magic Link
    MAGIC_LINK_SECRET_KEY: str = "dev-magic-link-secret-change-in-production"
    MAGIC_LINK_EXPIRE_MINUTES: int = 15
    FRONTEND_URL: str = "http://localhost:3000"
    
    # Email (Resend)
    RESEND_API_KEY: str = ""
    RESEND_FROM_EMAIL: str = "noreply@resend.dev"
    
    # Image uploads
    UPLOAD_DIR: str = "uploads"
    MAX_IMAGE_SIZE_MB: int = 10
    ALLOWED_IMAGE_TYPES: list = ["image/jpeg", "image/png", "image/jpg"]
    API_URL: str = "http://localhost:8000"
    
    # Gemini AI verification (https://ai.google.dev/gemini-api/docs/models)
    GEMINI_API_KEY: str = ""
    # Model: gemini-2.0-flash, gemini-2.5-flash, gemini-3-flash-preview, or gemini-3-pro-preview
    GEMINI_MODEL: str = "gemini-2.5-flash"
    # Gemini 3 only: "LOW", "MEDIUM", "HIGH" (empty or "OFF" = disabled). Better reasoning, more tokens/time.
    GEMINI_THINKING_LEVEL: str = ""
    # Minimum content_match_score (0-100) to accept a photo. Below this, submission is rejected for content mismatch.
    GEMINI_CONTENT_MATCH_MIN_SCORE: int = 15

    # CORS: comma-separated list of extra origins (e.g. staging URL). FRONTEND_URL is always allowed.
    CORS_ORIGINS: str = ""

    class Config:
        env_file = ".env"
        case_sensitive = True
        # Allow missing values for development (will fail in production)
        extra = "ignore"


settings = Settings()

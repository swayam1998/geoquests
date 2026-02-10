"""Application configuration settings."""
import os
import sys
from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings
from typing import Optional

# Default for LOCAL development only: Docker Postgres from docker-compose.yml.
# Do NOT put your production (Railway) DATABASE_URL in backend/.env when developing
# locally, or you will hit the production database from your machine.
LOCAL_DEV_DATABASE_URL = "postgresql://geoquests:geoquests_dev@localhost:5432/geoquests"


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Server (Railway sets PORT)
    PORT: int = 8000

    # Database:
    # - Local dev: leave unset in .env so this default is used (Docker Postgres via docker-compose).
    # - Production: Railway sets DATABASE_URL in the dashboard; never commit that URL to .env.
    DATABASE_URL: str = LOCAL_DEV_DATABASE_URL

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

    @model_validator(mode="after")
    def warn_if_production_db_used_locally(self) -> "Settings":
        """Warn when DATABASE_URL looks like production but we're running locally (not on Railway)."""
        url = (self.DATABASE_URL or "").lower()
        is_likely_production = any(
            x in url for x in ("railway", "neon.tech", "supabase.co", ".up.railway.app")
        )
        is_local = not os.environ.get("RAILWAY_ENVIRONMENT") and not os.environ.get("RAILWAY_DEPLOYMENT_ID")
        if is_likely_production and is_local:
            msg = (
                "\n*** WARNING: You are using a PRODUCTION database URL while running locally. ***\n"
                "Local changes will affect production. For local dev, use the Docker database:\n"
                "  1. Do NOT set DATABASE_URL in backend/.env (or set it to the local URL below).\n"
                "  2. Start Docker Postgres: docker compose up -d db\n"
                "  Local URL: postgresql://geoquests:geoquests_dev@localhost:5432/geoquests\n"
            )
            print(msg, file=sys.stderr)
        return self
    
    # JWT (must set SECRET_KEY in production)
    SECRET_KEY: str = "dev-secret-key-change-in-production-min-32-chars"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # OAuth - Google
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/api/v1/auth/google/callback"
    
    # Magic Link (must set MAGIC_LINK_SECRET_KEY in production)
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
    GEMINI_MODEL: str = "gemini-3-flash-preview"
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

"""Application configuration settings."""
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Database
    DATABASE_URL: str = "postgresql://geoquests:geoquests_dev@localhost:5432/geoquests"
    
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
    
    class Config:
        env_file = ".env"
        case_sensitive = True
        # Allow missing values for development (will fail in production)
        extra = "ignore"


settings = Settings()

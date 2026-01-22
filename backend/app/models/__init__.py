"""Database models."""
from app.models.user import User, OAuthAccount, MagicLinkToken

__all__ = ["User", "OAuthAccount", "MagicLinkToken"]

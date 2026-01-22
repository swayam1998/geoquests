"""Magic link (passwordless email) authentication."""
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.config import settings
from app.models.user import User, MagicLinkToken
from app.services.email import send_magic_link_email
import secrets


def generate_magic_link_token(email: str) -> str:
    """Generate secure magic link token.
    
    Args:
        email: User's email address
        
    Returns:
        Secure random token string
    """
    # Generate cryptographically secure random token
    token = secrets.token_urlsafe(32)
    return token


async def send_magic_link(db: Session, email: str) -> None:
    """Generate and send magic link email.
    
    Args:
        db: Database session
        email: User's email address
        
    Raises:
        HTTPException: If email sending fails
    """
    # Generate token
    token = generate_magic_link_token(email)
    
    # Calculate expiration
    expires_at = datetime.utcnow() + timedelta(minutes=settings.MAGIC_LINK_EXPIRE_MINUTES)
    
    # Store token in database
    magic_link = MagicLinkToken(
        email=email,
        token=token,
        expires_at=expires_at
    )
    db.add(magic_link)
    db.commit()
    
    # Create magic link URL
    magic_link_url = f"{settings.FRONTEND_URL}/auth/verify?token={token}"
    
    # Send email
    try:
        await send_magic_link_email(email, magic_link_url)
    except Exception as e:
        # If email fails, we should still save the token (user can request again)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send magic link email: {str(e)}"
        )


async def verify_magic_link(db: Session, token: str) -> User:
    """Verify magic link token and return/create user.
    
    Args:
        db: Database session
        token: Magic link token to verify
        
    Returns:
        User object (created or existing)
        
    Raises:
        HTTPException: If token is invalid, expired, or already used
    """
    # Find token
    magic_link = db.query(MagicLinkToken).filter(
        MagicLinkToken.token == token,
        MagicLinkToken.used == False,
        MagicLinkToken.expires_at > datetime.utcnow()
    ).first()
    
    if not magic_link:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired magic link"
        )
    
    # Mark token as used
    magic_link.used = True
    
    # Find or create user
    user = db.query(User).filter(User.email == magic_link.email).first()
    
    if not user:
        user = User(
            email=magic_link.email,
            is_verified=True  # Magic link = verified email
        )
        db.add(user)
    else:
        # Update existing user to be verified (magic link confirms email)
        user.is_verified = True
    
    db.commit()
    db.refresh(user)
    return user

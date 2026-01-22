"""OAuth authentication handlers."""
from httpx_oauth.clients.google import GoogleOAuth2
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.config import settings
from app.models.user import User, OAuthAccount
import httpx
from typing import Tuple, Dict, Any
from datetime import datetime, timezone


# Initialize Google OAuth client
google_oauth_client = GoogleOAuth2(
    client_id=settings.GOOGLE_CLIENT_ID,
    client_secret=settings.GOOGLE_CLIENT_SECRET,
)


async def get_authorization_url() -> Tuple[str, str]:
    """Get Google OAuth authorization URL.
    
    Returns:
        Tuple of (authorization_url, state)
    """
    import secrets
    # Generate a random state for CSRF protection
    state = secrets.token_urlsafe(32)
    authorization_url = await google_oauth_client.get_authorization_url(
        redirect_uri=settings.GOOGLE_REDIRECT_URI,
        state=state
    )
    return authorization_url, state


async def get_access_token(code: str) -> Dict[str, Any]:
    """Exchange authorization code for access token.
    
    Args:
        code: Authorization code from OAuth callback
        
    Returns:
        Dictionary containing access_token, refresh_token, expires_at, etc.
        
    Raises:
        HTTPException: If token exchange fails
    """
    try:
        token = await google_oauth_client.get_access_token(
            code,
            redirect_uri=settings.GOOGLE_REDIRECT_URI
        )
        return token
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to get access token: {str(e)}"
        )


async def get_google_user_info(access_token: str) -> Dict[str, Any]:
    """Get user info from Google API.
    
    Args:
        access_token: Google OAuth access token
        
    Returns:
        Dictionary containing user info (email, name, picture, etc.)
        
    Raises:
        HTTPException: If API call fails
    """
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                headers={"Authorization": f"Bearer {access_token}"}
            )
            response.raise_for_status()
            return response.json()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to get user info from Google: {str(e)}"
        )


async def handle_google_oauth(db: Session, code: str) -> User:
    """Handle complete Google OAuth flow.
    
    This function:
    1. Exchanges code for access token
    2. Gets user info from Google
    3. Creates or updates user in database
    4. Links OAuth account to user
    
    Args:
        db: Database session
        code: Authorization code from OAuth callback
        
    Returns:
        User object (created or existing)
        
    Raises:
        HTTPException: If OAuth flow fails
    """
    # 1. Exchange code for token
    token_data = await get_access_token(code)
    access_token = token_data["access_token"]
    
    # 2. Get user info from Google
    google_user = await get_google_user_info(access_token)
    google_email = google_user["email"]
    google_id = google_user["id"]
    google_name = google_user.get("name", "")
    google_picture = google_user.get("picture", "")
    
    # 3. Check if OAuth account exists
    oauth_account = db.query(OAuthAccount).filter(
        OAuthAccount.provider == "google",
        OAuthAccount.provider_user_id == google_id
    ).first()
    
    if oauth_account:
        # Update tokens
        oauth_account.access_token = access_token
        oauth_account.refresh_token = token_data.get("refresh_token")
        if "expires_at" in token_data:
            # Convert Unix timestamp to datetime
            expires_at = token_data["expires_at"]
            if isinstance(expires_at, (int, float)):
                oauth_account.expires_at = datetime.fromtimestamp(expires_at, tz=timezone.utc)
            else:
                oauth_account.expires_at = expires_at
        user = oauth_account.user
    else:
        # Check if user exists by email
        user = db.query(User).filter(User.email == google_email).first()
        
        if not user:
            # Create new user
            user = User(
                email=google_email,
                display_name=google_name,
                avatar_url=google_picture,
                is_verified=True  # Google emails are verified
            )
            db.add(user)
            db.flush()  # Get user.id
        
        # Create OAuth account
        expires_at = None
        if "expires_at" in token_data:
            expires_at_value = token_data["expires_at"]
            # Convert Unix timestamp to datetime if needed
            if isinstance(expires_at_value, (int, float)):
                expires_at = datetime.fromtimestamp(expires_at_value, tz=timezone.utc)
            else:
                expires_at = expires_at_value
        
        oauth_account = OAuthAccount(
            user_id=user.id,
            provider="google",
            provider_user_id=google_id,
            access_token=access_token,
            refresh_token=token_data.get("refresh_token"),
            expires_at=expires_at
        )
        db.add(oauth_account)
    
    db.commit()
    db.refresh(user)
    return user

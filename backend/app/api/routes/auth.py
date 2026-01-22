"""Authentication API routes."""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.config import settings
from app.auth.oauth import get_authorization_url, handle_google_oauth
from app.auth.magic_link import send_magic_link, verify_magic_link
from app.auth.jwt import create_access_token, create_refresh_token, verify_token
from app.auth.dependencies import get_current_user
from app.schemas.auth import MagicLinkRequest, TokenResponse, RefreshTokenRequest
from app.schemas.user import UserResponse, UserUpdate
from app.models.user import User

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/google/authorize")
async def google_authorize():
    """Initiate Google OAuth flow.
    
    Redirects user to Google OAuth consent screen.
    """
    authorization_url, state = await get_authorization_url()
    return RedirectResponse(url=authorization_url)


@router.get("/google/callback")
async def google_callback(
    code: str,
    db: Session = Depends(get_db)
):
    """Handle Google OAuth callback.
    
    Args:
        code: Authorization code from Google
        db: Database session
        
    Returns:
        Redirect to frontend with tokens in query params
    """
    try:
        user = await handle_google_oauth(db, code)
        
        # Generate tokens
        access_token = create_access_token(data={"sub": str(user.id)})
        refresh_token = create_refresh_token(data={"sub": str(user.id)})
        
        # Redirect to frontend with tokens
        frontend_url = (
            f"{settings.FRONTEND_URL}/auth/callback"
            f"?access_token={access_token}&refresh_token={refresh_token}"
        )
        return RedirectResponse(url=frontend_url)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"OAuth error: {str(e)}"
        )


@router.post("/magic-link", status_code=status.HTTP_200_OK)
async def request_magic_link(
    request: MagicLinkRequest,
    db: Session = Depends(get_db)
):
    """Request magic link email.
    
    Args:
        request: Magic link request with email
        db: Database session
        
    Returns:
        Success message
    """
    await send_magic_link(db, request.email)
    return {"message": "Magic link sent to your email"}


@router.post("/magic-link/verify", response_model=TokenResponse)
async def verify_magic_link_token(
    token: str,
    db: Session = Depends(get_db)
):
    """Verify magic link token and return JWT tokens.
    
    Args:
        token: Magic link token from email
        db: Database session
        
    Returns:
        JWT access and refresh tokens
    """
    try:
        user = await verify_magic_link(db, token)
        
        # Generate tokens
        access_token = create_access_token(data={"sub": str(user.id)})
        refresh_token = create_refresh_token(data={"sub": str(user.id)})
        
        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    request: RefreshTokenRequest,
    db: Session = Depends(get_db)
):
    """Refresh access token using refresh token.
    
    Args:
        request: Refresh token request
        db: Database session
        
    Returns:
        New access and refresh tokens
    """
    payload = verify_token(request.refresh_token, token_type="refresh")
    
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
    
    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload"
        )
    
    # Verify user exists and is active
    user = db.query(User).filter(User.id == user_id).first()
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive"
        )
    
    # Generate new tokens
    access_token = create_access_token(data={"sub": str(user.id)})
    refresh_token = create_refresh_token(data={"sub": str(user.id)})
    
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer"
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    user: User = Depends(get_current_user)
):
    """Get current user information.
    
    Args:
        user: Current authenticated user (from dependency)
        
    Returns:
        User information
    """
    return user


@router.patch("/me", response_model=UserResponse)
async def update_current_user(
    user_update: UserUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update current user profile.
    
    Args:
        user_update: User update data
        user: Current authenticated user
        db: Database session
        
    Returns:
        Updated user information
    """
    # Update user fields
    if user_update.display_name is not None:
        user.display_name = user_update.display_name
    if user_update.avatar_url is not None:
        user.avatar_url = user_update.avatar_url
    
    db.commit()
    db.refresh(user)
    return user

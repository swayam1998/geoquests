"""Tests for authentication dependencies."""
import pytest
from fastapi import HTTPException
from app.auth.dependencies import get_current_user
from app.auth.jwt import create_access_token
from app.models.user import User


@pytest.mark.asyncio
async def test_get_current_user_valid_token(test_user, db):
    """Test getting current user with valid token."""
    token = create_access_token(data={"sub": str(test_user.id)})
    
    # Create a mock credentials object
    from fastapi.security import HTTPAuthorizationCredentials
    credentials = HTTPAuthorizationCredentials(
        scheme="Bearer",
        credentials=token
    )
    
    user = await get_current_user(credentials, db)
    
    assert user is not None
    assert user.id == test_user.id
    assert user.email == test_user.email


@pytest.mark.asyncio
async def test_get_current_user_invalid_token(db):
    """Test getting current user with invalid token."""
    from fastapi.security import HTTPAuthorizationCredentials
    credentials = HTTPAuthorizationCredentials(
        scheme="Bearer",
        credentials="invalid_token"
    )
    
    with pytest.raises(HTTPException) as exc_info:
        await get_current_user(credentials, db)
    
    assert exc_info.value.status_code == 401


@pytest.mark.asyncio
async def test_get_current_user_inactive_user(test_user_inactive, db):
    """Test getting current user with inactive account."""
    token = create_access_token(data={"sub": str(test_user_inactive.id)})
    
    from fastapi.security import HTTPAuthorizationCredentials
    credentials = HTTPAuthorizationCredentials(
        scheme="Bearer",
        credentials=token
    )
    
    with pytest.raises(HTTPException) as exc_info:
        await get_current_user(credentials, db)
    
    assert exc_info.value.status_code == 403
    assert "inactive" in exc_info.value.detail.lower()


@pytest.mark.asyncio
async def test_get_current_user_nonexistent_user(db):
    """Test getting current user with token for non-existent user."""
    from uuid import uuid4
    token = create_access_token(data={"sub": str(uuid4())})
    
    from fastapi.security import HTTPAuthorizationCredentials
    credentials = HTTPAuthorizationCredentials(
        scheme="Bearer",
        credentials=token
    )
    
    with pytest.raises(HTTPException) as exc_info:
        await get_current_user(credentials, db)
    
    assert exc_info.value.status_code == 401

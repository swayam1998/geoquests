"""Tests for OAuth authentication."""
import pytest
from unittest.mock import patch, AsyncMock
from app.auth.oauth import (
    get_authorization_url,
    get_access_token,
    get_google_user_info,
    handle_google_oauth
)
from app.models.user import User, OAuthAccount


@pytest.mark.asyncio
@patch('app.auth.oauth.google_oauth_client.get_authorization_url')
async def test_get_authorization_url(mock_get_url):
    """Test getting OAuth authorization URL."""
    # httpx-oauth returns just a URL string
    mock_get_url.return_value = "https://accounts.google.com/o/oauth2/auth?client_id=test&state=test_state"
    
    url, state = await get_authorization_url()
    
    assert url is not None
    assert isinstance(url, str)
    assert "accounts.google.com" in url or "google.com" in url
    assert state is not None
    assert len(state) > 0  # State should be generated
    # Verify state was passed to get_authorization_url
    mock_get_url.assert_called_once()
    call_args = mock_get_url.call_args
    assert call_args[1]['state'] == state  # state should be in kwargs


@pytest.mark.asyncio
@patch('app.auth.oauth.google_oauth_client.get_access_token')
async def test_get_access_token(mock_get_token):
    """Test exchanging code for access token."""
    mock_get_token.return_value = {
        "access_token": "token123",
        "refresh_token": "refresh123",
        "expires_at": 1234567890
    }
    
    token_data = await get_access_token("code123")
    
    assert token_data["access_token"] == "token123"
    assert token_data["refresh_token"] == "refresh123"
    mock_get_token.assert_called_once()


@pytest.mark.asyncio
@patch('httpx.AsyncClient')
async def test_get_google_user_info(mock_client_class):
    """Test getting user info from Google."""
    from unittest.mock import MagicMock
    mock_response = MagicMock()
    # response.json() is a synchronous method in httpx, not a coroutine
    mock_response.json.return_value = {
        "email": "user@gmail.com",
        "name": "Test User",
        "picture": "https://example.com/avatar.jpg",
        "id": "google123"
    }
    mock_response.raise_for_status = MagicMock()
    
    mock_client = AsyncMock()
    mock_client.__aenter__.return_value = mock_client
    mock_client.__aexit__.return_value = None
    mock_client.get = AsyncMock(return_value=mock_response)
    mock_client_class.return_value = mock_client
    
    user_info = await get_google_user_info("token123")
    
    assert user_info["email"] == "user@gmail.com"
    assert user_info["name"] == "Test User"
    assert user_info["id"] == "google123"


@pytest.mark.asyncio
@patch('app.auth.oauth.get_google_user_info')
@patch('app.auth.oauth.get_access_token')
async def test_handle_google_oauth_new_user(mock_get_token, mock_get_user, db):
    """Test OAuth flow with new user."""
    # Mock responses
    mock_get_token.return_value = {
        "access_token": "token123",
        "refresh_token": "refresh123"
    }
    mock_get_user.return_value = {
        "email": "newuser@gmail.com",
        "name": "New User",
        "picture": "https://example.com/avatar.jpg",
        "id": "google123"
    }
    
    user = await handle_google_oauth(db, "code123")
    
    assert user is not None
    assert user.email == "newuser@gmail.com"
    assert user.display_name == "New User"
    assert user.is_verified is True
    
    # Check OAuth account was created
    oauth_account = db.query(OAuthAccount).filter(
        OAuthAccount.provider == "google",
        OAuthAccount.provider_user_id == "google123"
    ).first()
    
    assert oauth_account is not None
    assert oauth_account.user_id == user.id


@pytest.mark.asyncio
@patch('app.auth.oauth.get_google_user_info')
@patch('app.auth.oauth.get_access_token')
async def test_handle_google_oauth_existing_user(mock_get_token, mock_get_user, db):
    """Test OAuth flow with existing user."""
    # Create existing user
    existing_user = User(
        email="existing@gmail.com",
        display_name="Existing User"
    )
    db.add(existing_user)
    db.commit()
    
    # Mock responses
    mock_get_token.return_value = {
        "access_token": "token123",
        "refresh_token": "refresh123"
    }
    mock_get_user.return_value = {
        "email": "existing@gmail.com",
        "name": "Existing User",
        "picture": "https://example.com/avatar.jpg",
        "id": "google123"
    }
    
    user = await handle_google_oauth(db, "code123")
    
    assert user.id == existing_user.id
    
    # Check OAuth account was created and linked
    oauth_account = db.query(OAuthAccount).filter(
        OAuthAccount.user_id == user.id
    ).first()
    
    assert oauth_account is not None
    assert oauth_account.provider == "google"


@pytest.mark.asyncio
@patch('app.auth.oauth.get_google_user_info')
@patch('app.auth.oauth.get_access_token')
async def test_handle_google_oauth_existing_oauth_account(mock_get_token, mock_get_user, db):
    """Test OAuth flow with existing OAuth account."""
    # Create user with OAuth account
    user = User(
        email="user@gmail.com",
        display_name="Test User"
    )
    db.add(user)
    db.flush()
    
    oauth_account = OAuthAccount(
        user_id=user.id,
        provider="google",
        provider_user_id="google123",
        access_token="old_token"
    )
    db.add(oauth_account)
    db.commit()
    
    # Mock responses
    mock_get_token.return_value = {
        "access_token": "new_token123",
        "refresh_token": "new_refresh123"
    }
    mock_get_user.return_value = {
        "email": "user@gmail.com",
        "name": "Test User",
        "id": "google123"
    }
    
    result_user = await handle_google_oauth(db, "code123")
    
    assert result_user.id == user.id
    
    # Check token was updated
    db.refresh(oauth_account)
    assert oauth_account.access_token == "new_token123"

"""Tests for authentication API routes."""
import pytest
from unittest.mock import patch, AsyncMock
from app.auth.jwt import create_access_token


def test_request_magic_link(client):
    """Test requesting a magic link."""
    with patch('app.api.routes.auth.send_magic_link') as mock_send:
        mock_send.return_value = None
        
        response = client.post(
            "/api/v1/auth/magic-link",
            json={"email": "test@example.com"}
        )
        
        assert response.status_code == 200
        assert "message" in response.json()
        mock_send.assert_called_once()


def test_request_magic_link_invalid_email(client):
    """Test requesting magic link with invalid email."""
    response = client.post(
        "/api/v1/auth/magic-link",
        json={"email": "invalid-email"}
    )
    
    assert response.status_code == 422  # Validation error


@pytest.mark.asyncio
async def test_verify_magic_link_success(client, db):
    """Test verifying magic link token."""
    from app.models.user import MagicLinkToken
    from datetime import datetime, timedelta
    from app.auth.magic_link import generate_magic_link_token
    
    # Create token
    from uuid import uuid4
    token = generate_magic_link_token("test@example.com")
    magic_link = MagicLinkToken(
        id=str(uuid4()),  # String for SQLite compatibility
        email="test@example.com",
        token=token,
        expires_at=datetime.utcnow() + timedelta(minutes=15),
        used=False
    )
    db.add(magic_link)
    db.commit()
    
    response = client.post(
        f"/api/v1/auth/magic-link/verify?token={token}"
    )
    
    if response.status_code != 200:
        import json
        try:
            error_detail = response.json()
        except:
            error_detail = response.text
        pytest.fail(f"Expected 200, got {response.status_code}. Response: {error_detail}")
    
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"


def test_verify_magic_link_invalid_token(client):
    """Test verifying invalid magic link token."""
    response = client.post(
        "/api/v1/auth/magic-link/verify?token=invalid_token"
    )
    
    assert response.status_code == 400


def test_get_current_user_without_token(client):
    """Test accessing protected route without token."""
    response = client.get("/api/v1/auth/me")
    
    assert response.status_code == 403  # Forbidden (no Bearer token)


def test_get_current_user_with_invalid_token(client):
    """Test accessing protected route with invalid token."""
    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer invalid_token"}
    )
    
    assert response.status_code == 401


def test_get_current_user_with_valid_token(client, test_user):
    """Test accessing protected route with valid token."""
    token = create_access_token(data={"sub": str(test_user.id)})
    
    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == test_user.email
    assert data["id"] == str(test_user.id)


def test_update_current_user(client, test_user):
    """Test updating user profile."""
    token = create_access_token(data={"sub": str(test_user.id)})
    
    response = client.patch(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
        json={"display_name": "Updated Name"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["display_name"] == "Updated Name"


def test_refresh_token_success(client, test_user):
    """Test refreshing access token."""
    from app.auth.jwt import create_refresh_token
    
    refresh_token = create_refresh_token(data={"sub": str(test_user.id)})
    
    response = client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": refresh_token}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data


def test_refresh_token_invalid(client):
    """Test refreshing with invalid token."""
    response = client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": "invalid_token"}
    )
    
    assert response.status_code == 401

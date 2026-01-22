"""Tests for JWT token management."""
import pytest
from datetime import timedelta
from app.auth.jwt import create_access_token, create_refresh_token, verify_token


def test_create_access_token():
    """Test access token creation."""
    data = {"sub": "user123"}
    token = create_access_token(data)
    
    assert token is not None
    assert isinstance(token, str)
    assert len(token) > 0


def test_create_refresh_token():
    """Test refresh token creation."""
    data = {"sub": "user123"}
    token = create_refresh_token(data)
    
    assert token is not None
    assert isinstance(token, str)
    assert len(token) > 0


def test_verify_valid_access_token():
    """Test verifying a valid access token."""
    data = {"sub": "user123"}
    token = create_access_token(data)
    
    payload = verify_token(token, token_type="access")
    
    assert payload is not None
    assert payload["sub"] == "user123"
    assert payload["type"] == "access"
    assert "exp" in payload
    assert "iat" in payload


def test_verify_valid_refresh_token():
    """Test verifying a valid refresh token."""
    data = {"sub": "user123"}
    token = create_refresh_token(data)
    
    payload = verify_token(token, token_type="refresh")
    
    assert payload is not None
    assert payload["sub"] == "user123"
    assert payload["type"] == "refresh"


def test_verify_invalid_token():
    """Test verifying an invalid token."""
    payload = verify_token("invalid_token", token_type="access")
    assert payload is None


def test_verify_wrong_token_type():
    """Test that access token can't be used as refresh token."""
    data = {"sub": "user123"}
    access_token = create_access_token(data)
    
    # Try to verify as refresh token (should fail)
    payload = verify_token(access_token, token_type="refresh")
    assert payload is None


def test_token_expiration():
    """Test that expired tokens are rejected."""
    data = {"sub": "user123"}
    # Create token with negative expiration (already expired)
    token = create_access_token(data, expires_delta=timedelta(seconds=-1))
    
    payload = verify_token(token, token_type="access")
    assert payload is None


def test_token_with_custom_expiration():
    """Test token creation with custom expiration."""
    data = {"sub": "user123"}
    token = create_access_token(data, expires_delta=timedelta(minutes=60))
    
    payload = verify_token(token, token_type="access")
    assert payload is not None
    assert payload["sub"] == "user123"

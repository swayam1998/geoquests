# Testing Strategy for Authentication

## Testing Library: pytest

**Why pytest:**
- Industry standard for Python
- Great FastAPI integration
- Easy async testing
- Excellent fixtures system
- Rich assertion messages

## Testing Stack

```txt
pytest==7.4.3
pytest-asyncio==0.21.1
httpx==0.24.1  # For testing FastAPI endpoints
pytest-cov==4.1.0  # Code coverage (optional)
```

## Test Structure

```
backend/
├── tests/
│   ├── __init__.py
│   ├── conftest.py          # Shared fixtures
│   ├── test_auth/
│   │   ├── __init__.py
│   │   ├── test_jwt.py      # JWT token tests
│   │   ├── test_oauth.py    # OAuth flow tests
│   │   ├── test_magic_link.py # Magic link tests
│   │   └── test_dependencies.py # Auth dependencies
│   ├── test_api/
│   │   ├── __init__.py
│   │   └── test_auth_routes.py # API endpoint tests
│   └── test_models/
│       ├── __init__.py
│       └── test_user.py     # Model tests
```

## What to Test

### 1. JWT Token Management
- ✅ Token creation (access + refresh)
- ✅ Token verification (valid tokens)
- ✅ Token expiration
- ✅ Invalid token handling
- ✅ Token type validation

### 2. OAuth Flow
- ✅ Authorization URL generation
- ✅ Token exchange
- ✅ User info retrieval
- ✅ User creation from OAuth
- ✅ Linking OAuth account to existing user
- ✅ Error handling (invalid code, network errors)

### 3. Magic Link
- ✅ Token generation
- ✅ Email sending (mock Resend)
- ✅ Token verification
- ✅ Token expiration
- ✅ One-time use enforcement
- ✅ User creation from magic link

### 4. API Endpoints
- ✅ OAuth authorize endpoint
- ✅ OAuth callback endpoint
- ✅ Magic link request endpoint
- ✅ Magic link verify endpoint
- ✅ Get current user endpoint
- ✅ Update user endpoint
- ✅ Protected route access

### 5. Database Models
- ✅ User creation
- ✅ OAuth account linking
- ✅ Magic link token storage
- ✅ Relationships (User → OAuthAccount)

## Test Database Strategy

**Option 1: Test Database (Recommended)**
- Separate test database
- Real PostgreSQL (closer to production)
- Slower but more accurate

**Option 2: SQLite In-Memory (Faster)**
- In-memory SQLite for tests
- Faster execution
- May miss PostgreSQL-specific issues

**Option 3: Fixtures with Rollback**
- Use transactions that rollback
- Fast and isolated
- Good for unit tests

## Example Test Structure

### conftest.py (Shared Fixtures)

```python
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database import Base, get_db
from app.main import app

# Test database (SQLite in-memory for speed)
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture
def db():
    """Create test database session."""
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)

@pytest.fixture
def client(db):
    """Create test client with database override."""
    def override_get_db():
        try:
            yield db
        finally:
            db.close()
    
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()

@pytest.fixture
def test_user(db):
    """Create a test user."""
    from app.models.user import User
    user = User(
        email="test@example.com",
        display_name="Test User",
        is_active=True,
        is_verified=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
```

### test_jwt.py

```python
import pytest
from datetime import timedelta
from app.auth.jwt import create_access_token, create_refresh_token, verify_token

def test_create_access_token():
    """Test access token creation."""
    data = {"sub": "user123"}
    token = create_access_token(data)
    assert token is not None
    assert isinstance(token, str)

def test_create_refresh_token():
    """Test refresh token creation."""
    data = {"sub": "user123"}
    token = create_refresh_token(data)
    assert token is not None

def test_verify_valid_token():
    """Test verifying a valid token."""
    data = {"sub": "user123"}
    token = create_access_token(data)
    payload = verify_token(token, token_type="access")
    assert payload is not None
    assert payload["sub"] == "user123"

def test_verify_invalid_token():
    """Test verifying an invalid token."""
    payload = verify_token("invalid_token", token_type="access")
    assert payload is None

def test_token_expiration():
    """Test token expiration."""
    from datetime import timedelta
    data = {"sub": "user123"}
    token = create_access_token(data, expires_delta=timedelta(seconds=-1))  # Expired
    payload = verify_token(token, token_type="access")
    assert payload is None
```

### test_magic_link.py

```python
import pytest
from datetime import datetime, timedelta
from app.auth.magic_link import generate_magic_link_token, verify_magic_link
from app.models.user import MagicLinkToken

def test_generate_magic_link_token():
    """Test magic link token generation."""
    token = generate_magic_link_token("test@example.com")
    assert token is not None
    assert len(token) > 20  # Should be a secure random token

def test_verify_magic_link_success(db):
    """Test successful magic link verification."""
    from app.models.user import MagicLinkToken
    from app.auth.magic_link import verify_magic_link
    
    # Create token
    token = generate_magic_link_token("test@example.com")
    magic_link = MagicLinkToken(
        email="test@example.com",
        token=token,
        expires_at=datetime.utcnow() + timedelta(minutes=15),
        used=False
    )
    db.add(magic_link)
    db.commit()
    
    # Verify token
    user = verify_magic_link(db, token)
    assert user is not None
    assert user.email == "test@example.com"
    
    # Check token is marked as used
    db.refresh(magic_link)
    assert magic_link.used is True

def test_verify_expired_magic_link(db):
    """Test expired magic link rejection."""
    from app.models.user import MagicLinkToken
    from app.auth.magic_link import verify_magic_link
    from fastapi import HTTPException
    
    token = generate_magic_link_token("test@example.com")
    magic_link = MagicLinkToken(
        email="test@example.com",
        token=token,
        expires_at=datetime.utcnow() - timedelta(minutes=1),  # Expired
        used=False
    )
    db.add(magic_link)
    db.commit()
    
    # Should raise exception
    with pytest.raises(HTTPException):
        verify_magic_link(db, token)
```

### test_auth_routes.py

```python
import pytest
from fastapi.testclient import TestClient

def test_magic_link_request(client):
    """Test requesting a magic link."""
    response = client.post(
        "/auth/magic-link",
        json={"email": "test@example.com"}
    )
    assert response.status_code == 200
    assert "message" in response.json()

def test_get_current_user_without_token(client):
    """Test accessing protected route without token."""
    response = client.get("/auth/me")
    assert response.status_code == 401

def test_get_current_user_with_token(client, test_user):
    """Test accessing protected route with valid token."""
    from app.auth.jwt import create_access_token
    
    token = create_access_token(data={"sub": str(test_user.id)})
    response = client.get(
        "/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    assert response.json()["email"] == test_user.email
```

## Running Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html

# Run specific test file
pytest tests/test_auth/test_jwt.py

# Run with verbose output
pytest -v

# Run with print statements
pytest -s
```

## Mocking External Services

### Mock Resend (Email)

```python
from unittest.mock import patch, MagicMock

@patch('app.services.email.resend')
def test_send_magic_link_email(mock_resend):
    """Test magic link email sending with mocked Resend."""
    from app.services.email import send_magic_link_email
    
    # Mock Resend response
    mock_resend.emails.send.return_value = {"id": "email123"}
    
    # Call function
    send_magic_link_email("test@example.com", "http://example.com/token")
    
    # Verify Resend was called
    mock_resend.emails.send.assert_called_once()
```

### Mock OAuth (Google)

```python
@patch('app.auth.oauth.get_google_user_info')
@patch('app.auth.oauth.get_access_token')
def test_oauth_callback(mock_get_token, mock_get_user):
    """Test OAuth callback with mocked Google API."""
    # Mock responses
    mock_get_token.return_value = {"access_token": "token123"}
    mock_get_user.return_value = {
        "email": "user@gmail.com",
        "name": "Test User",
        "picture": "https://example.com/avatar.jpg"
    }
    
    # Test OAuth handler
    # ...
```

## Test Coverage Goals

- **Unit Tests**: 80%+ coverage
- **Integration Tests**: All API endpoints
- **E2E Tests**: Complete auth flows (OAuth + Magic Link)

## When to Write Tests

**Option 1: Test-Driven Development (TDD)**
- Write tests first
- Then implement code
- Ensures code meets requirements

**Option 2: Test After Implementation**
- Implement feature
- Write tests to verify
- Faster initial development

**Recommendation for MVP:**
- Write tests for critical paths (JWT, OAuth, Magic Link)
- Skip edge cases initially
- Add more tests as you find bugs

## Benefits of Testing

1. **Catch bugs early** - Before production
2. **Refactor safely** - Tests ensure nothing breaks
3. **Documentation** - Tests show how code should work
4. **Confidence** - Deploy knowing code works
5. **Regression prevention** - Catch bugs when adding features

## Summary

- **Library**: pytest (standard Python testing)
- **Structure**: Organized by feature (auth, api, models)
- **Database**: Test database or SQLite in-memory
- **Mocking**: Mock external services (Resend, Google OAuth)
- **Coverage**: Focus on critical paths for MVP

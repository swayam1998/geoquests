"""Shared pytest fixtures for testing."""
import pytest
import os
import tempfile
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, String, TypeDecorator
from sqlalchemy.orm import sessionmaker
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base, get_db
from app.main import app
from app.models.user import User, OAuthAccount, MagicLinkToken
from uuid import uuid4

# Set test environment variables before importing app modules
# Use a temporary file-based SQLite database for more reliable testing
TEST_DB_FILE = tempfile.NamedTemporaryFile(delete=False, suffix='.db').name
TEST_SETTINGS = {
    "DATABASE_URL": f"sqlite:///{TEST_DB_FILE}",
    "SECRET_KEY": "test-secret-key-for-testing-only-not-for-production-min-32-chars",
    "ALGORITHM": "HS256",
    "ACCESS_TOKEN_EXPIRE_MINUTES": "30",
    "REFRESH_TOKEN_EXPIRE_DAYS": "7",
    "GOOGLE_CLIENT_ID": "test-client-id",
    "GOOGLE_CLIENT_SECRET": "test-client-secret",
    "GOOGLE_REDIRECT_URI": "http://localhost:8000/auth/google/callback",
    "MAGIC_LINK_SECRET_KEY": "test-magic-link-secret-for-testing",
    "MAGIC_LINK_EXPIRE_MINUTES": "15",
    "FRONTEND_URL": "http://localhost:3000",
    "RESEND_API_KEY": "test-resend-key",
    "RESEND_FROM_EMAIL": "test@resend.dev",
}

# Set environment variables for tests
for key, value in TEST_SETTINGS.items():
    os.environ.setdefault(key, value)


# Custom type that converts UUID to string for SQLite
class UUIDString(TypeDecorator):
    """Converts UUID to string for SQLite compatibility."""
    impl = String
    cache_ok = True
    
    def process_bind_param(self, value, dialect):
        if value is not None:
            return str(value) if not isinstance(value, str) else value
        return value
    
    def process_result_value(self, value, dialect):
        if value is not None:
            return str(value)
        return value


# Use file-based SQLite database for testing (more reliable than in-memory)
# The file is created in a temp directory and cleaned up after tests
SQLALCHEMY_DATABASE_URL = f"sqlite:///{TEST_DB_FILE}"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False}  # SQLite specific
)

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db():
    """Create test database session."""
    # Temporarily replace UUID columns with UUIDString for SQLite compatibility
    # UUIDString will convert UUID objects to strings at bind time
    original_columns = {}
    for table in Base.metadata.tables.values():
        for column in table.columns:
            if isinstance(column.type, UUID):
                original_columns[(table.name, column.name)] = column.type
                column.type = UUIDString(36)
    
    try:
        # Create all tables
        Base.metadata.create_all(bind=engine)
        
        # Create session
        db = TestingSessionLocal()
        try:
            yield db
            db.commit()
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()
            # Drop all tables after test
            try:
                Base.metadata.drop_all(bind=engine)
            except Exception:
                # Ignore errors during cleanup
                pass
    finally:
        # Restore original UUID types
        for table in Base.metadata.tables.values():
            for column in table.columns:
                if (table.name, column.name) in original_columns:
                    column.type = original_columns[(table.name, column.name)]


@pytest.fixture(scope="function")
def client(db, monkeypatch):
    """Create test client with database override."""
    # Patch app.database to use test engine and session
    import app.database as app_db
    monkeypatch.setattr(app_db, "engine", engine)
    monkeypatch.setattr(app_db, "SessionLocal", TestingSessionLocal)
    
    # Ensure tables exist in the test engine
    Base.metadata.create_all(bind=engine)
    
    def override_get_db():
        # Ensure tables exist in this connection every time
        Base.metadata.create_all(bind=engine)
        # Use the same db session that has the tables
        try:
            yield db
        finally:
            pass  # Don't close here, fixture handles it
    
    app.dependency_overrides[get_db] = override_get_db
    
    try:
        with TestClient(app) as test_client:
            yield test_client
    finally:
        # Clear overrides after test
        app.dependency_overrides.clear()


@pytest.fixture
def test_user(db):
    """Create a test user."""
    user = User(
        id=str(uuid4()),  # String for SQLite compatibility
        email="test@example.com",
        display_name="Test User",
        is_active=True,
        is_verified=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture
def test_user_inactive(db):
    """Create an inactive test user."""
    user = User(
        id=str(uuid4()),  # String for SQLite compatibility
        email="inactive@example.com",
        display_name="Inactive User",
        is_active=False,
        is_verified=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

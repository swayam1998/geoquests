# Testing Choices & Decisions

## Testing Library: pytest

**Decision:** Use **pytest** for all testing.

**Why pytest:**
- Industry standard for Python
- Excellent FastAPI integration
- Great async support (pytest-asyncio)
- Powerful fixtures system
- Rich assertion messages
- Easy to run and debug

**Alternatives Considered:**
- `unittest` - Built-in but less powerful
- `nose2` - Less popular, pytest is standard
- `pytest` ✅ **Chosen** - Best fit for FastAPI

## Testing Stack

```txt
pytest==7.4.3           # Main testing framework
pytest-asyncio==0.21.1  # Async test support
httpx==0.24.1           # Test FastAPI endpoints
pytest-cov==4.1.0       # Code coverage (optional)
```

## Test Database Strategy

**Decision:** Use **SQLite in-memory** for unit tests, **PostgreSQL** for integration tests.

**Options Considered:**

### Option 1: SQLite In-Memory (Chosen for Unit Tests)
```python
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
# Or in-memory: "sqlite:///:memory:"
```

**Pros:**
- ✅ Very fast (no disk I/O)
- ✅ No setup required
- ✅ Perfect for unit tests
- ✅ Isolated tests

**Cons:**
- ⚠️ May miss PostgreSQL-specific issues
- ⚠️ Different SQL dialect

**Use Case:** Unit tests, fast iteration

### Option 2: Separate PostgreSQL Database (Chosen for Integration Tests)
```python
DATABASE_URL = "postgresql://test_user:test_pass@localhost:5432/test_db"
```

**Pros:**
- ✅ Matches production exactly
- ✅ Tests PostGIS features
- ✅ Catches PostgreSQL-specific issues

**Cons:**
- ⚠️ Slower than SQLite
- ⚠️ Requires database setup

**Use Case:** Integration tests, E2E tests

### Option 3: Transaction Rollback
```python
# Use transactions that rollback after each test
```

**Pros:**
- ✅ Fast
- ✅ Isolated
- ✅ Real database

**Cons:**
- ⚠️ More complex setup

**Decision:** Use **SQLite in-memory for unit tests**, **PostgreSQL for integration tests**.

## Mocking Strategy

**Decision:** Mock external services (Resend, Google OAuth) in tests.

**What to Mock:**
- ✅ Resend API (email sending)
- ✅ Google OAuth API (token exchange, user info)
- ❌ Database (use test database)
- ❌ JWT tokens (test real implementation)

**Why Mock:**
- Don't send real emails during tests
- Don't make real API calls to Google
- Faster test execution
- No external dependencies
- Predictable test results

**Example:**
```python
@patch('app.services.email.resend')
def test_send_magic_link(mock_resend):
    # Mock Resend so no real email is sent
    mock_resend.emails.send.return_value = {"id": "email123"}
    # Test your code
```

## Test Coverage Goals

**Decision:** Aim for **70-80% coverage** for MVP, focus on critical paths.

**Coverage Strategy:**
- ✅ Test all happy paths
- ✅ Test critical error cases
- ⚠️ Skip edge cases initially (add as bugs found)
- ⚠️ Don't aim for 100% (not worth time for MVP)

**What to Test:**
- ✅ JWT token creation and verification
- ✅ Magic link token generation and verification
- ✅ OAuth flow (with mocks)
- ✅ API endpoints
- ✅ Protected routes
- ⚠️ Edge cases (add later)

## When to Write Tests

**Decision:** Write tests **after implementing each feature** (not TDD for MVP).

**Options:**

### Option 1: Test-Driven Development (TDD)
- Write tests first
- Then implement code
- Ensures code meets requirements

**Pros:**
- ✅ Well-tested code
- ✅ Clear requirements
- ✅ Prevents over-engineering

**Cons:**
- ⚠️ Slower initial development
- ⚠️ May over-test for MVP

### Option 2: Test After Implementation (Chosen)
- Implement feature
- Write tests to verify
- Faster initial development

**Pros:**
- ✅ Faster MVP development
- ✅ Test what you actually built
- ✅ Focus on functionality first

**Cons:**
- ⚠️ May miss some edge cases initially

**Decision:** Write tests **after implementation** for MVP speed, add more tests as bugs are found.

## Test Organization

**Decision:** Organize tests by feature, mirror code structure.

```
backend/
├── app/
│   ├── auth/
│   │   ├── jwt.py
│   │   ├── oauth.py
│   │   └── magic_link.py
│   └── api/
│       └── routes/
│           └── auth.py
└── tests/
    ├── test_auth/
    │   ├── test_jwt.py
    │   ├── test_oauth.py
    │   └── test_magic_link.py
    └── test_api/
        └── test_auth_routes.py
```

**Benefits:**
- Easy to find tests for specific features
- Clear organization
- Scales well

## Running Tests

**Commands:**
```bash
# Run all tests
pytest

# Run specific test file
pytest tests/test_auth/test_jwt.py

# Run with verbose output
pytest -v

# Run with coverage
pytest --cov=app --cov-report=html

# Run with print statements (for debugging)
pytest -s
```

## Summary of Decisions

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| **Testing Library** | pytest | Industry standard, best FastAPI support |
| **Test Database (Unit)** | SQLite in-memory | Fast, no setup needed |
| **Test Database (Integration)** | PostgreSQL | Matches production |
| **Mocking** | Mock external APIs | Don't send real emails/API calls |
| **Coverage Goal** | 70-80% | Focus on critical paths for MVP |
| **When to Write** | After implementation | Faster MVP development |
| **Organization** | By feature | Clear, scalable structure |

## Next Steps

1. Create test structure when implementing features
2. Write tests alongside each feature
3. Run tests frequently during development
4. Add more tests as bugs are found

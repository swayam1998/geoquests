# pytest Usage Guide

## What is pytest?

**pytest** is a testing framework for Python that makes it easy to write and run tests.

## Basic Commands

### Run All Tests

```bash
# From backend directory
pytest

# Or with verbose output
pytest -v
```

### Run Specific Test File

```bash
# Run all tests in a file
pytest tests/test_auth/test_jwt.py

# Run with verbose output
pytest tests/test_auth/test_jwt.py -v
```

### Run Specific Test Function

```bash
# Run a single test
pytest tests/test_auth/test_jwt.py::test_create_access_token

# Run multiple specific tests
pytest tests/test_auth/test_jwt.py::test_create_access_token tests/test_auth/test_jwt.py::test_verify_valid_token
```

### Run Tests Matching a Pattern

```bash
# Run all tests with "token" in the name
pytest -k token

# Run all tests with "jwt" in the name
pytest -k jwt
```

## Understanding Test Output

### Passing Tests

```
tests/test_auth/test_jwt.py::test_create_access_token PASSED [ 12%]
```

✅ **PASSED** = Test succeeded

### Failing Tests

```
tests/test_auth/test_jwt.py::test_something FAILED [ 50%]

================================ FAILURES =================================
test_something: AssertionError: assert 1 == 2
```

❌ **FAILED** = Test failed, shows what went wrong

### Error in Tests

```
tests/test_auth/test_jwt.py::test_something ERROR [ 50%]

================================ ERRORS =================================
test_something: NameError: name 'undefined_variable' is not defined
```

⚠️ **ERROR** = Test code has an error (not an assertion failure)

## Common pytest Options

### Verbose Output (`-v`)

```bash
pytest -v
# Shows each test name as it runs
```

### Extra Verbose (`-vv`)

```bash
pytest -vv
# Shows even more detail
```

### Show Print Statements (`-s`)

```bash
pytest -s
# Shows print() output (normally hidden)
```

### Stop on First Failure (`-x`)

```bash
pytest -x
# Stops running tests after first failure
```

### Show Local Variables on Failure (`-l`)

```bash
pytest -l
# Shows local variables when test fails (helpful for debugging)
```

### Traceback Options (`--tb`)

```bash
pytest --tb=short    # Shorter error messages
pytest --tb=line     # One line per error
pytest --tb=no       # No traceback (just summary)
pytest --tb=long     # Full traceback (default)
```

### Run Last Failed Tests

```bash
pytest --lf
# Only run tests that failed last time
```

### Run Failed Tests First

```bash
pytest --ff
# Run failed tests first, then others
```

## Code Coverage

### Install Coverage Plugin

```bash
pip install pytest-cov
```

### Run Tests with Coverage

```bash
# Coverage for entire app
pytest --cov=app

# Coverage with HTML report
pytest --cov=app --cov-report=html

# Coverage for specific directory
pytest --cov=app/auth
```

### View Coverage Report

```bash
# After running with --cov-report=html
open htmlcov/index.html  # macOS
# Or just open htmlcov/index.html in browser
```

## Writing Tests

### Basic Test Structure

```python
def test_something():
    """Test description."""
    # Arrange: Set up test data
    value = 5
    
    # Act: Perform action
    result = value * 2
    
    # Assert: Check result
    assert result == 10
```

### Using Fixtures

**Fixtures** are reusable test data/setup:

```python
# In conftest.py (shared fixtures)
@pytest.fixture
def test_user(db):
    user = User(email="test@example.com")
    db.add(user)
    db.commit()
    return user

# In test file
def test_get_user(test_user):
    """Test using the test_user fixture."""
    assert test_user.email == "test@example.com"
```

### Async Tests

For async functions, use `@pytest.mark.asyncio`:

```python
@pytest.mark.asyncio
async def test_async_function():
    result = await some_async_function()
    assert result is not None
```

### Testing Exceptions

```python
def test_raises_exception():
    """Test that function raises exception."""
    with pytest.raises(ValueError):
        function_that_raises_error()
```

### Testing with Mocks

```python
from unittest.mock import patch

@patch('app.services.email.resend')
def test_send_email(mock_resend):
    """Test email sending with mocked Resend."""
    mock_resend.emails.send.return_value = {"id": "email123"}
    
    send_email("test@example.com")
    
    # Verify it was called
    mock_resend.emails.send.assert_called_once()
```

## Test Organization

### Project Structure

```
backend/
├── tests/
│   ├── conftest.py          # Shared fixtures
│   ├── test_auth/
│   │   ├── test_jwt.py
│   │   ├── test_oauth.py
│   │   └── test_magic_link.py
│   └── test_api/
│       └── test_auth_routes.py
```

### Naming Conventions

- Test files: `test_*.py`
- Test functions: `test_*`
- Test classes: `Test*`

## Debugging Tests

### Run with Debugger

```bash
# Drop into debugger on failure
pytest --pdb

# Drop into debugger on first failure
pytest -x --pdb
```

### Print Debugging

```python
def test_something():
    value = calculate_something()
    print(f"Debug: value = {value}")  # Use -s flag to see this
    assert value > 0
```

### Using Breakpoints

```python
def test_something():
    import pdb; pdb.set_trace()  # Python debugger
    # Or use breakpoint() in Python 3.7+
    breakpoint()
    assert something
```

## Common Patterns

### Testing API Endpoints

```python
def test_api_endpoint(client):
    """Test API endpoint."""
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401  # Unauthorized
```

### Testing Database Operations

```python
def test_create_user(db):
    """Test creating user in database."""
    user = User(email="test@example.com")
    db.add(user)
    db.commit()
    
    # Verify it was created
    found_user = db.query(User).filter(User.email == "test@example.com").first()
    assert found_user is not None
```

### Testing with Authentication

```python
def test_protected_route(client, test_user):
    """Test protected route with authenticated user."""
    from app.auth.jwt import create_access_token
    
    token = create_access_token(data={"sub": str(test_user.id)})
    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 200
    assert response.json()["email"] == test_user.email
```

## Running Tests in Your Project

### All Tests

```bash
cd backend
pytest
```

### Just Auth Tests

```bash
pytest tests/test_auth/
```

### Just JWT Tests

```bash
pytest tests/test_auth/test_jwt.py -v
```

### With Coverage

```bash
pytest --cov=app --cov-report=term-missing
```

### Watch Mode (Auto-rerun on changes)

```bash
# Install pytest-watch
pip install pytest-watch

# Run in watch mode
ptw
```

## Test Output Examples

### Successful Run

```
============================= test session starts ==============================
platform darwin -- Python 3.10.12, pytest-9.0.2
collected 8 items

tests/test_auth/test_jwt.py::test_create_access_token PASSED        [ 12%]
tests/test_auth/test_jwt.py::test_create_refresh_token PASSED       [ 25%]
...

======================== 8 passed in 0.04s =========================
```

### Failed Run

```
============================= test session starts ==============================
collected 8 items

tests/test_auth/test_jwt.py::test_create_access_token PASSED        [ 12%]
tests/test_auth/test_jwt.py::test_something FAILED                  [ 25%]

================================ FAILURES =================================
test_something: AssertionError: assert 1 == 2
    assert 1 == 2
    +  where 1 = calculate()
    +    and 2 = expected_value

======================== 1 failed, 7 passed in 0.05s =========================
```

## Tips & Best Practices

### 1. Keep Tests Simple

```python
# Good: One assertion per test
def test_user_email():
    user = User(email="test@example.com")
    assert user.email == "test@example.com"

# Bad: Too many assertions
def test_everything():
    user = User(...)
    assert user.email == "..."
    assert user.id is not None
    assert user.created_at is not None
    # ... too many things
```

### 2. Use Descriptive Test Names

```python
# Good: Clear what it tests
def test_verify_expired_magic_link_rejects_token():
    ...

# Bad: Unclear
def test_magic_link():
    ...
```

### 3. Test Edge Cases

```python
def test_verify_token_with_none():
    """Test that None token is rejected."""
    result = verify_token(None)
    assert result is None

def test_verify_token_with_empty_string():
    """Test that empty string token is rejected."""
    result = verify_token("")
    assert result is None
```

### 4. Use Fixtures for Common Setup

```python
# In conftest.py
@pytest.fixture
def test_user(db):
    """Reusable test user."""
    return create_test_user(db)

# In test files
def test_something(test_user):
    # test_user is automatically provided
    assert test_user is not None
```

### 5. Clean Up After Tests

```python
@pytest.fixture
def db():
    """Database fixture that cleans up."""
    # Setup
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    try:
        yield db
    finally:
        # Cleanup
        db.close()
        Base.metadata.drop_all(bind=engine)
```

## Quick Reference

| Command | Description |
|---------|-------------|
| `pytest` | Run all tests |
| `pytest -v` | Verbose output |
| `pytest -s` | Show print statements |
| `pytest -x` | Stop on first failure |
| `pytest -k name` | Run tests matching "name" |
| `pytest path/to/test.py` | Run specific test file |
| `pytest path/to/test.py::test_func` | Run specific test |
| `pytest --lf` | Run last failed tests |
| `pytest --cov=app` | Run with coverage |
| `pytest --pdb` | Drop into debugger on failure |

## Example: Testing Your Auth Code

### Test JWT Token Creation

```python
def test_create_access_token():
    """Test that access token is created."""
    data = {"sub": "user123"}
    token = create_access_token(data)
    
    assert token is not None
    assert isinstance(token, str)
    assert len(token) > 0
```

### Test API Endpoint

```python
def test_magic_link_endpoint(client):
    """Test magic link request endpoint."""
    response = client.post(
        "/api/v1/auth/magic-link",
        json={"email": "test@example.com"}
    )
    
    assert response.status_code == 200
    assert "message" in response.json()
```

### Test Protected Route

```python
def test_protected_route_requires_auth(client):
    """Test that protected route requires authentication."""
    response = client.get("/api/v1/auth/me")
    
    assert response.status_code == 401  # Unauthorized
```

## Next Steps

1. **Run existing tests:**
   ```bash
   pytest tests/test_auth/test_jwt.py -v
   ```

2. **Write a new test:**
   - Create test file or add to existing
   - Write test function
   - Run it: `pytest path/to/test.py::test_name`

3. **Debug failing test:**
   ```bash
   pytest path/to/test.py::test_name -v --tb=short -s
   ```

4. **Check coverage:**
   ```bash
   pytest --cov=app --cov-report=html
   open htmlcov/index.html
   ```

## Resources

- [pytest Documentation](https://docs.pytest.org/)
- [pytest-asyncio](https://pytest-asyncio.readthedocs.io/)
- [FastAPI Testing](https://fastapi.tiangolo.com/tutorial/testing/)

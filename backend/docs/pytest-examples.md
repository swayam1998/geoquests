# pytest Examples for GeoQuests

Real examples from this project showing how to use pytest.

## Example 1: Simple Unit Test (JWT)

```python
# tests/test_auth/test_jwt.py
def test_create_access_token():
    """Test access token creation."""
    data = {"sub": "user123"}
    token = create_access_token(data)
    
    assert token is not None
    assert isinstance(token, str)
```

**Run it:**
```bash
pytest tests/test_auth/test_jwt.py::test_create_access_token -v
```

## Example 2: Test with Database (Using Fixture)

```python
# tests/test_auth/test_magic_link.py
@pytest.mark.asyncio
async def test_verify_magic_link_success(db):
    """Test successful magic link verification."""
    from uuid import uuid4
    from app.models.user import MagicLinkToken
    from app.auth.magic_link import verify_magic_link, generate_magic_link_token
    
    # Create token in database
    token = generate_magic_link_token("test@example.com")
    magic_link = MagicLinkToken(
        id=str(uuid4()),
        email="test@example.com",
        token=token,
        expires_at=datetime.utcnow() + timedelta(minutes=15),
        used=False
    )
    db.add(magic_link)
    db.commit()
    
    # Verify token
    user = await verify_magic_link(db, token)
    
    # Assertions
    assert user is not None
    assert user.email == "test@example.com"
```

**Run it:**
```bash
pytest tests/test_auth/test_magic_link.py::test_verify_magic_link_success -v
```

**What's happening:**
- `db` fixture provides database session
- Test creates data, runs function, checks result
- Fixture cleans up after test

## Example 3: Test API Endpoint

```python
# tests/test_api/test_auth_routes.py
def test_get_current_user_without_token(client):
    """Test accessing protected route without token."""
    response = client.get("/api/v1/auth/me")
    
    assert response.status_code == 401
```

**Run it:**
```bash
pytest tests/test_api/test_auth_routes.py::test_get_current_user_without_token -v
```

**What's happening:**
- `client` fixture provides FastAPI test client
- Makes HTTP request to endpoint
- Checks response status code

## Example 4: Test with Mocking

```python
# tests/test_auth/test_magic_link.py
@pytest.mark.asyncio
@patch('app.auth.magic_link.send_magic_link_email')
async def test_send_magic_link(mock_send_email, db):
    """Test sending magic link with mocked email."""
    mock_send_email.return_value = None
    
    email = "test@example.com"
    await send_magic_link(db, email)
    
    # Verify email function was called
    mock_send_email.assert_called_once()
```

**Run it:**
```bash
pytest tests/test_auth/test_magic_link.py::test_send_magic_link -v
```

**What's happening:**
- `@patch` decorator mocks the email function
- Test runs without actually sending email
- Verifies the mock was called

## Example 5: Test Exception Handling

```python
# tests/test_auth/test_magic_link.py
@pytest.mark.asyncio
async def test_verify_expired_magic_link(db):
    """Test expired magic link rejection."""
    from uuid import uuid4
    token = generate_magic_link_token("test@example.com")
    magic_link = MagicLinkToken(
        id=str(uuid4()),
        email="test@example.com",
        token=token,
        expires_at=datetime.utcnow() - timedelta(minutes=1),  # Expired
        used=False
    )
    db.add(magic_link)
    db.commit()
    
    # Should raise HTTPException
    with pytest.raises(HTTPException) as exc_info:
        await verify_magic_link(db, token)
    
    assert exc_info.value.status_code == 400
```

**Run it:**
```bash
pytest tests/test_auth/test_magic_link.py::test_verify_expired_magic_link -v
```

**What's happening:**
- Creates expired token
- Expects function to raise exception
- Checks exception type and status code

## Example 6: Test with Authentication

```python
# tests/test_api/test_auth_routes.py
def test_get_current_user_with_valid_token(client, test_user):
    """Test accessing protected route with valid token."""
    from app.auth.jwt import create_access_token
    
    # Create token for test user
    token = create_access_token(data={"sub": str(test_user.id)})
    
    # Make authenticated request
    response = client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 200
    assert response.json()["email"] == test_user.email
```

**Run it:**
```bash
pytest tests/test_api/test_auth_routes.py::test_get_current_user_with_valid_token -v
```

## Common pytest Commands for This Project

### Run All Tests
```bash
pytest
```

### Run All Auth Tests
```bash
pytest tests/test_auth/ -v
```

### Run Just JWT Tests
```bash
pytest tests/test_auth/test_jwt.py -v
```

### Run Tests Matching Pattern
```bash
pytest -k "token"  # Runs all tests with "token" in name
pytest -k "jwt or magic"  # Runs tests with "jwt" or "magic" in name
```

### Run with Coverage
```bash
pytest --cov=app --cov-report=html
open htmlcov/index.html
```

### Run and Stop on First Failure
```bash
pytest -x
```

### Run with Print Statements Visible
```bash
pytest -s
```

### Run Last Failed Tests
```bash
pytest --lf
```

## Understanding Test Results

### All Tests Pass
```
======================== 8 passed in 0.04s =========================
```
✅ Everything works!

### Some Tests Fail
```
======================== 1 failed, 7 passed in 0.05s =========================
```
⚠️ One test failed, check the error message above

### Test Errors
```
ERROR tests/test_auth/test_something.py::test_function
```
❌ Test code has a bug (not an assertion failure)

## Writing Your First Test

1. **Create test file:**
   ```python
   # tests/test_auth/test_my_feature.py
   def test_my_function():
       """Test my function works."""
       result = my_function()
       assert result == expected_value
   ```

2. **Run it:**
   ```bash
   pytest tests/test_auth/test_my_feature.py -v
   ```

3. **See results:**
   - ✅ PASSED = Good!
   - ❌ FAILED = Check error message
   - ⚠️ ERROR = Fix test code

## Debugging Tips

### See What's Being Tested
```bash
pytest tests/test_auth/test_jwt.py -v -s
# -v = verbose (show test names)
# -s = show print statements
```

### See Detailed Error
```bash
pytest tests/test_auth/test_jwt.py::test_name --tb=long
# --tb=long = full traceback
```

### Drop into Debugger
```bash
pytest tests/test_auth/test_jwt.py::test_name --pdb
# Drops into Python debugger on failure
```

## Quick Test Checklist

When writing a test, ask:
- [ ] Does it test one thing?
- [ ] Is the test name descriptive?
- [ ] Does it use appropriate fixtures?
- [ ] Does it clean up after itself?
- [ ] Does it test both success and failure cases?

## Next Steps

1. **Run existing tests:**
   ```bash
   pytest tests/test_auth/test_jwt.py -v
   ```

2. **Try modifying a test:**
   - Change an assertion
   - See it fail
   - Fix it
   - See it pass

3. **Write a new test:**
   - Pick a function to test
   - Write test in appropriate test file
   - Run it: `pytest path/to/test.py::test_name -v`

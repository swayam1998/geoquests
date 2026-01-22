# Authentication Implementation Plan

## Overview

This document outlines the step-by-step plan to implement OAuth (Google) and Magic Link authentication for GeoQuests.

**Email Service:** We use **Resend** (free tier: 3,000 emails/month) for sending magic link emails. See [resend-setup.md](./resend-setup.md) for detailed setup instructions including domain verification.

**Testing:** We use **pytest** for testing. See [testing-strategy.md](./testing-strategy.md) for detailed testing approach and examples.

## Prerequisites

Before starting, ensure you have:
- Python 3.11+ installed
- Docker Desktop installed (for PostgreSQL)
- Google Cloud Console access (for OAuth credentials)
- Resend account (free tier: 3,000 emails/month) - Sign up at resend.com
- (Optional) Domain `geoquests.com` for custom email addresses

## Testing Approach

We use **pytest** for testing authentication. See [testing-strategy.md](./testing-strategy.md) for details.

**Testing Libraries:**
- `pytest` - Main testing framework
- `pytest-asyncio` - Async test support
- `httpx` - Test FastAPI endpoints
- `pytest-cov` - Code coverage (optional)

**Testing Strategy:**
- **Unit Tests**: JWT, OAuth, Magic Link logic
- **Integration Tests**: API endpoints
- **Test Database**: SQLite in-memory for speed (or separate PostgreSQL)
- **Mocking**: Mock external services (Resend, Google OAuth)

**When to Write Tests:**
- Write tests after implementing each feature (faster for MVP)
- Focus on critical paths (happy paths first)
- Add edge case tests as bugs are found
- Aim for 70-80% coverage of auth code

## Implementation Phases

**Total Phases:** 15 phases covering setup, implementation, testing, and frontend integration.

### Phase 1: Project Setup ⏱️ ~30 minutes

**Goal:** Create backend structure and install dependencies

#### 1.1 Create Backend Directory Structure
```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py
│   ├── config.py
│   ├── database.py
│   ├── models/
│   │   ├── __init__.py
│   │   └── user.py
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── user.py
│   │   └── auth.py
│   ├── auth/
│   │   ├── __init__.py
│   │   ├── jwt.py
│   │   ├── oauth.py
│   │   ├── magic_link.py
│   │   └── dependencies.py
│   ├── services/
│   │   ├── __init__.py
│   │   └── email.py
│   └── api/
│       └── routes/
│           ├── __init__.py
│           └── auth.py
├── alembic/
│   ├── env.py
│   ├── script.py.mako
│   └── versions/
├── .env
├── .env.example
├── requirements.txt
├── Dockerfile
└── README.md
```

#### 1.2 Create requirements.txt
```txt
fastapi==0.104.1
uvicorn[standard]==0.24.0
sqlalchemy==2.0.23
alembic==1.12.1
psycopg2-binary==2.9.9
python-jose[cryptography]==3.3.0
httpx-oauth==0.13.0
resend==0.6.0
itsdangerous==2.1.2
python-multipart==0.0.6
python-dotenv==1.0.0
pydantic-settings==2.1.0
```

#### 1.3 Create Docker Compose for PostgreSQL
```yaml
# docker-compose.yml (root directory)
services:
  db:
    image: postgis/postgis:16-3.4
    environment:
      POSTGRES_DB: geoquests
      POSTGRES_USER: geoquests
      POSTGRES_PASSWORD: geoquests_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U geoquests"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

**Tasks:**
- [ ] Create backend directory structure
- [ ] Create requirements.txt
- [ ] Create docker-compose.yml
- [ ] Create .env.example with all required variables

---

### Phase 2: Database Setup ⏱️ ~20 minutes

**Goal:** Set up PostgreSQL with PostGIS and initialize Alembic

#### 2.1 Start PostgreSQL
```bash
docker compose up -d
```

#### 2.2 Initialize Alembic
```bash
cd backend
pip install -r requirements.txt
alembic init alembic
```

#### 2.3 Configure Alembic
- Update `alembic/env.py` to use your database URL
- Configure SQLAlchemy models import

**Tasks:**
- [ ] Start PostgreSQL container
- [ ] Initialize Alembic
- [ ] Configure Alembic env.py
- [ ] Test database connection

---

### Phase 3: Core Configuration ⏱️ ~15 minutes

**Goal:** Set up configuration management and database connection

#### 3.1 Create config.py
- Load environment variables
- Define settings (JWT, OAuth, Email, Database)
- Use pydantic-settings for validation

#### 3.2 Create database.py
- SQLAlchemy engine setup
- SessionLocal factory
- Base model class
- Database dependency for FastAPI

#### 3.3 Create .env file
```bash
# Database
DATABASE_URL=postgresql://geoquests:geoquests_dev@localhost:5432/geoquests

# JWT
SECRET_KEY=your-secret-key-min-32-chars-generate-random
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# OAuth - Google
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:8000/auth/google/callback

# Magic Link
MAGIC_LINK_SECRET_KEY=different-secret-key-for-magic-links
MAGIC_LINK_EXPIRE_MINUTES=15
FRONTEND_URL=http://localhost:3000

# Email (Resend)
RESEND_API_KEY=re_xxxxx
# Use test domain for quick start, or verify your domain for production
RESEND_FROM_EMAIL=noreply@resend.dev  # Test domain (works immediately)
# RESEND_FROM_EMAIL=noreply@geoquests.com  # Custom domain (after verification)
```

**Tasks:**
- [ ] Create config.py with all settings
- [ ] Create database.py with SQLAlchemy setup
- [ ] Create .env file (copy from .env.example)
- [ ] Generate secure SECRET_KEY and MAGIC_LINK_SECRET_KEY

---

### Phase 4: Database Models ⏱️ ~30 minutes

**Goal:** Create SQLAlchemy models for users, oauth_accounts, magic_link_tokens

#### 4.1 Create User Model
- UUID primary key
- Email (unique, indexed)
- Display name, avatar URL
- is_active, is_verified flags
- Timestamps

#### 4.2 Create OAuthAccount Model
- Link to User
- Provider (google, github, etc.)
- Provider user ID
- Access/refresh tokens (encrypted in production)
- Expiration timestamps

#### 4.3 Create MagicLinkToken Model
- Email
- Token (unique, indexed)
- Expiration timestamp
- Used flag (one-time use)

**Tasks:**
- [ ] Create User model (app/models/user.py)
- [ ] Create OAuthAccount model
- [ ] Create MagicLinkToken model
- [ ] Add relationships between models
- [ ] Test model imports

---

### Phase 5: Database Migration ⏱️ ~20 minutes

**Goal:** Create and run initial migration

#### 5.1 Generate Migration
```bash
alembic revision --autogenerate -m "Initial schema with auth tables"
```

#### 5.2 Review Migration
- Check generated SQL
- Ensure PostGIS extension is enabled
- Verify UUID extension
- Check indexes are created

#### 5.3 Run Migration
```bash
alembic upgrade head
```

#### 5.4 Verify Tables
```bash
psql -U geoquests -d geoquests -c "\dt"
```

**Tasks:**
- [ ] Generate initial migration
- [ ] Review and edit migration if needed
- [ ] Run migration
- [ ] Verify tables created correctly
- [ ] Test PostGIS extension

---

### Phase 6: Pydantic Schemas ⏱️ ~15 minutes

**Goal:** Create request/response schemas for auth

#### 6.1 User Schemas
- UserBase
- UserCreate
- UserUpdate
- UserResponse

#### 6.2 Auth Schemas
- MagicLinkRequest (email)
- TokenResponse (access_token, refresh_token)
- OAuthCallback (code, state)

**Tasks:**
- [ ] Create user schemas
- [ ] Create auth schemas
- [ ] Add validation rules

---

### Phase 7: JWT Token Management ⏱️ ~20 minutes

**Goal:** Implement JWT token creation and verification

#### 7.1 Create jwt.py
- `create_access_token()` - Generate access token
- `create_refresh_token()` - Generate refresh token
- `verify_token()` - Verify and decode token
- Token expiration handling

**Tasks:**
- [ ] Implement JWT token creation
- [ ] Implement token verification
- [ ] Add token type checking (access vs refresh)
- [ ] Test token generation and verification

---

### Phase 8: OAuth Implementation ⏱️ ~45 minutes

**Goal:** Implement Google OAuth flow

#### 8.1 Set up Google OAuth Credentials
1. Go to Google Cloud Console
2. Create OAuth 2.0 credentials
3. Add authorized redirect URI: `http://localhost:8000/auth/google/callback`
4. Copy Client ID and Secret

#### 8.2 Create oauth.py
- Initialize Google OAuth client (httpx-oauth)
- `get_authorization_url()` - Generate OAuth URL
- `get_access_token()` - Exchange code for token
- `get_google_user_info()` - Fetch user info from Google
- `handle_google_oauth()` - Complete OAuth flow

**Tasks:**
- [ ] Set up Google OAuth credentials
- [ ] Implement OAuth client initialization
- [ ] Implement authorization URL generation
- [ ] Implement token exchange
- [ ] Implement user info fetching
- [ ] Implement complete OAuth handler
- [ ] Test OAuth flow manually

---

### Phase 9: Magic Link Implementation ⏱️ ~30 minutes

**Goal:** Implement passwordless email login

#### 9.1 Set up Resend Account
1. Sign up at resend.com (free tier: 3,000 emails/month)
2. Get API key from dashboard
3. **Option A (Quick Start):** Use test domain `noreply@resend.dev` (works immediately)
4. **Option B (Production):** Verify your domain `geoquests.com` for professional emails

**Domain Verification (Optional but Recommended):**
- Go to Resend Dashboard → Domains → Add Domain
- Enter `geoquests.com`
- Add DNS records provided by Resend (SPF, DKIM, DMARC)
- Wait for verification (5-30 minutes)
- Now you can send from `noreply@geoquests.com`

#### 9.2 Create email.py Service
- Initialize Resend client
- `send_magic_link_email()` - Send email with magic link
- Supports both test domain and custom domain

#### 9.3 Create magic_link.py
- `generate_magic_link_token()` - Generate secure token
- `send_magic_link()` - Store token and send email
- `verify_magic_link()` - Verify token and create/login user

**Tasks:**
- [ ] Set up Resend account (free tier)
- [ ] Get Resend API key
- [ ] (Optional) Verify domain for custom email address
- [ ] Create email service with Resend client
- [ ] Implement token generation
- [ ] Implement magic link sending
- [ ] Implement token verification
- [ ] Test email sending (check inbox and spam folder)
- [ ] Test magic link flow end-to-end

---

### Phase 10: Auth Dependencies ⏱️ ~15 minutes

**Goal:** Create FastAPI dependencies for protected routes

#### 10.1 Create dependencies.py
- `get_current_user()` - Verify JWT and return user
- HTTPBearer security scheme
- Error handling for invalid tokens

**Tasks:**
- [ ] Implement get_current_user dependency
- [ ] Add proper error handling
- [ ] Test dependency with valid/invalid tokens

---

### Phase 11: API Routes ⏱️ ~30 minutes

**Goal:** Create FastAPI auth endpoints

#### 11.1 Create auth.py Router
Endpoints:
- `GET /auth/google/authorize` - Start OAuth flow
- `GET /auth/google/callback` - OAuth callback
- `POST /auth/magic-link` - Request magic link
- `POST /auth/magic-link/verify` - Verify magic link
- `POST /auth/refresh` - Refresh access token
- `GET /auth/me` - Get current user
- `PATCH /auth/me` - Update current user

#### 11.2 Register Router in main.py
- Include auth router
- Add CORS middleware
- Add error handlers

**Tasks:**
- [ ] Create all auth endpoints
- [ ] Add request/response models
- [ ] Add error handling
- [ ] Register router in main.py
- [ ] Test endpoints with Postman/curl

---

### Phase 12: Unit Tests ⏱️ ~45 minutes

**Goal:** Write unit tests for auth components

#### 12.1 Set Up Test Structure
```
backend/
├── tests/
│   ├── __init__.py
│   ├── conftest.py          # Shared fixtures
│   ├── test_auth/
│   │   ├── __init__.py
│   │   ├── test_jwt.py
│   │   ├── test_oauth.py
│   │   └── test_magic_link.py
│   └── test_api/
│       └── test_auth_routes.py
```

#### 12.2 Create Test Fixtures (conftest.py)
- Test database setup (SQLite in-memory)
- Test client fixture
- Test user fixture
- Database session override

#### 12.3 Write JWT Tests
- Token creation (access + refresh)
- Token verification (valid tokens)
- Token expiration
- Invalid token handling
- Token type validation

#### 12.4 Write Magic Link Tests
- Token generation
- Email sending (mock Resend)
- Token verification
- Token expiration
- One-time use enforcement
- User creation from magic link

#### 12.5 Write OAuth Tests
- Authorization URL generation
- Token exchange (mock Google)
- User info retrieval (mock)
- User creation from OAuth
- Account linking

**Tasks:**
- [ ] Create test directory structure
- [ ] Create conftest.py with fixtures
- [ ] Write JWT unit tests
- [ ] Write Magic Link unit tests
- [ ] Write OAuth unit tests (with mocks)
- [ ] Run tests: `pytest tests/`

---

### Phase 13: Integration Tests ⏱️ ~30 minutes

**Goal:** Test API endpoints end-to-end

#### 13.1 Test API Endpoints
- `POST /auth/magic-link` - Request magic link
- `POST /auth/magic-link/verify` - Verify magic link
- `GET /auth/google/authorize` - OAuth start
- `GET /auth/google/callback` - OAuth callback
- `GET /auth/me` - Get current user (protected)
- `PATCH /auth/me` - Update user (protected)

#### 13.2 Test Protected Routes
- Access without token (should fail with 401)
- Access with invalid token (should fail with 401)
- Access with valid token (should succeed)

#### 13.3 Test Error Handling
- Invalid email format
- Expired magic link token
- Used magic link token
- Invalid OAuth code

**Tasks:**
- [ ] Write API endpoint tests
- [ ] Test protected route access
- [ ] Test error cases
- [ ] Run all tests: `pytest tests/ -v`

---

### Phase 14: Manual Testing ⏱️ ~30 minutes

**Goal:** Manual end-to-end testing

#### 14.1 Test OAuth Flow Manually
1. Start backend server: `uvicorn app.main:app --reload`
2. Navigate to `/auth/google/authorize` in browser
3. Complete Google OAuth
4. Verify callback creates user
5. Verify JWT tokens returned
6. Test `/auth/me` with token

#### 14.2 Test Magic Link Flow Manually
1. POST to `/auth/magic-link` with email
2. Check email received (inbox and spam)
3. Click magic link
4. Verify token verification
5. Verify user created/logged in
6. Verify JWT tokens returned

#### 14.3 Test with Postman/curl
- Test all endpoints
- Verify responses
- Check error cases

**Tasks:**
- [ ] Test complete OAuth flow manually
- [ ] Test complete Magic Link flow manually
- [ ] Test with Postman/curl
- [ ] Fix any bugs found

---

### Phase 15: Frontend Integration ⏱️ ~1 hour

**Goal:** Connect frontend to auth API

#### 13.1 Create API Client
- Axios/fetch setup with base URL
- Token storage (localStorage or httpOnly cookies)
- Automatic token injection in headers
- Token refresh on 401

#### 13.2 Create Auth Hook
- `useAuth()` hook
- Login state management
- User data fetching
- Logout function

#### 13.3 Create Auth Components
- Login page with Google OAuth button
- Magic link input form
- Protected route wrapper
- Auth context provider

**Tasks:**
- [ ] Create API client
- [ ] Create useAuth hook
- [ ] Create login components
- [ ] Create protected route wrapper
- [ ] Test frontend auth flow

---

## Environment Variables Checklist

Before starting, ensure you have:

- [ ] `DATABASE_URL` - PostgreSQL connection string
- [ ] `SECRET_KEY` - Random 32+ character string for JWT
- [ ] `MAGIC_LINK_SECRET_KEY` - Different secret for magic links
- [ ] `GOOGLE_CLIENT_ID` - From Google Cloud Console
- [ ] `GOOGLE_CLIENT_SECRET` - From Google Cloud Console
- [ ] `GOOGLE_REDIRECT_URI` - OAuth callback URL
- [ ] `RESEND_API_KEY` - From Resend dashboard (free tier)
- [ ] `RESEND_FROM_EMAIL` - Use `noreply@resend.dev` for test, or `noreply@geoquests.com` after domain verification
- [ ] `FRONTEND_URL` - Frontend URL for redirects

## Testing Checklist

**See [testing-strategy.md](./testing-strategy.md) and [testing-choices.md](./testing-choices.md) for detailed testing approach.**

### Unit Tests (Phase 12)
- [ ] JWT token creation and verification
- [ ] Magic link token generation and verification
- [ ] OAuth flow (with mocks)
- [ ] All tests pass: `pytest tests/`

### Integration Tests (Phase 13)
- [ ] API endpoints work correctly
- [ ] Protected routes require authentication
- [ ] Error handling works
- [ ] All integration tests pass

### Manual Testing (Phase 14)
- [ ] OAuth flow works end-to-end
- [ ] Magic link email sends successfully
- [ ] Magic link verification works
- [ ] JWT tokens are valid and verifiable
- [ ] Token refresh works
- [ ] User can update profile
- [ ] Multiple OAuth accounts can link to same user
- [ ] Magic link tokens expire correctly
- [ ] Magic link tokens are one-time use

## Next Steps After Auth

Once authentication is working:

1. Add user profile management
2. Add avatar upload
3. Add email verification (optional)
4. Add additional OAuth providers (GitHub, Apple)
5. Add rate limiting
6. Add logging and monitoring

## Estimated Total Time

- **Backend Implementation:** ~4-5 hours
- **Unit Tests:** ~45 minutes
- **Integration Tests:** ~30 minutes
- **Manual Testing:** ~30 minutes
- **Frontend Integration:** ~1 hour
- **Total:** ~7-8 hours

## Testing Resources

- [pytest Documentation](https://docs.pytest.org/)
- [pytest-asyncio Documentation](https://pytest-asyncio.readthedocs.io/)
- [FastAPI Testing](https://fastapi.tiangolo.com/tutorial/testing/)
- [Testing Strategy Guide](./testing-strategy.md)

## Other Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [httpx-oauth Documentation](https://github.com/frankie567/httpx-oauth)
- [Resend Documentation](https://resend.com/docs)
- [Resend Domain Verification Guide](https://resend.com/docs/dashboard/domains/introduction)
- [Resend Pricing](https://resend.com/pricing) - Free tier: 3,000 emails/month
- [python-jose Documentation](https://python-jose.readthedocs.io/)
- [SQLAlchemy Documentation](https://docs.sqlalchemy.org/)
- [Alembic Documentation](https://alembic.sqlalchemy.org/)

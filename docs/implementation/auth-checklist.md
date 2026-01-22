# Authentication Implementation Checklist

Quick reference checklist for implementing auth. See [auth-implementation-plan.md](./auth-implementation-plan.md) for detailed instructions.

## Phase 1: Project Setup ✅

- [ ] Create `backend/` directory
- [ ] Create directory structure (app/, alembic/, etc.)
- [ ] Create `requirements.txt` with all dependencies
- [ ] Create `docker-compose.yml` for PostgreSQL
- [ ] Create `.env.example` template

## Phase 2: Database Setup ✅

- [ ] Run `docker compose up -d` to start PostgreSQL
- [ ] Run `alembic init alembic` to initialize migrations
- [ ] Configure `alembic/env.py` with database URL
- [ ] Test database connection

## Phase 3: Configuration ✅

- [ ] Create `app/config.py` with all settings
- [ ] Create `app/database.py` with SQLAlchemy setup
- [ ] Create `.env` file from `.env.example`
- [ ] Generate secure `SECRET_KEY` and `MAGIC_LINK_SECRET_KEY`

## Phase 4: Models ✅

- [ ] Create `app/models/user.py` with User model
- [ ] Add OAuthAccount model to same file
- [ ] Add MagicLinkToken model to same file
- [ ] Add relationships (User → OAuthAccount)
- [ ] Test model imports

## Phase 5: Migration ✅

- [ ] Run `alembic revision --autogenerate -m "Initial schema"`
- [ ] Review generated migration file
- [ ] Add PostGIS extension if needed
- [ ] Run `alembic upgrade head`
- [ ] Verify tables: `psql -U geoquests -d geoquests -c "\dt"`

## Phase 6: Schemas ✅

- [ ] Create `app/schemas/user.py` (UserBase, UserCreate, UserUpdate, UserResponse)
- [ ] Create `app/schemas/auth.py` (MagicLinkRequest, TokenResponse)
- [ ] Add validation rules

## Phase 7: JWT ✅

- [ ] Create `app/auth/jwt.py`
- [ ] Implement `create_access_token()`
- [ ] Implement `create_refresh_token()`
- [ ] Implement `verify_token()`
- [ ] Test token creation and verification

## Phase 8: OAuth ✅

- [ ] Set up Google Cloud Console OAuth credentials
- [ ] Add redirect URI: `http://localhost:8000/auth/google/callback`
- [ ] Create `app/auth/oauth.py`
- [ ] Initialize Google OAuth client
- [ ] Implement `get_authorization_url()`
- [ ] Implement `get_access_token()`
- [ ] Implement `get_google_user_info()`
- [ ] Implement `handle_google_oauth()`
- [ ] Test OAuth flow manually

## Phase 9: Magic Link ✅

- [ ] Sign up for Resend account (free tier: 3,000 emails/month)
- [ ] Get Resend API key from dashboard
- [ ] (Optional) Verify domain `geoquests.com` for custom email address
- [ ] Create `app/services/email.py`
- [ ] Implement `send_magic_link_email()` with Resend
- [ ] Create `app/auth/magic_link.py`
- [ ] Implement `generate_magic_link_token()`
- [ ] Implement `send_magic_link()`
- [ ] Implement `verify_magic_link()`
- [ ] Test email sending
- [ ] Test magic link flow

## Phase 10: Dependencies ✅

- [ ] Create `app/auth/dependencies.py`
- [ ] Implement `get_current_user()` dependency
- [ ] Add HTTPBearer security
- [ ] Test with valid/invalid tokens

## Phase 11: API Routes ✅

- [ ] Create `app/api/routes/auth.py`
- [ ] Implement `GET /auth/google/authorize`
- [ ] Implement `GET /auth/google/callback`
- [ ] Implement `POST /auth/magic-link`
- [ ] Implement `POST /auth/magic-link/verify`
- [ ] Implement `POST /auth/refresh`
- [ ] Implement `GET /auth/me`
- [ ] Implement `PATCH /auth/me`
- [ ] Create `app/main.py` with FastAPI app
- [ ] Register auth router
- [ ] Add CORS middleware
- [ ] Test all endpoints with Postman

## Phase 12: Unit Tests ✅

- [ ] Create test directory structure (`tests/`)
- [ ] Create `tests/conftest.py` with fixtures
- [ ] Write JWT unit tests (`test_jwt.py`)
- [ ] Write Magic Link unit tests (`test_magic_link.py`)
- [ ] Write OAuth unit tests (`test_oauth.py`) with mocks
- [ ] Run tests: `pytest tests/`

## Phase 13: Integration Tests ✅

- [ ] Write API endpoint tests (`test_auth_routes.py`)
- [ ] Test protected routes (with/without token)
- [ ] Test error handling
- [ ] Run all tests: `pytest tests/ -v`
- [ ] Check test coverage: `pytest --cov=app`

## Phase 14: Manual Testing ✅

- [ ] Test OAuth flow end-to-end (browser)
- [ ] Test Magic Link flow end-to-end (check email)
- [ ] Test with Postman/curl
- [ ] Test token refresh
- [ ] Test user profile update
- [ ] Fix any bugs found

## Phase 15: Frontend Integration ✅

- [ ] Create API client (`frontend/src/lib/api.ts`)
- [ ] Implement token storage
- [ ] Create `useAuth` hook
- [ ] Create login page
- [ ] Create magic link form
- [ ] Create protected route wrapper
- [ ] Test frontend auth flow

## Environment Variables Needed

```bash
# Database
DATABASE_URL=postgresql://geoquests:geoquests_dev@localhost:5432/geoquests

# JWT
SECRET_KEY=<generate-random-32-chars>
MAGIC_LINK_SECRET_KEY=<generate-random-32-chars>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# OAuth
GOOGLE_CLIENT_ID=<from-google-cloud>
GOOGLE_CLIENT_SECRET=<from-google-cloud>
GOOGLE_REDIRECT_URI=http://localhost:8000/auth/google/callback

# Magic Link
MAGIC_LINK_EXPIRE_MINUTES=15
FRONTEND_URL=http://localhost:3000

# Email (Resend)
RESEND_API_KEY=<from-resend-dashboard>
# Quick start: Use test domain (works immediately)
RESEND_FROM_EMAIL=noreply@resend.dev
# Production: After domain verification, use:
# RESEND_FROM_EMAIL=noreply@geoquests.com
```

## Quick Commands

```bash
# Start database
docker compose up -d

# Install dependencies
cd backend && pip install -r requirements.txt

# Run migrations
alembic upgrade head

# Start backend
uvicorn app.main:app --reload

# Run tests
pytest tests/
pytest tests/ -v  # Verbose
pytest --cov=app  # With coverage

# Start frontend
cd frontend && npm run dev
```

## Testing Endpoints

```bash
# OAuth - Start flow
curl http://localhost:8000/auth/google/authorize

# Magic Link - Request
curl -X POST http://localhost:8000/auth/magic-link \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'

# Get current user (requires token)
curl http://localhost:8000/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

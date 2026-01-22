# Quick Start Guide

## 0. Set Up Virtual Environment (First Time Only)

```bash
cd backend

# Option A: Use setup script (recommended)
./setup.sh

# Option B: Manual setup
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

**Important:** Always activate the virtual environment before working:
```bash
source venv/bin/activate  # You should see (venv) in your prompt
```

## 1. Start Database

```bash
# From project root
docker compose up -d

# Verify it's running
docker compose ps
```

## 2. Set Up Environment Variables

```bash
cd backend
cp .env.example .env
```

Edit `.env` and add:

**Required for basic testing:**
```bash
# Database (already set if Docker is running)
DATABASE_URL=postgresql://geoquests:geoquests_dev@localhost:5432/geoquests

# JWT (generate random strings)
SECRET_KEY=your-random-secret-key-min-32-characters-long
MAGIC_LINK_SECRET_KEY=another-random-secret-key-for-magic-links

# Frontend
FRONTEND_URL=http://localhost:3000

# Email (use test values for now)
RESEND_API_KEY=test-key  # Won't send real emails, but won't error
RESEND_FROM_EMAIL=noreply@resend.dev
```

**Optional (for OAuth testing):**
```bash
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:8000/auth/google/callback
```

## 3. Run Migrations

```bash
cd backend
alembic upgrade head
```

## 4. Start Server

```bash
uvicorn app.main:app --reload
```

Server runs on: `http://localhost:8000`

## 5. Test It

### Option A: Interactive API Docs
Open: `http://localhost:8000/docs`

### Option B: Command Line
```bash
# Health check
curl http://localhost:8000/health

# Request magic link
curl -X POST http://localhost:8000/api/v1/auth/magic-link \
  -H "Content-Type: application/json" \
  -d '{"email": "your-email@example.com"}'
```

### Option C: Run Tests
```bash
# Run all tests
pytest tests/

# Run specific test file
pytest tests/test_auth/test_jwt.py -v

# See pytest guide for more options
# docs/pytest-guide.md
```

## Troubleshooting

**Database connection error:**
- Make sure Docker is running: `docker compose up -d`
- Check `.env` has correct `DATABASE_URL`

**Import errors:**
- Make sure you're in the `backend/` directory
- Install dependencies: `pip install -r requirements.txt`

**Port already in use:**
- Change port: `uvicorn app.main:app --reload --port 8001`
- Or kill process using port 8000

## Next Steps

1. Get Resend API key from resend.com (for real emails)
2. Set up Google OAuth credentials (for OAuth testing)
3. Test magic link flow end-to-end
4. Test OAuth flow (if configured)

See [docs/manual-testing-guide.md](./docs/manual-testing-guide.md) for detailed testing instructions.

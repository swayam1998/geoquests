# Manual Testing Guide

## Prerequisites

1. **Start Docker (PostgreSQL):**
   ```bash
   docker compose up -d
   ```

2. **Set up environment variables:**
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env with your actual values
   ```

3. **Run migrations:**
   ```bash
   alembic upgrade head
   ```

4. **Start the server:**
   ```bash
   uvicorn app.main:app --reload
   ```

Server will run on `http://localhost:8000`

## Testing Endpoints

### 1. Health Check

```bash
curl http://localhost:8000/health
```

**Expected:** `{"status": "healthy"}`

### 2. API Documentation

Open in browser: `http://localhost:8000/docs`

This shows interactive API documentation where you can test endpoints directly.

### 3. Request Magic Link

```bash
curl -X POST http://localhost:8000/api/v1/auth/magic-link \
  -H "Content-Type: application/json" \
  -d '{"email": "your-email@example.com"}'
```

**Expected:** `{"message": "Magic link sent to your email"}`

**Check:** Your email inbox (and spam folder) for the magic link.

### 4. Verify Magic Link

1. Check your email for the magic link
2. Extract the token from the URL: `http://localhost:3000/auth/verify?token=YOUR_TOKEN`
3. Test verification:

```bash
curl -X POST "http://localhost:8000/api/v1/auth/magic-link/verify?token=YOUR_TOKEN"
```

**Expected:**
```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "bearer"
}
```

### 5. Get Current User (Protected Route)

```bash
# Replace YOUR_ACCESS_TOKEN with token from step 4
curl http://localhost:8000/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Expected:**
```json
{
  "id": "uuid-here",
  "email": "your-email@example.com",
  "display_name": null,
  "avatar_url": null,
  "is_active": true,
  "is_verified": true,
  "created_at": "2024-01-22T...",
  "updated_at": null
}
```

### 6. Test Without Token (Should Fail)

```bash
curl http://localhost:8000/api/v1/auth/me
```

**Expected:** `401 Unauthorized`

### 7. Test with Invalid Token (Should Fail)

```bash
curl http://localhost:8000/api/v1/auth/me \
  -H "Authorization: Bearer invalid_token"
```

**Expected:** `401 Unauthorized`

### 8. Update User Profile

```bash
curl -X PATCH http://localhost:8000/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"display_name": "Test User"}'
```

**Expected:** Updated user object with new display_name

### 9. Refresh Token

```bash
curl -X POST http://localhost:8000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refresh_token": "YOUR_REFRESH_TOKEN"}'
```

**Expected:** New access and refresh tokens

### 10. Google OAuth (Browser Test)

1. Open browser and go to:
   ```
   http://localhost:8000/api/v1/auth/google/authorize
   ```

2. You'll be redirected to Google OAuth
3. Sign in with Google
4. You'll be redirected back to: `http://localhost:3000/auth/callback?access_token=...&refresh_token=...`

**Note:** This requires:
- Google OAuth credentials set up in `.env`
- `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` configured
- Redirect URI configured in Google Cloud Console

## Using Postman

1. **Import Collection:**
   - Create new collection "GeoQuests Auth"
   - Add all endpoints above

2. **Set Environment Variables:**
   - `base_url`: `http://localhost:8000`
   - `access_token`: (set after magic link verification)
   - `refresh_token`: (set after magic link verification)

3. **Test Flow:**
   - Request magic link → Get email → Verify token → Save tokens → Test protected routes

## Using the Interactive API Docs

1. Go to `http://localhost:8000/docs`
2. Click "Authorize" button (top right)
3. Enter: `Bearer YOUR_ACCESS_TOKEN`
4. Now you can test all endpoints directly in the browser

## Common Issues

### "RESEND_API_KEY is not configured"
- Add `RESEND_API_KEY` to `.env` file
- Or use test value: `RESEND_API_KEY=test-key` (won't send real emails)

### "Invalid authentication credentials"
- Token expired (tokens expire in 30 minutes)
- Use refresh token to get new access token

### "Connection refused" (Database)
- Make sure Docker is running: `docker compose up -d`
- Check database is up: `docker compose ps`

### Magic link not received
- Check spam folder
- Verify `RESEND_API_KEY` is correct
- Check Resend dashboard for email logs

## Quick Test Script

Save this as `test_auth.sh`:

```bash
#!/bin/bash

BASE_URL="http://localhost:8000"
EMAIL="test@example.com"

echo "1. Requesting magic link..."
curl -X POST "$BASE_URL/api/v1/auth/magic-link" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$EMAIL\"}"

echo -e "\n\n2. Check your email for the magic link token"
echo "3. Then run:"
echo "curl -X POST \"$BASE_URL/api/v1/auth/magic-link/verify?token=YOUR_TOKEN\""
```

## Testing Checklist

- [ ] Server starts without errors
- [ ] Health check returns 200
- [ ] API docs load at `/docs`
- [ ] Magic link request succeeds
- [ ] Magic link email received
- [ ] Magic link verification returns tokens
- [ ] `/auth/me` works with valid token
- [ ] `/auth/me` fails without token
- [ ] `/auth/me` fails with invalid token
- [ ] User profile update works
- [ ] Token refresh works
- [ ] Google OAuth redirects (if configured)

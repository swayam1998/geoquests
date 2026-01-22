# Google OAuth Local Testing Setup Guide

## Step 1: Configure Google Cloud Console

### In the "Create OAuth client ID" page:

1. **Application type:** Keep as "Web application"

2. **Name:** "GeoQuests" (or any name you prefer)

3. **Authorized JavaScript origins:**
   Add these URIs (click "Add URI" for each):
   - `http://localhost:3000` (Frontend)
   - `http://localhost:8000` (Backend - if needed)

4. **Authorized redirect URIs:**
   Remove the example URI (`https://www.example.com`) and add:
   - `http://localhost:8000/api/v1/auth/google/callback` (Backend callback endpoint)
   
   **Note:** The router is mounted at `/api/v1`, so the full path is `/api/v1/auth/google/callback`

5. Click **"Create"**

6. **Save the credentials:**
   - Copy the **Client ID**
   - Copy the **Client Secret**
   - You'll need these for your `.env` file

## Step 2: Add Credentials to Backend .env

Open `backend/.env` and add/update these variables:

```bash
# OAuth - Google
GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret-here
GOOGLE_REDIRECT_URI=http://localhost:8000/api/v1/auth/google/callback
```

**Important:** Make sure `GOOGLE_REDIRECT_URI` includes `/api/v1` prefix since the router is mounted at that path.

# Frontend URL (for redirects after OAuth)
FRONTEND_URL=http://localhost:3000
```

**Important:** Replace `your-client-id-here` and `your-client-secret-here` with the actual values from Google Cloud Console.

## Step 3: Verify Backend Configuration

Make sure your `backend/.env` has all required variables:

```bash
# Database
DATABASE_URL=postgresql://geoquests:geoquests_dev@localhost:5432/geoquests

# JWT
SECRET_KEY=your-secret-key-min-32-chars
MAGIC_LINK_SECRET_KEY=different-secret-key-for-magic-links
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# OAuth - Google
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:8000/api/v1/auth/google/callback

# Magic Link
MAGIC_LINK_EXPIRE_MINUTES=15
FRONTEND_URL=http://localhost:3000

# Email (Resend)
RESEND_API_KEY=re_xxxxx
RESEND_FROM_EMAIL=noreply@resend.dev
```

## Step 4: Test the OAuth Flow

### Start the Services:

1. **Start Backend:**
   ```bash
   cd backend
   uvicorn app.main:app --reload
   ```
   Backend should run on `http://localhost:8000`

2. **Start Frontend:**
   ```bash
   cd frontend
   npm run dev
   ```
   Frontend should run on `http://localhost:3000`

### Test OAuth:

1. Navigate to `http://localhost:3000/login`
2. Click "Continue with Google"
3. You should be redirected to Google's sign-in page
4. After signing in, Google redirects to:
   - `http://localhost:8000/api/v1/auth/google/callback?code=...`
5. Backend processes the OAuth and redirects to:
   - `http://localhost:3000/auth/callback?access_token=...&refresh_token=...`
6. Frontend stores tokens and redirects to home page
7. You should be logged in!

## Troubleshooting

### Error: "redirect_uri_mismatch"
- **Cause:** The redirect URI in Google Console doesn't match what the backend is sending
- **Fix:** 
  - Check that `http://localhost:8000/api/v1/auth/google/callback` is in "Authorized redirect URIs"
  - Verify `GOOGLE_REDIRECT_URI` in `.env` matches exactly
  - Wait a few minutes after saving (Google says it can take 5 minutes to a few hours)

### Error: "invalid_client"
- **Cause:** Client ID or Client Secret is incorrect
- **Fix:** 
  - Double-check `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env`
  - Make sure there are no extra spaces or quotes
  - Restart the backend server after updating `.env`

### Error: "access_denied"
- **Cause:** User cancelled the OAuth consent
- **Fix:** This is normal if user clicks "Cancel" - just try again

### OAuth works but frontend doesn't receive tokens
- **Cause:** Frontend callback URL might be wrong
- **Fix:** 
  - Check that `FRONTEND_URL` in backend `.env` is `http://localhost:3000`
  - Verify the callback page exists at `frontend/src/app/auth/callback/page.tsx`

### "RESEND_API_KEY is not configured" (for Magic Link)
- **Cause:** Resend API key not set (only needed for Magic Link, not OAuth)
- **Fix:** 
  - Sign up at resend.com (free tier: 3,000 emails/month)
  - Get API key from dashboard
  - Add `RESEND_API_KEY=re_xxxxx` to `.env`
  - Or use test value: `RESEND_API_KEY=test-key` (won't send real emails, but won't error)

## Quick Checklist

- [ ] Created OAuth client ID in Google Cloud Console
- [ ] Added `http://localhost:8000/api/v1/auth/google/callback` to Authorized redirect URIs
- [ ] Added `http://localhost:3000` to Authorized JavaScript origins
- [ ] Copied Client ID and Client Secret
- [ ] Added `GOOGLE_CLIENT_ID` to `backend/.env`
- [ ] Added `GOOGLE_CLIENT_SECRET` to `backend/.env`
- [ ] Added `GOOGLE_REDIRECT_URI` to `backend/.env`
- [ ] Added `FRONTEND_URL=http://localhost:3000` to `backend/.env`
- [ ] Restarted backend server
- [ ] Tested OAuth flow

## Notes

- **OAuth Consent Screen:** You may need to configure the OAuth consent screen first if you haven't. Go to "OAuth consent screen" in Google Cloud Console.
- **Test Users:** For testing, you can add test users in the OAuth consent screen (under "Test users")
- **Production:** For production, you'll need to:
  - Add production URLs to Authorized redirect URIs
  - Verify your domain
  - Complete OAuth consent screen verification
  - Update `.env` with production URLs

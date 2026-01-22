# OAuth Localhost Options - No Proxy Needed!

## Good News: Google OAuth Supports Localhost! ✅

**You don't need a proxy service for local development.** Google OAuth explicitly allows `http://localhost` redirects. This is the standard way to develop OAuth applications locally.

## How It Works

The OAuth flow with localhost:

1. **User clicks "Sign in with Google"** on `http://localhost:3000`
2. **Frontend redirects** to `http://localhost:8000/api/v1/auth/google/authorize`
3. **Backend redirects** to Google's OAuth page (Google's servers)
4. **User signs in** on Google's servers
5. **Google redirects back** to `http://localhost:8000/api/v1/auth/google/callback` (your backend)
6. **Backend processes** the OAuth code and redirects to `http://localhost:3000/auth/callback` (your frontend)

**Key Point:** The redirect from Google → your backend happens server-to-server. Google can reach `localhost:8000` because:
- Your backend is running locally and listening on that port
- Google's servers make an HTTP request to your callback URL
- This works as long as your backend is running

## Option 1: Direct Localhost (Recommended for Development) ✅

**What to use:**
- **Authorized redirect URI:** `http://localhost:8000/api/v1/auth/google/callback`
- **Authorized JavaScript origins:** `http://localhost:3000`

**Pros:**
- ✅ Simplest setup
- ✅ No additional services needed
- ✅ Works immediately
- ✅ Standard development practice

**Cons:**
- ❌ Only works when your backend is running
- ❌ Can't test from other devices on your network

**This is what we're using and it works perfectly!**

## Option 2: Tunneling Service (ngrok, Cloudflare Tunnel, etc.)

Use this if:
- You need to test from other devices
- You need to test webhooks
- Localhost isn't working for some reason

### Using ngrok:

1. **Install ngrok:**
   ```bash
   # macOS
   brew install ngrok
   
   # Or download from https://ngrok.com/
   ```

2. **Start your backend:**
   ```bash
   cd backend
   uvicorn app.main:app --reload
   ```

3. **Create tunnel:**
   ```bash
   ngrok http 8000
   ```

4. **You'll get a URL like:** `https://abc123.ngrok.io`

5. **Update Google Console:**
   - **Authorized redirect URI:** `https://abc123.ngrok.io/api/v1/auth/google/callback`
   - **Authorized JavaScript origins:** `https://abc123.ngrok.io` (if needed)

6. **Update backend `.env`:**
   ```bash
   GOOGLE_REDIRECT_URI=https://abc123.ngrok.io/api/v1/auth/google/callback
   FRONTEND_URL=http://localhost:3000  # Frontend can still be localhost
   ```

**Pros:**
- ✅ Accessible from anywhere (mobile, other devices)
- ✅ Works with webhooks
- ✅ HTTPS (required for some OAuth providers)

**Cons:**
- ❌ Requires ngrok account (free tier available)
- ❌ URL changes each time (unless paid plan)
- ❌ Additional service to manage

### Other Tunneling Options:

- **Cloudflare Tunnel (cloudflared):** Free, more stable URLs
- **localtunnel:** Free, open source
- **serveo:** Free, SSH-based

## Option 3: Local Domain with /etc/hosts

Map a local domain to 127.0.0.1:

1. **Edit `/etc/hosts`:**
   ```bash
   sudo nano /etc/hosts
   # Add:
   127.0.0.1 geoquests.local
   ```

2. **Update Google Console:**
   - **Authorized redirect URI:** `http://geoquests.local:8000/api/v1/auth/google/callback`

3. **Update backend `.env`:**
   ```bash
   GOOGLE_REDIRECT_URI=http://geoquests.local:8000/api/v1/auth/google/callback
   ```

**Pros:**
- ✅ More "production-like" URLs
- ✅ No external services

**Cons:**
- ❌ Still only works locally
- ❌ More complex setup
- ❌ May need SSL certificate for some providers

## Option 4: Development/Staging Server

Deploy to a staging environment:

- Heroku (free tier available)
- Railway
- Render
- DigitalOcean App Platform

**Pros:**
- ✅ Closest to production
- ✅ Can share with team
- ✅ Persistent URLs

**Cons:**
- ❌ Requires deployment setup
- ❌ Slower iteration
- ❌ May have costs

## Recommended Approach

### For Local Development:
**Use Option 1 (Direct Localhost)** - It's the simplest and works perfectly for local development.

### If You Need More:
- **Testing from mobile/other devices:** Use Option 2 (ngrok)
- **Team collaboration:** Use Option 4 (Staging server)
- **Production-like testing:** Use Option 4 (Staging server)

## Common Misconception

**"Google can't reach localhost"** - This is incorrect!

- Google's servers make HTTP requests to your callback URL
- If your backend is running on `localhost:8000`, Google can reach it
- The redirect happens server-to-server, not browser-based
- This is why it works!

## Troubleshooting Localhost Issues

### If localhost redirects aren't working:

1. **Check backend is running:**
   ```bash
   curl http://localhost:8000/health
   ```

2. **Check redirect URI matches exactly:**
   - Google Console: `http://localhost:8000/api/v1/auth/google/callback`
   - Backend `.env`: `GOOGLE_REDIRECT_URI=http://localhost:8000/api/v1/auth/google/callback`
   - Must match **exactly** (including http vs https, trailing slashes, etc.)

3. **Check OAuth consent screen:**
   - Make sure you've configured the OAuth consent screen
   - Add test users if needed

4. **Wait for propagation:**
   - Google says changes can take 5 minutes to a few hours

5. **Check browser console:**
   - Look for any CORS or network errors

## Quick Setup Summary

**For localhost (what we're using):**

1. Google Console → Authorized redirect URI: `http://localhost:8000/api/v1/auth/google/callback`
2. Backend `.env`: `GOOGLE_REDIRECT_URI=http://localhost:8000/api/v1/auth/google/callback`
3. Start backend: `uvicorn app.main:app --reload`
4. Start frontend: `npm run dev`
5. Test at `http://localhost:3000/login`

**That's it! No proxy needed.** 🎉

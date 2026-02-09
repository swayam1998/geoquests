# Step-by-step: Deploy GeoQuests to Railway (geoquests.io)

This guide walks you through deploying GeoQuests to **Railway** with **geoquests.io** as your production domain. It assumes you want to keep **local development** on your machine and **production** on Railway, using the same GitHub repo.

---

## Local vs production (how it stays separate)

| | **Local development** | **Production (Railway)** |
|---|------------------------|---------------------------|
| **Where** | Your machine (`localhost`) | Railway (geoquests.io) |
| **Config** | `backend/.env` and `frontend/.env.local` (gitignored) | Railway dashboard → Variables per service |
| **Database** | Local Postgres (e.g. `docker compose up`) or dev URL | Railway Postgres (or external Postgres with PostGIS) |
| **API URL** | `http://localhost:8000` | `https://api.geoquests.io` (or your backend domain) |
| **Frontend URL** | `http://localhost:3000` | `https://geoquests.io` (or your frontend domain) |

- **Local**: You keep using `./dev.sh` or `make start`; `.env` and `.env.local` stay on your machine and are **never** committed (they’re in `.gitignore`).
- **Production**: Every setting comes from **Railway’s environment variables**. Pushing to GitHub triggers a new deploy; no production secrets live in the repo.

So: one repo, two environments — local for daily work, Railway for live traffic at geoquests.io.

---

## Prerequisites

- [GitHub](https://github.com) account
- [Railway](https://railway.app) account (login with GitHub)
- [Google Cloud Console](https://console.cloud.google.com/) access (for OAuth at geoquests.io)
- Domain **geoquests.io** (or your chosen domain) with DNS you can edit (for custom domains on Railway)

---

## Step 1: Push the repo to GitHub

1. Create a **new repository** on GitHub (e.g. `your-username/geoquests`).
2. From your project root (no need to rename the folder):

   ```bash
   git init
   git add .
   git commit -m "Initial commit: GeoQuests app"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/geoquests.git
   git push -u origin main
   ```

3. Confirm the repo is on GitHub and that **backend/** and **frontend/** are at the root (monorepo layout).

---

## Step 2: Create a Railway project and add PostgreSQL

1. Go to [railway.app](https://railway.app) and sign in with GitHub.
2. Click **New Project**.
3. Choose **Deploy from GitHub repo** and select your **geoquests** repo (or **Empty project** and connect the repo later).
4. Add a database:
   - In the project, click **+ New**.
   - Select **Database** → **PostgreSQL**.
   - Wait until the Postgres service is running.

5. **PostGIS** (required for geo features):
   - Railway’s standard Postgres may not include PostGIS. Check [Railway’s PostgreSQL docs](https://docs.railway.com/guides/postgresql) and [extensions](https://station.railway.com/feedback/install-postgres-extensions-c815caee).
   - If PostGIS is not available on Railway, use an external Postgres with PostGIS (e.g. [Neon](https://neon.tech), [Supabase](https://supabase.com)), create a database, and note the connection URL. You’ll add it as `DATABASE_URL` in Step 4.
   - If you use Railway Postgres and it supports extensions, our first migration runs `CREATE EXTENSION IF NOT EXISTS postgis;` when you run migrations (Step 5).

6. Get **DATABASE_URL**:
   - If you used Railway Postgres: open the Postgres service → **Variables** (or **Connect**) and copy `DATABASE_URL` (or the connection string shown).
   - If you used an external DB: use that provider’s connection URL.

---

## Step 3: Create the Backend service on Railway

1. In the same Railway project, click **+ New** → **GitHub Repo** (or **Empty Service** and connect the repo).
2. Select your **geoquests** repository.
3. After the service is created, open it and set:
   - **Root Directory**: `backend`
   - **Build Command** (optional): `pip install -r requirements.txt`
   - **Start Command**:  
     `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. **Variables** tab → add these (you’ll update URLs after Steps 5 and 7):
   - `DATABASE_URL` = (from Step 2)
   - `SECRET_KEY` = a long random string (min 32 characters; generate one and keep it secret)
   - `API_URL` = leave empty for now — set it in step 5 below after you generate the backend domain.
   - `FRONTEND_URL` = leave empty for now — set it in Step 5 after you create the frontend (so CORS works).
   - If you use **Google OAuth**: add `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`; set `GOOGLE_REDIRECT_URI` in Step 7 when you have `api.geoquests.io`.
   - If you use **magic links**: add `MAGIC_LINK_SECRET_KEY`, `RESEND_API_KEY`, and optionally `RESEND_FROM_EMAIL`.
   - If you use **Gemini**: add `GEMINI_API_KEY` and optionally `GEMINI_MODEL` (see `backend/app/config.py`).
5. Generate a **public URL** for the backend:
   - **Settings** → **Networking** → **Generate domain** (e.g. `backend-production-xxxx.up.railway.app`).
   - Set **Backend** variable: `API_URL` = `https://<that-backend-domain>` (no `/api/v1`).
   - After you create the **Frontend** service (Step 5), come back here and set `FRONTEND_URL` = your frontend’s Railway URL (e.g. `https://frontend-xxxx.up.railway.app`). After you add custom domains (Step 7), change both to `https://geoquests.io` and `https://api.geoquests.io`.

---

## Step 4: Run database migrations (production DB)

Migrations must run against the **production** `DATABASE_URL` (the one you set on the backend service).

**Option A – From your machine (recommended once):**

```bash
cd backend
# Use the same DATABASE_URL as in Railway (paste it for this one command, or use a .env.production you never commit)
export DATABASE_URL="postgresql://..."
python3 -m venv venv   # if you don’t have one
source venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
```

**Option B – Railway one-off (if Railway supports run command):**

Use the Railway CLI or dashboard “Run command” (if available) with working directory `backend` and command:  
`alembic upgrade head`  
Ensure `DATABASE_URL` is set in that environment.

After this, your production database has the correct schema (including PostGIS if the image supports it).

---

## Step 5: Create the Frontend service on Railway

1. In the same Railway project, click **+ New** → **GitHub Repo** and select the **same** geoquests repo again (second service from the same repo).
2. Open the new service and set:
   - **Root Directory**: `frontend`
   - **Build Command**: `npm ci && npm run build`
   - **Start Command**: `npm start`  
     (or `npx next start --port $PORT` if you want to be explicit with the port)
3. **Variables**:
   - `NEXT_PUBLIC_API_URL` = your **backend** base URL **including** `/api/v1`, e.g.:
     - With Railway default domain: `https://backend-xxxx.up.railway.app/api/v1`
     - With custom domain: `https://api.geoquests.io/api/v1`
   - Optional: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` if you use Google Maps on the frontend.
4. **Important**: `NEXT_PUBLIC_*` is baked in at **build** time. If you change the backend URL later (e.g. when you add api.geoquests.io), update `NEXT_PUBLIC_API_URL` and **redeploy** the frontend (new build).
5. Generate a **public URL**: **Settings** → **Networking** → **Generate domain** (e.g. `frontend-xxxx.up.railway.app`).
6. **Backend CORS**: Open the **Backend** service → **Variables** → set `FRONTEND_URL` = this frontend URL (e.g. `https://frontend-xxxx.up.railway.app`). That way the API allows requests from the frontend. You’ll switch this to `https://geoquests.io` in Step 7 after adding the custom domain.

---

## Step 6: Connect GitHub so every push deploys

1. For **both** Backend and Frontend services:
   - **Settings** → **Source** (or similar) and ensure the GitHub repo and branch (e.g. `main`) are connected.
2. Configure so that:
   - Pushes to `main` (or your chosen branch) trigger a new build and deploy for each service.
3. Optional: use **Preview** environments for other branches; if you do, add those preview URLs to backend `CORS_ORIGINS` (comma-separated) so the API allows them.

---

## Step 7: Attach custom domains (geoquests.io)

1. **Frontend** (main site):
   - Open the **Frontend** service → **Settings** → **Networking** → **Custom domain** (or **Add domain**).
   - Add `geoquests.io` (and optionally `www.geoquests.io` if you want).
   - Railway will show the DNS records (e.g. CNAME to `xxx.up.railway.app` or A/AAAA records). Add these in your domain registrar (where you manage geoquests.io).
   - Wait for DNS to propagate; Railway will then issue/attach SSL.

2. **Backend** (API):
   - Open the **Backend** service → **Settings** → **Networking** → **Custom domain**.
   - Add `api.geoquests.io` (or another subdomain you prefer).
   - Add the CNAME (or A) record Railway shows at your DNS provider.
   - Wait for propagation and SSL.

3. **Update env vars** after domains are active:
   - **Backend** variables:
     - `FRONTEND_URL` = `https://geoquests.io` (or `https://www.geoquests.io` if that’s the canonical URL)
     - `API_URL` = `https://api.geoquests.io`
     - `GOOGLE_REDIRECT_URI` = `https://api.geoquests.io/api/v1/auth/google/callback` (if using Google OAuth)
   - **Frontend** variable:
     - `NEXT_PUBLIC_API_URL` = `https://api.geoquests.io/api/v1`
   - **Redeploy** the frontend after changing `NEXT_PUBLIC_API_URL` (so the new value is baked into the build).

---

## Step 8: Google OAuth for production (geoquests.io)

If you use “Sign in with Google”:

1. Open [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services** → **Credentials** → your OAuth 2.0 Client.
2. **Authorized JavaScript origins**:
   - Add `https://geoquests.io` (and `https://www.geoquests.io` if you use www).
3. **Authorized redirect URIs**:
   - Add `https://api.geoquests.io/api/v1/auth/google/callback`
4. Save. No code changes needed; the backend already uses `GOOGLE_REDIRECT_URI` from env.

---

## Step 9: Optional – persistent file uploads (backend)

By default, Railway’s filesystem is ephemeral (uploads disappear on redeploy). To keep uploads:

1. **Backend** service → **Volumes** → **Add volume** (e.g. mount path `/data`).
2. In **Variables**, set:
   - `UPLOAD_DIR` = `/data/uploads`
3. Redeploy. New uploads will be stored on the volume. (Existing code already uses `UPLOAD_DIR`.)

---

## Step 10: Sanity check

- **Frontend**: Open `https://geoquests.io` — the app loads.
- **Backend**: Open `https://api.geoquests.io/health` — response `{"status":"healthy"}`.
- **API docs**: Open `https://api.geoquests.io/docs` — Swagger UI loads.
- **Auth**: Sign in with Google (or magic link) and confirm redirect back to geoquests.io and that requests use `https://api.geoquests.io/api/v1`.

---

## Continuing to work locally (without affecting production)

- **Code**: Edit on your machine, commit, and push to GitHub. Pushing triggers production deploys; your local env is unchanged.
- **Local env**: Keep using:
  - `backend/.env` → `DATABASE_URL` (local or dev Postgres), `FRONTEND_URL=http://localhost:3000`, `API_URL=http://localhost:8000`, `GOOGLE_REDIRECT_URI=http://localhost:8000/api/v1/auth/google/callback`, etc.
  - `frontend/.env.local` → `NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1`
- **Run locally**: `./dev.sh start` or `make start` (and ensure local Postgres is up, e.g. `docker compose up -d`). You develop against localhost; production keeps using Railway and geoquests.io.

---

## Quick reference: what lives where

| What | Local | Production |
|------|--------|------------|
| Repo | Same GitHub repo | Same repo (deploys from GitHub) |
| Backend URL | `http://localhost:8000` | `https://api.geoquests.io` |
| Frontend URL | `http://localhost:3000` | `https://geoquests.io` |
| Backend config | `backend/.env` | Railway Backend → Variables |
| Frontend config | `frontend/.env.local` | Railway Frontend → Variables |
| Database | Local Postgres (e.g. Docker) | Railway or external Postgres |
| Migrations | Run locally for local DB | Run once (or via CI) with production `DATABASE_URL` |

---

For more detail on env vars, CORS, and PostGIS, see [DEPLOYMENT.md](./DEPLOYMENT.md).

# GeoQuests – Deployment Guide (Railway)

This document covers deploying the **backend** (FastAPI) and **frontend** (Next.js) to [Railway](https://railway.app), and what to configure for a correct production setup.

**For a step-by-step deploy using geoquests.io (GitHub → Railway, custom domains, local vs production), see [RAILWAY-DEPLOY-GUIDE.md](./RAILWAY-DEPLOY-GUIDE.md).**

## Local vs production

- **Local**: Use `backend/.env` and `frontend/.env.local` (gitignored). Run with `./dev.sh` or `make start`; backend at `http://localhost:8000`, frontend at `http://localhost:3000`, and a local or dev Postgres.
- **Production**: All config lives in **Railway** (Variables per service). Same repo; deploys are triggered by pushes to GitHub. No production secrets in the repo.

## Overview

- **Backend**: Python/FastAPI, Uvicorn, PostgreSQL (with PostGIS), file uploads.
- **Frontend**: Next.js 16, talks to backend via `NEXT_PUBLIC_API_URL`.

You will create **two Railway services** (backend + frontend) and optionally a **PostgreSQL** service (or use an external Postgres with PostGIS).

---

## 1. Repository layout for Railway

Railway can deploy from a **monorepo** by setting **Root Directory** and **Build/Start** commands per service.

| Service   | Root Directory | Notes                    |
|----------|----------------|--------------------------|
| Backend  | `backend`      | Python, `requirements.txt` |
| Frontend | `frontend`     | Node, `package.json`     |

No `railway.json` or `railway.toml` is required; configure everything in the Railway dashboard (or via CLI).

---

## 2. Database (PostgreSQL + PostGIS)

The app uses **PostGIS** (e.g. `Geography` columns, `geoalchemy2`). Your database must have the PostGIS extension available.

- **Option A – Railway Postgres**: If Railway offers a PostGIS-enabled PostgreSQL template, use it. Otherwise, check [Railway’s PostgreSQL docs](https://docs.railway.com/guides/postgresql) and [extensions](https://station.railway.com/feedback/install-postgres-extensions-c815caee); you may need to run `CREATE EXTENSION IF NOT EXISTS postgis;` (our first migration does this, but the Postgres image must include PostGIS).
- **Option B – External Postgres**: Use a provider that supports PostGIS (e.g. [Neon](https://neon.tech), [Supabase](https://supabase.com)), then set `DATABASE_URL` on the backend service.

After the database is created, run migrations from your machine (or a one-off job) with the production `DATABASE_URL`:

```bash
cd backend
# Set DATABASE_URL to your production DB (e.g. from Railway Postgres variables)
export DATABASE_URL="postgresql://..."
pip install -r requirements.txt
alembic upgrade head
```

You can also run this in a Railway one-off command or a separate “migrate” step if you add it to your workflow.

---

## 3. Backend service

### 3.1 Root directory

- **Root Directory**: `backend`

### 3.2 Build (optional)

Railway’s Nixpacks will detect Python and run something like `pip install -r requirements.txt`. You can leave **Build Command** empty or set:

```bash
pip install -r requirements.txt
```

### 3.3 Start command (required)

Use `$PORT` so Railway can route traffic:

```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

Do **not** use `--reload` in production.

### 3.4 Environment variables (backend)

Set these in the Railway **Backend** service (Variables tab). If you use Railway Postgres, `DATABASE_URL` is often provided by linking the Postgres service.

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection URL (e.g. from Railway Postgres). Must be a PostGIS-capable DB. |
| `SECRET_KEY` | Yes | Long random secret for JWT (min 32 chars). Change from dev default. |
| `FRONTEND_URL` | Yes | Full URL of the frontend app (e.g. `https://your-frontend.up.railway.app`). Used for CORS and redirects. |
| `API_URL` | Yes | Full URL of the backend API (e.g. `https://your-backend.up.railway.app`). Used for image URLs and links. |
| `GOOGLE_CLIENT_ID` | If using Google OAuth | Google OAuth client ID. |
| `GOOGLE_CLIENT_SECRET` | If using Google OAuth | Google OAuth client secret. |
| `GOOGLE_REDIRECT_URI` | If using Google OAuth | Must be: `https://<your-backend-domain>/api/v1/auth/google/callback` (replace with your backend’s public URL). |
| `MAGIC_LINK_SECRET_KEY` | If using magic links | Secret for magic-link tokens. |
| `RESEND_API_KEY` | If using magic links | Resend API key for sending emails. |
| `RESEND_FROM_EMAIL` | Optional | From address for emails (e.g. `noreply@yourdomain.com`). |
| `GEMINI_API_KEY` | If using AI verification | Gemini API key for photo verification. |
| `GEMINI_MODEL` | Optional | e.g. `gemini-2.5-flash` (see `backend/app/config.py`). |
| `UPLOAD_DIR` | Optional | Default `uploads`. On Railway, consider a **volume** so uploads persist across deploys. |
| `PORT` | No | Set by Railway; backend uses it in the start command above. |

**CORS**: The backend allows origins from `FRONTEND_URL` and common localhost URLs. For extra origins (e.g. a staging URL), set `CORS_ORIGINS` to a comma-separated list (e.g. `https://staging.up.railway.app,https://app.example.com`).

**Google OAuth**: In [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials → your OAuth client:

- Add **Authorized redirect URI**: `https://<your-backend-domain>/api/v1/auth/google/callback`
- Ensure the frontend origin (e.g. `https://your-frontend.up.railway.app`) is allowed where required.

---

## 4. Frontend service

### 4.1 Root directory

- **Root Directory**: `frontend`

### 4.2 Build command

```bash
npm ci && npm run build
```

(or `npm install && npm run build` if you prefer)

### 4.3 Start command

```bash
npm start
```

Or explicitly use Railway’s port:

```bash
npx next start --port $PORT
```

Next.js will use `PORT` from the environment when available.

### 4.4 Environment variables (frontend)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Yes | Full backend API base URL, e.g. `https://your-backend.up.railway.app/api/v1`. Must be set at **build time** (NEXT_PUBLIC_*). |

Optional (e.g. for maps):

- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` – if you use Google Maps on the frontend.

---

## 5. Order of operations

1. Create a **PostgreSQL** service (with PostGIS if possible) or prepare an external Postgres; get `DATABASE_URL`.
2. Create the **Backend** service:
   - Root: `backend`
   - Set **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - Set all backend env vars (especially `DATABASE_URL`, `SECRET_KEY`, `FRONTEND_URL`, `API_URL`, and OAuth/mail/Gemini if used).
   - Run migrations (e.g. `alembic upgrade head` with that `DATABASE_URL`).
   - Generate a public URL for the backend (e.g. “Generate domain” in Railway).
3. Create the **Frontend** service:
   - Root: `frontend`
   - Set **Build**: `npm ci && npm run build`
   - Set **Start**: `npm start` (or `npx next start --port $PORT`)
   - Set `NEXT_PUBLIC_API_URL` to `https://<backend-domain>/api/v1`.
4. Update backend `FRONTEND_URL` (and `GOOGLE_REDIRECT_URI` if used) to the frontend’s public URL.
5. In Google Cloud Console, add the production backend callback URL and frontend origin as above.

---

## 6. File uploads (backend)

Uploads are stored under `UPLOAD_DIR` (default `uploads/`). On Railway, the filesystem is **ephemeral** unless you attach a **volume**. For production:

- **Option A**: Attach a Railway **volume** to the backend and set `UPLOAD_DIR` to the mount path (e.g. `/data/uploads`), so uploads survive restarts/redeploys.
- **Option B**: Later move to object storage (e.g. S3/R2) and change `backend/app/utils/image_storage.py` and config to use that; for initial deploy, a volume is enough.

---

## 7. Health check

The backend exposes:

- **GET /** – simple API info
- **GET /health** – returns `{"status":"healthy"}`

You can use `/health` for Railway’s health checks if you enable them.

---

## 8. Checklist

- [ ] Postgres (with PostGIS) created; `DATABASE_URL` set on backend.
- [ ] Migrations run: `alembic upgrade head`.
- [ ] Backend: Root `backend`, start command uses `--host 0.0.0.0 --port $PORT`.
- [ ] Backend env: `SECRET_KEY`, `FRONTEND_URL`, `API_URL`, and optionally OAuth, Resend, Gemini, `UPLOAD_DIR` (volume path if used).
- [ ] Backend public URL generated; `GOOGLE_REDIRECT_URI` and Google Console redirect URI updated if using OAuth.
- [ ] Frontend: Root `frontend`, build + start set; `NEXT_PUBLIC_API_URL` points to backend `/api/v1`.
- [ ] Frontend public URL set as backend `FRONTEND_URL`.
- [ ] Optional: Volume for backend uploads; `UPLOAD_DIR` set to volume path.

No Railway-specific config files are required in the repo; configuration is done in the Railway dashboard (or CLI) as above.

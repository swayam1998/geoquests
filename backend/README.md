# GeoQuests Backend

FastAPI backend for GeoQuests - a location-based quest platform.

## Setup

### 1. Create Virtual Environment (Recommended)

```bash
# Create virtual environment
python -m venv venv

# Activate it
# On macOS/Linux:
source venv/bin/activate

# On Windows:
# venv\Scripts\activate
```

### 2. Install Dependencies

```bash
# Make sure venv is activated (you should see (venv) in your prompt)
pip install -r requirements.txt
```

### 3. Set Up Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

### 4. Start Database

```bash
# From project root
docker compose up -d
```

### 5. Run Migrations

```bash
alembic upgrade head
```

### 6. Start Server

```bash
uvicorn app.main:app --reload
```

Server will run on `http://localhost:8000`

## Project Structure

```
backend/
├── app/
│   ├── main.py              # FastAPI application
│   ├── config.py            # Configuration settings
│   ├── database.py          # Database connection
│   ├── models/              # SQLAlchemy models
│   ├── schemas/             # Pydantic schemas
│   ├── auth/                # Authentication logic
│   ├── services/            # Business logic services
│   └── api/                 # API routes
├── alembic/                 # Database migrations
└── requirements.txt         # Python dependencies
```

## Development

- API docs: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Viewing Database Schema

### Option 1: HTML Visualization (Easiest)

```bash
python view_schema.py html
# Opens schema.html in your browser
```

### Option 2: Mermaid ERD

```bash
python view_schema.py mermaid
# Prints Mermaid diagram (can paste into Mermaid Live Editor)
```

### Option 3: Database GUI Tools

- **pgAdmin** (PostgreSQL): https://www.pgadmin.org/
- **DBeaver** (Universal): https://dbeaver.io/
- **TablePlus** (macOS): https://tableplus.com/

Connection details:
- Host: `localhost`
- Port: `5432`
- Database: `geoquests`
- Username: `geoquests`
- Password: `geoquests_dev`

See `docs/view-database-tables.md` for more options.

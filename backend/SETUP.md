# Setup Guide

## 1. Create Virtual Environment

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate

# On Windows:
# venv\Scripts\activate
```

**Verify it's activated:**
```bash
which python  # Should show: .../backend/venv/bin/python
```

## 2. Install Dependencies

```bash
# Make sure venv is activated (you should see (venv) in your prompt)
pip install -r requirements.txt
```

## 3. Set Up Environment Variables

```bash
cp .env.example .env
# Edit .env with your values
```

## 4. Start Database

```bash
# From project root
docker compose up -d
```

## 5. Run Migrations

```bash
alembic upgrade head
```

## 6. Start Server

```bash
uvicorn app.main:app --reload
```

## Deactivating Virtual Environment

When you're done working:
```bash
deactivate
```

## Troubleshooting

**"python: command not found":**
- Use `python3` instead of `python`
- Or install Python if not installed

**"pip: command not found":**
- Make sure venv is activated
- Try `python -m pip` instead

**"Module not found" errors:**
- Make sure venv is activated
- Reinstall: `pip install -r requirements.txt`

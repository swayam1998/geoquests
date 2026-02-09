#!/usr/bin/env python3
"""
Reset the database so migrations can run from scratch (001 -> head).
Uses DATABASE_URL from the environment (same as the app).
Destructive: drops and recreates the public schema; all data is lost.

Usage (from repo root or backend):
  cd backend
  DATABASE_URL="postgres://user:pass@host:port/dbname" python scripts/reset_db_for_migrations.py
  DATABASE_URL="..." alembic upgrade head
"""
import os
import sys

# Normalize DATABASE_URL like the app
_url = (os.environ.get("DATABASE_URL") or "").strip()
if not _url:
    print("Error: DATABASE_URL is not set.", file=sys.stderr)
    sys.exit(1)
if _url.startswith("postgres://"):
    _url = _url.replace("postgres://", "postgresql://", 1)

from sqlalchemy import create_engine, text

engine = create_engine(_url, isolation_level="AUTOCOMMIT")

RESET_SQL = """
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
"""

def main():
    print("Resetting database (dropping public schema)...")
    with engine.connect() as conn:
        conn.execute(text(RESET_SQL))
    print("Done. Run migrations from backend dir:")
    print("  DATABASE_URL=\"...\" alembic upgrade head")
    print("Or with .env set:  alembic upgrade head")

if __name__ == "__main__":
    main()

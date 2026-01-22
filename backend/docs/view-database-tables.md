# How to View Database Tables

This guide shows multiple ways to inspect your database tables and verify the schema.

## Method 1: Visual HTML Schema (Easiest & Best)

Generate a beautiful HTML visualization of your database schema:

```bash
cd backend
python view_schema.py html
```

This creates `schema.html` - just open it in your browser! It shows:
- All tables with columns
- Data types
- Primary keys (PK)
- Foreign keys (FK)
- Indexes
- Constraints

**For Mermaid ERD:**
```bash
python view_schema.py mermaid
# Copy output and paste into https://mermaid.live/
```

## Method 2: Using the Inspection Script

We've created a Python script that makes it easy to view tables:

```bash
cd backend

# Show all tables and their schema
python inspect_db.py

# Or explicitly
python inspect_db.py tables

# Show row counts for all tables
python inspect_db.py count

# Show data from a specific table
python inspect_db.py data users

# Show data with custom limit
python inspect_db.py data users 20
```

## Method 2: Using PostgreSQL Command Line (psql)

If you're using the PostgreSQL database (from Docker):

```bash
# Connect to PostgreSQL
psql -h localhost -U geoquests -d geoquests

# Password: geoquests_dev

# Once connected, run:
\dt                    # List all tables
\d users              # Describe users table structure
\d oauth_accounts     # Describe oauth_accounts table
\d magic_link_tokens  # Describe magic_link_tokens table

# View data
SELECT * FROM users;
SELECT * FROM oauth_accounts;
SELECT * FROM magic_link_tokens;

# Count rows
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM oauth_accounts;
SELECT COUNT(*) FROM magic_link_tokens;

# Exit
\q
```

**Quick one-liner:**
```bash
PGPASSWORD=geoquests_dev psql -h localhost -U geoquests -d geoquests -c "\dt"
```

## Method 3: Using Docker Exec

If PostgreSQL is running in Docker:

```bash
# Connect to database container
docker compose exec db psql -U geoquests -d geoquests

# Then use psql commands (see Method 2)
```

**Quick one-liner:**
```bash
docker compose exec db psql -U geoquests -d geoquests -c "\dt"
```

## Method 4: Using SQLAlchemy in Python REPL

```bash
cd backend
python

# In Python:
>>> from app.database import engine, Base
>>> from sqlalchemy import inspect
>>> 
>>> inspector = inspect(engine)
>>> tables = inspector.get_table_names()
>>> print(tables)
['users', 'oauth_accounts', 'magic_link_tokens']

>>> # Get columns for a table
>>> columns = inspector.get_columns('users')
>>> for col in columns:
...     print(f"{col['name']}: {col['type']}")
```

## Method 5: Using Alembic (Check Migration Status)

```bash
cd backend

# Show current migration version
alembic current

# Show migration history
alembic history

# Show SQL for pending migrations (without applying)
alembic upgrade head --sql
```

## Method 6: Using Database GUI Tools

### Option A: pgAdmin (PostgreSQL)
1. Download from: https://www.pgadmin.org/
2. Connect with:
   - Host: `localhost`
   - Port: `5432`
   - Database: `geoquests`
   - Username: `geoquests`
   - Password: `geoquests_dev`

### Option B: DBeaver (Universal)
1. Download from: https://dbeaver.io/
2. Create new PostgreSQL connection with same credentials

### Option C: TablePlus (macOS)
1. Download from: https://tableplus.com/
2. Create PostgreSQL connection with same credentials

## Method 7: View Test Database (SQLite)

If you want to see the test database:

```bash
cd backend

# Find the test database file (created by pytest)
# It's in a temp directory, check conftest.py for the path

# Or use sqlite3 directly if you know the path
sqlite3 /path/to/test.db ".tables"
sqlite3 /path/to/test.db ".schema users"
sqlite3 /path/to/test.db "SELECT * FROM users;"
```

## Expected Tables

After running migrations, you should see these tables:

1. **users** - User accounts
   - Columns: id, email, display_name, avatar_url, is_active, is_verified, created_at, updated_at

2. **oauth_accounts** - OAuth provider accounts
   - Columns: id, user_id, provider, provider_user_id, access_token, refresh_token, expires_at, created_at

3. **magic_link_tokens** - Magic link authentication tokens
   - Columns: id, email, token, expires_at, used, created_at

4. **alembic_version** - Migration tracking (created by Alembic)

## Quick Verification Checklist

```bash
# 1. Check if database is running
docker compose ps

# 2. Check if migrations are applied
cd backend
alembic current

# 3. View tables using inspection script
python inspect_db.py tables

# 4. Check row counts
python inspect_db.py count
```

## Troubleshooting

**"No tables found":**
- Make sure database is running: `docker compose up -d`
- Run migrations: `alembic upgrade head`
- Check `.env` has correct `DATABASE_URL`

**"Connection refused":**
- Start Docker: `docker compose up -d`
- Wait a few seconds for database to be ready

**"Table doesn't exist":**
- Run migrations: `alembic upgrade head`
- Check migration status: `alembic current`

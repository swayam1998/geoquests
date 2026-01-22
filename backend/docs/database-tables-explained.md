# Database Tables Explained

## Application Tables (Your Tables)

These are the tables created by your application:

### 1. `users`
**Purpose:** Stores user account information

**Columns:**
- `id` (UUID, Primary Key) - Unique user identifier
- `email` (VARCHAR, Unique, Not Null) - User's email address
- `display_name` (VARCHAR, Nullable) - User's display name
- `avatar_url` (VARCHAR, Nullable) - URL to user's avatar image
- `is_active` (BOOLEAN, Default: true) - Whether account is active
- `is_verified` (BOOLEAN, Default: false) - Whether email is verified
- `created_at` (TIMESTAMP) - Account creation time
- `updated_at` (TIMESTAMP, Nullable) - Last update time

### 2. `oauth_accounts`
**Purpose:** Links OAuth provider accounts (Google, etc.) to users

**Columns:**
- `id` (UUID, Primary Key) - Unique OAuth account identifier
- `user_id` (UUID, Foreign Key → users.id) - Links to user
- `provider` (VARCHAR, Not Null) - OAuth provider name (e.g., "google")
- `provider_user_id` (VARCHAR, Not Null) - User ID from OAuth provider
- `access_token` (VARCHAR, Nullable) - OAuth access token (encrypted in production)
- `refresh_token` (VARCHAR, Nullable) - OAuth refresh token (encrypted in production)
- `expires_at` (TIMESTAMP, Nullable) - Token expiration time
- `created_at` (TIMESTAMP) - Account linking time

**Unique Constraint:** One OAuth account per provider per user

### 3. `magic_link_tokens`
**Purpose:** Stores one-time tokens for passwordless email login

**Columns:**
- `id` (UUID, Primary Key) - Unique token identifier
- `email` (VARCHAR, Not Null, Indexed) - Email address for the magic link
- `token` (VARCHAR, Not Null, Unique) - The magic link token
- `expires_at` (TIMESTAMP, Not Null) - Token expiration time
- `used` (BOOLEAN, Default: false) - Whether token has been used
- `created_at` (TIMESTAMP) - Token creation time

### 4. `alembic_version`
**Purpose:** Tracks which database migrations have been applied

**Columns:**
- `version_num` (VARCHAR) - Current migration version

**Note:** This is managed by Alembic (migration tool), not your application code.

---

## PostGIS System Tables (Not Your Tables)

These tables are created automatically by PostGIS (PostgreSQL's geospatial extension). You don't need to manage them - they're part of the PostGIS infrastructure.

### `spatial_ref_sys`
**Purpose:** Stores spatial reference system definitions (coordinate systems, projections)

**Why it exists:** PostGIS needs to know how to interpret geographic coordinates. This table contains definitions for thousands of coordinate systems (like WGS84, UTM zones, etc.).

### `geography_columns` & `geometry_columns`
**Purpose:** Metadata tables that track which columns in your database contain geographic data

**Why they exist:** PostGIS uses these to know which columns are geographic and what coordinate system they use.

### `topology`, `layer`, `featnames`
**Purpose:** Part of PostGIS Topology extension (for advanced geographic data modeling)

**Why they exist:** These are used when you enable PostGIS Topology features. They're not needed for basic geospatial operations.

**Note:** If you're not using topology features, these tables will be empty and can be ignored.

---

## Why Do You See These?

Your database uses **PostGIS** (PostgreSQL + Geographic Information System), which is why you see these system tables. PostGIS is installed because:

1. Your `docker-compose.yml` uses the `postgis/postgis` image
2. Your application will need geospatial features (for location-based quests)
3. PostGIS automatically creates these system tables when installed

## Filtering Out System Tables

When viewing your schema, you can focus on just your application tables:

```bash
# The view_schema.py script automatically filters out PostGIS tables
python view_schema.py html

# Or use inspect_db.py and look for tables 3-5 (users, oauth_accounts, magic_link_tokens)
python inspect_db.py tables | grep -A 15 "^[345]\."
```

## Summary

**Your Application Tables:**
- ✅ `users` - User accounts
- ✅ `oauth_accounts` - OAuth provider links
- ✅ `magic_link_tokens` - Magic link tokens
- ✅ `alembic_version` - Migration tracking

**PostGIS System Tables (Ignore These):**
- `spatial_ref_sys` - Coordinate system definitions
- `geography_columns` - Geographic column metadata
- `geometry_columns` - Geometry column metadata
- `topology`, `layer`, `featnames` - Topology extension tables

You only need to worry about the application tables. The PostGIS tables are managed automatically by the database extension.

# Migration Examples: From MVP to Full Schema

## Visual Comparison

### MVP Schema (Start Here)
```
┌─────────┐      ┌─────────┐      ┌──────────────┐
│  USERS  │──────│ QUESTS  │      │ SUBMISSIONS  │
│         │      │         │      │              │
│ - id    │      │ - id    │      │ - id         │
│ - email │      │ - title │      │ - quest_id   │
│ - name  │      │ - desc  │      │ - image_url  │
└─────────┘      └─────────┘      └──────────────┘
```

### Full Schema (End Goal)
```
┌─────────┐      ┌─────────┐      ┌──────────────┐
│  USERS  │──────│ QUESTS  │      │ SUBMISSIONS  │
│ + xp    │      │ + type  │      │ + watermark  │
│ + stripe│      │ + price │      │ + AI scores  │
└─────────┘      └─────────┘      └──────────────┘
      │                │                  │
      ├────────────────┼──────────────────┤
      │                │                  │
┌─────────────┐  ┌──────────────┐  ┌─────────────┐
│FRIENDSHIPS  │  │QUEST_CHAINS  │  │  PAYMENTS   │
└─────────────┘  └──────────────┘  └─────────────┘
      │                │                  │
┌─────────────┐  ┌──────────────┐  ┌─────────────┐
│   BADGES    │  │   EVENTS     │  │NOTIFICATIONS│
└─────────────┘  └──────────────┘  └─────────────┘
```

## Real Migration Examples

### Example 1: Adding XP System

**Before (MVP):**
```sql
users table:
- id
- email
- display_name
```

**Migration Script:**
```sql
-- 002_add_xp_system.sql
BEGIN;

-- Add XP columns
ALTER TABLE users 
ADD COLUMN xp INT DEFAULT 0,
ADD COLUMN level INT DEFAULT 1,
ADD COLUMN quests_created INT DEFAULT 0,
ADD COLUMN quests_completed INT DEFAULT 0;

-- Update existing users (they already have defaults, but let's be explicit)
UPDATE users SET 
    xp = 0,
    level = 1,
    quests_created = (
        SELECT COUNT(*) FROM quests WHERE creator_id = users.id
    ),
    quests_completed = (
        SELECT COUNT(*) FROM submissions 
        WHERE explorer_id = users.id AND status = 'verified'
    )
WHERE xp IS NULL;

COMMIT;
```

**After:**
```sql
users table:
- id
- email
- display_name
- xp (all existing users = 0)
- level (all existing users = 1)
- quests_created (calculated from existing data)
- quests_completed (calculated from existing data)
```

**Result:**
- ✅ All existing users have XP = 0
- ✅ Existing quests/completions are counted
- ✅ New users also get defaults
- ✅ No data loss

---

### Example 2: Adding Friends Feature

**Before:**
```sql
-- No friendships table
-- Users can't add friends
```

**Migration Script:**
```sql
-- 003_add_friendships.sql
BEGIN;

-- Create friendships table
CREATE TABLE friendships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    friend_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    accepted_at TIMESTAMPTZ,
    UNIQUE(user_id, friend_id)
);

-- Indexes for performance
CREATE INDEX idx_friendships_user ON friendships(user_id, status);
CREATE INDEX idx_friendships_friend ON friendships(friend_id, status);

COMMIT;
```

**After:**
```sql
-- New empty table
friendships:
- id
- user_id
- friend_id
- status (all start as 'pending')
```

**Result:**
- ✅ New empty table
- ✅ Existing users unaffected
- ✅ Users can start adding friends immediately
- ✅ No impact on existing data

---

### Example 3: Adding Paid Quests

**Before:**
```sql
quests table:
- id
- title
- description
- status
-- All quests are social (free)
```

**Migration Script:**
```sql
-- 004_add_paid_quests.sql
BEGIN;

-- Add quest type enum
CREATE TYPE quest_type AS ENUM ('social', 'paid', 'challenge', 'chain');

-- Add columns to quests
ALTER TABLE quests 
ADD COLUMN type quest_type DEFAULT 'social',
ADD COLUMN price_cents INT CHECK (price_cents IS NULL OR price_cents >= 100);

-- Add to users (for receiving payments)
ALTER TABLE users 
ADD COLUMN stripe_account_id VARCHAR(255);

-- Update existing quests (they're all social)
UPDATE quests SET type = 'social' WHERE type IS NULL;

-- Create payments table
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    submission_id UUID REFERENCES submissions(id) ON DELETE SET NULL,
    payer_id UUID REFERENCES users(id),
    payee_id UUID REFERENCES users(id),
    stripe_payment_intent_id VARCHAR(255) UNIQUE,
    amount_cents INT NOT NULL,
    platform_fee_cents INT NOT NULL,
    explorer_payout_cents INT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    paid_at TIMESTAMPTZ
);

-- Add watermarked image to submissions
ALTER TABLE submissions 
ADD COLUMN image_url_watermarked VARCHAR(500);

COMMIT;
```

**After:**
```sql
quests table:
- id
- title
- description
- status
- type (existing quests = 'social', new can be 'paid')
- price_cents (existing = NULL, new paid quests have price)

users table:
- ... (existing fields)
- stripe_account_id (existing users = NULL)

payments table:
- (new empty table)

submissions table:
- ... (existing fields)
- image_url_watermarked (existing = NULL, new paid quests have it)
```

**Result:**
- ✅ Existing quests remain social (type='social', price_cents=NULL)
- ✅ New quests can be paid
- ✅ Existing submissions don't have watermarks (they're from social quests)
- ✅ New paid quest submissions get watermarks
- ✅ No breaking changes

---

### Example 4: Adding Quest Chains

**Before:**
```sql
quests table:
- id
- title
- ...
-- No chain support
```

**Migration Script:**
```sql
-- 005_add_quest_chains.sql
BEGIN;

-- Create quest_chains table
CREATE TABLE quest_chains (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    quest_count INT DEFAULT 0,
    completers_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add chain_id to quests (nullable - existing quests not in chains)
ALTER TABLE quests 
ADD COLUMN chain_id UUID REFERENCES quest_chains(id) ON DELETE SET NULL;

-- Index for performance
CREATE INDEX idx_quests_chain ON quests(chain_id);

COMMIT;
```

**After:**
```sql
quest_chains table:
- (new empty table)

quests table:
- ... (existing fields)
- chain_id (existing quests = NULL, new chain quests have ID)
```

**Result:**
- ✅ Existing quests not in chains (chain_id = NULL)
- ✅ New quests can be added to chains
- ✅ No impact on existing quests

---

## Handling Data Migrations

### Scenario: You have 1000 users, then add XP system

**Question:** What happens to existing users?

**Answer:**
```sql
-- Migration runs
ALTER TABLE users ADD COLUMN xp INT DEFAULT 0;

-- Result:
User 1: xp = 0 (default)
User 2: xp = 0 (default)
...
User 1000: xp = 0 (default)

-- All users start at 0 XP
-- They can earn XP going forward
-- No data loss
```

### Scenario: You have 500 quests, then add paid quests

**Question:** What happens to existing quests?

**Answer:**
```sql
-- Migration runs
ALTER TABLE quests ADD COLUMN type VARCHAR(20) DEFAULT 'social';
ALTER TABLE quests ADD COLUMN price_cents INT;

-- Result:
Quest 1: type = 'social', price_cents = NULL
Quest 2: type = 'social', price_cents = NULL
...
Quest 500: type = 'social', price_cents = NULL

-- All existing quests remain social (free)
-- New quests can be paid
-- No breaking changes
```

### Scenario: You have 200 submissions, then add watermarks

**Question:** What happens to existing submissions?

**Answer:**
```sql
-- Migration runs
ALTER TABLE submissions ADD COLUMN image_url_watermarked VARCHAR(500);

-- Result:
Submission 1: image_url_watermarked = NULL (social quest, no watermark needed)
Submission 2: image_url_watermarked = NULL
...
Submission 200: image_url_watermarked = NULL

-- Existing submissions don't need watermarks (they're from social quests)
-- New paid quest submissions will have watermarks
-- No data loss
```

## Migration Best Practices

### 1. Always Test on Copy of Production Data
```bash
# Create backup
pg_dump geoquests > backup.sql

# Test migration on copy
createdb geoquests_test
psql geoquests_test < backup.sql
# Run migration
# Verify data integrity
```

### 2. Use Transactions
```sql
BEGIN;
-- Your migration
COMMIT;  -- Or ROLLBACK if error
```

### 3. Add Columns as Nullable First
```sql
-- Good: Start nullable
ALTER TABLE users ADD COLUMN new_field VARCHAR(255);

-- Later: Make required if needed
ALTER TABLE users ALTER COLUMN new_field SET NOT NULL;
```

### 4. Provide Defaults
```sql
-- Good: Default value
ALTER TABLE quests ADD COLUMN category VARCHAR(50) DEFAULT 'social';

-- Bad: No default (breaks existing data)
ALTER TABLE quests ADD COLUMN category VARCHAR(50) NOT NULL; -- ❌
```

### 5. Update Existing Data When Needed
```sql
-- Calculate values for existing rows
UPDATE users SET 
    quests_created = (SELECT COUNT(*) FROM quests WHERE creator_id = users.id),
    quests_completed = (SELECT COUNT(*) FROM submissions WHERE explorer_id = users.id)
WHERE quests_created IS NULL;
```

## Summary

✅ **Migrations are safe** - They preserve existing data
✅ **Add features incrementally** - One migration at a time
✅ **Existing users/data unaffected** - Defaults handle it
✅ **Start simple** - MVP with 3 tables
✅ **Grow as needed** - Add tables/columns when features require it

**Key Insight:** Your database schema evolves like your code. Start simple, add complexity as needed. Migrations ensure you never break existing data.

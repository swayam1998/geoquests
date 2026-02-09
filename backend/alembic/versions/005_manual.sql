-- Manual SQL for migration 005 (add capture_method and gemini_result)
-- Run this if "alembic upgrade head" cannot connect (e.g. from another machine).
-- Then mark the revision as applied: INSERT INTO alembic_version (version_num) VALUES ('005');

-- Add enum values (idempotent)
DO $$ BEGIN
    ALTER TYPE submissionstatus ADD VALUE 'ai_review';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TYPE submissionstatus ADD VALUE 'pending_review';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add columns (run once; omit if already applied)
ALTER TABLE submissions
  ADD COLUMN capture_method VARCHAR(10) NOT NULL DEFAULT 'live';

ALTER TABLE submissions
  ADD COLUMN gemini_result JSONB;

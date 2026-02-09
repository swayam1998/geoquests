"""Add gemini_result and capture_method to submissions

Revision ID: 005
Revises: 004
Create Date: 2026-02-08

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "005"
down_revision = "004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add new enum values to submissionstatus (idempotent)
    op.execute("""
        DO $$ BEGIN
            ALTER TYPE submissionstatus ADD VALUE 'ai_review';
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            ALTER TYPE submissionstatus ADD VALUE 'pending_review';
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
    """)

    # Add columns to submissions
    op.add_column(
        "submissions",
        sa.Column("capture_method", sa.String(10), nullable=False, server_default="live"),
    )
    op.add_column(
        "submissions",
        sa.Column("gemini_result", postgresql.JSONB(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("submissions", "gemini_result")
    op.drop_column("submissions", "capture_method")
    # PostgreSQL does not support removing enum values easily; leave ai_review, pending_review in type
    pass

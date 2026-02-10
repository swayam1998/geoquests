"""Add quest cover_image_path

Revision ID: 007
Revises: 006
Create Date: 2026-02-10

"""
from alembic import op
import sqlalchemy as sa


revision = "007"
down_revision = "006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "quests",
        sa.Column("cover_image_path", sa.String(512), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("quests", "cover_image_path")

"""Allow multiple submissions per user per quest

Revision ID: 006
Revises: 005
Create Date: 2026-02-09

"""
from alembic import op

revision = "006"
down_revision = "005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_constraint("uq_submission_quest_explorer", "submissions", type_="unique")


def downgrade() -> None:
    op.create_unique_constraint(
        "uq_submission_quest_explorer",
        "submissions",
        ["quest_id", "explorer_id"],
    )

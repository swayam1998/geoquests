"""Backfill slug for quests that have NULL slug

Revision ID: 008
Revises: 007
Create Date: 2026-02-10

"""
import re
from alembic import op
from sqlalchemy import text


revision = "008"
down_revision = "007"
branch_labels = None
depends_on = None


def _generate_slug(title: str, quest_id: str) -> str:
    """Generate a URL-friendly slug from quest title and ID (matches app logic)."""
    slug_base = re.sub(r"[^\w\s-]", "", (title or "").lower())
    slug_base = re.sub(r"[-\s]+", "-", slug_base).strip("-")
    short_id = quest_id.replace("-", "")[:8]
    if not slug_base:
        slug_base = "quest"
    slug = f"{slug_base}-{short_id}"
    if len(slug) > 240:
        slug = slug[:240] + f"-{short_id}"
    return slug


def upgrade() -> None:
    conn = op.get_bind()
    rows = conn.execute(text("SELECT id::text, title FROM quests WHERE slug IS NULL")).fetchall()
    for (quest_id, title) in rows:
        slug = _generate_slug(title or "", quest_id)
        # Ensure uniqueness: if slug exists, append more of the id
        existing = conn.execute(
            text("SELECT 1 FROM quests WHERE slug = :s"),
            {"s": slug}
        ).fetchone()
        if existing:
            slug = f"{slug}-{quest_id.replace('-', '')[:8]}"
        conn.execute(
            text("UPDATE quests SET slug = :slug WHERE id = :id"),
            {"slug": slug, "id": quest_id}
        )


def downgrade() -> None:
    # Data migration: we don't clear slugs on downgrade (re-running upgrade will re-backfill)
    pass

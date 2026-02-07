"""Add quests table

Revision ID: 002
Revises: 001
Create Date: 2026-01-26 18:24:27.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create quest_visibility enum
    op.execute("""
        CREATE TYPE questvisibility AS ENUM ('public', 'private')
    """)
    
    # Create quest_status enum
    op.execute("""
        CREATE TYPE queststatus AS ENUM ('draft', 'active', 'completed', 'archived')
    """)
    
    # Create quests table
    op.create_table(
        'quests',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('uuid_generate_v4()')),
        sa.Column('creator_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('title', sa.String(200), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('radius_meters', sa.Integer(), nullable=False, server_default='50'),
        sa.Column('visibility', sa.Enum('public', 'private', name='questvisibility'), nullable=False, server_default='public'),
        sa.Column('photo_count', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('start_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('end_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('status', sa.Enum('draft', 'active', 'completed', 'archived', name='queststatus'), nullable=False, server_default='active'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['creator_id'], ['users.id'], ondelete='CASCADE'),
    )
    
    # Add geography column using raw SQL (more reliable for PostGIS)
    op.execute("""
        ALTER TABLE quests 
        ADD COLUMN location geography(POINT, 4326) NOT NULL
    """)
    
    # Create indexes
    op.create_index('idx_quests_id', 'quests', ['id'])
    op.create_index('idx_quests_creator', 'quests', ['creator_id'])
    # Spatial index for location (GIST index for geography)
    op.execute('CREATE INDEX idx_quests_location ON quests USING GIST (location)')


def downgrade() -> None:
    op.drop_index('idx_quests_location', table_name='quests')
    op.drop_index('idx_quests_creator', table_name='quests')
    op.drop_index('idx_quests_id', table_name='quests')
    op.drop_table('quests')
    
    # Drop enums
    op.execute('DROP TYPE IF EXISTS queststatus')
    op.execute('DROP TYPE IF EXISTS questvisibility')

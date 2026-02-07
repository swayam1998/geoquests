"""Add quest participants and quest fields

Revision ID: 003
Revises: 002
Create Date: 2026-01-27 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from sqlalchemy.dialects.postgresql import ENUM

# revision identifiers, used by Alembic.
revision = '003'
down_revision = '002'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create quest_participant_status enum (if not exists)
    # We use raw SQL here only for the conditional check, which SQLAlchemy doesn't support natively
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE questparticipantstatus AS ENUM ('joined', 'completed', 'left');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    
    # Add is_paid and slug to quests table using SQLAlchemy
    # Check if columns exist first to make migration idempotent
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_columns = [col['name'] for col in inspector.get_columns('quests')]
    
    if 'is_paid' not in existing_columns:
        op.add_column('quests', sa.Column('is_paid', sa.Boolean(), nullable=False, server_default='false'))
    
    if 'slug' not in existing_columns:
        op.add_column('quests', sa.Column('slug', sa.String(255), nullable=True))
        # Create unique index on slug
        op.create_index('idx_quests_slug', 'quests', ['slug'], unique=True)
    
    # Create quest_participants table using SQLAlchemy
    # Check if table exists first to make migration idempotent
    existing_tables = inspector.get_table_names()
    if 'quest_participants' not in existing_tables:
        # Create the enum type reference - we need to use the existing enum
        # Since we already created it above, we reference it directly
        quest_participant_status_enum = postgresql.ENUM('joined', 'completed', 'left', name='questparticipantstatus', create_type=False)
        
        op.create_table(
            'quest_participants',
            sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('uuid_generate_v4()')),
            sa.Column('quest_id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('status', quest_participant_status_enum, nullable=False, server_default='joined'),
            sa.Column('joined_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.ForeignKeyConstraint(['quest_id'], ['quests.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
            sa.UniqueConstraint('quest_id', 'user_id', name='uq_quest_participant')
        )
        
        # Create indexes using SQLAlchemy
        op.create_index('idx_quest_participants_quest', 'quest_participants', ['quest_id'])
        op.create_index('idx_quest_participants_user', 'quest_participants', ['user_id'])
        op.create_index('idx_quest_participants_status', 'quest_participants', ['status'])


def downgrade() -> None:
    op.drop_index('idx_quest_participants_status', table_name='quest_participants')
    op.drop_index('idx_quest_participants_user', table_name='quest_participants')
    op.drop_index('idx_quest_participants_quest', table_name='quest_participants')
    op.drop_table('quest_participants')
    
    op.drop_index('idx_quests_slug', table_name='quests')
    op.drop_column('quests', 'slug')
    op.drop_column('quests', 'is_paid')
    
    # Drop enum
    op.execute('DROP TYPE IF EXISTS questparticipantstatus')

"""Add submissions table

Revision ID: 004
Revises: 003
Create Date: 2026-01-27 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '004'
down_revision = '003'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create submission_status enum (if not exists)
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE submissionstatus AS ENUM ('pending', 'processing', 'verified', 'rejected');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)
    
    # Create submissions table
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = inspector.get_table_names()
    
    if 'submissions' not in existing_tables:
        submission_status_enum = postgresql.ENUM('pending', 'processing', 'verified', 'rejected', name='submissionstatus', create_type=False)
        
        op.create_table(
            'submissions',
            sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('uuid_generate_v4()')),
            sa.Column('quest_id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('explorer_id', postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column('image_url_full', sa.String(500), nullable=False),
            sa.Column('captured_accuracy', sa.Float(), nullable=True),
            sa.Column('captured_at', sa.DateTime(timezone=True), nullable=False),
            sa.Column('verification_result', postgresql.JSONB(), nullable=True),
            sa.Column('content_match_score', sa.Integer(), nullable=True),
            sa.Column('quality_score', sa.Integer(), nullable=True),
            sa.Column('faces_detected', sa.Integer(), nullable=False, server_default='0'),
            sa.Column('faces_blurred', sa.Integer(), nullable=False, server_default='0'),
            sa.Column('status', submission_status_enum, nullable=False, server_default='pending'),
            sa.Column('rejection_reason', sa.Text(), nullable=True),
            sa.Column('submitted_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.ForeignKeyConstraint(['quest_id'], ['quests.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['explorer_id'], ['users.id'], ondelete='CASCADE'),
            sa.UniqueConstraint('quest_id', 'explorer_id', name='uq_submission_quest_explorer')
        )
        
        # Add geography column using raw SQL (more reliable for PostGIS)
        op.execute("""
            ALTER TABLE submissions 
            ADD COLUMN captured_location geography(POINT, 4326) NOT NULL
        """)
        
        # Create indexes
        op.create_index('idx_submissions_quest', 'submissions', ['quest_id'])
        op.create_index('idx_submissions_explorer', 'submissions', ['explorer_id'])
        op.create_index('idx_submissions_status', 'submissions', ['status'])
        op.create_index('idx_submissions_quest_status', 'submissions', ['quest_id', 'status'])
        # Spatial index for captured_location (GIST index for geography)
        op.execute('CREATE INDEX idx_submissions_captured_location ON submissions USING GIST (captured_location)')


def downgrade() -> None:
    op.drop_index('idx_submissions_captured_location', table_name='submissions')
    op.drop_index('idx_submissions_quest_status', table_name='submissions')
    op.drop_index('idx_submissions_status', table_name='submissions')
    op.drop_index('idx_submissions_explorer', table_name='submissions')
    op.drop_index('idx_submissions_quest', table_name='submissions')
    op.drop_table('submissions')
    
    # Drop enum
    op.execute('DROP TYPE IF EXISTS submissionstatus')

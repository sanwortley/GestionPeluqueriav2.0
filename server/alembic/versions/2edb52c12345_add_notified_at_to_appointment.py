"""add notified_at to appointment

Revision ID: 2edb52c12345
Revises: 2380ba801256, cfff72963153, 97dba8891ee4
Create Date: 2026-03-30 15:45:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '2edb52c12345'
down_revision = ('2380ba801256', 'cfff72963153', '97dba8891ee4')
branch_labels = None
depends_on = None

def upgrade():
    # Solo añadir la columna a la tabla appointment
    op.add_column('appointment', sa.Column('notified_at', sa.DateTime(timezone=True), nullable=True))

def downgrade():
    op.drop_column('appointment', 'notified_at')

"""add_reminder_sent_at_to_appointment

Revision ID: 909ac799dedc
Revises: 900878e6b677
Create Date: 2026-04-06 08:52:41.325227

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '909ac799dedc'
down_revision: Union[str, Sequence[str], None] = '900878e6b677'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    with op.batch_alter_table('appointment', schema=None) as batch_op:
        batch_op.add_column(sa.Column('reminder_sent_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('appointment', schema=None) as batch_op:
        batch_op.drop_column('reminder_sent_at')

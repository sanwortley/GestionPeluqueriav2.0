"""add_notification_error_to_appointment

Revision ID: 900878e6b677
Revises: 2edb52c12345
Create Date: 2026-04-01 10:29:44.790958

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '900878e6b677'
down_revision: Union[str, Sequence[str], None] = '2edb52c12345'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('appointment', sa.Column('notification_error', sa.String(), nullable=True))
    op.add_column('appointment', sa.Column('last_notified_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('appointment', 'last_notified_at')
    op.drop_column('appointment', 'notification_error')

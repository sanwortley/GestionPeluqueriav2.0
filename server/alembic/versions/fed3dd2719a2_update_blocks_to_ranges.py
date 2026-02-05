"""update_blocks_to_ranges

Revision ID: fed3dd2719a2
Revises: 96be62e2eb4d
Create Date: 2026-02-05 12:39:45.167564

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'fed3dd2719a2'
down_revision: Union[str, Sequence[str], None] = '96be62e2eb4d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Rename 'date' to 'start_date'
    op.alter_column('block', 'date', new_column_name='start_date')
    # Add 'end_date'
    op.add_column('block', sa.Column('end_date', sa.Date(), nullable=True))
    # For existing blocks, end_date = start_date
    op.execute("UPDATE block SET end_date = start_date")
    # Make it not nullable
    op.alter_column('block', 'end_date', nullable=False)


def downgrade() -> None:
    op.drop_column('block', 'end_date')
    op.alter_column('block', 'start_date', new_column_name='date')

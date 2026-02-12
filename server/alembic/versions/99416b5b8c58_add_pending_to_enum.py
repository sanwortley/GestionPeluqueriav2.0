"""add_pending_to_enum

Revision ID: 99416b5b8c58
Revises: cfff72963153
Create Date: 2026-02-12 09:56:12.398797

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '99416b5b8c58'
down_revision: Union[str, Sequence[str], None] = 'cfff72963153'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute("ALTER TYPE appointmentstatus ADD VALUE IF NOT EXISTS 'PENDING'")


def downgrade() -> None:
    """Downgrade schema."""
    pass

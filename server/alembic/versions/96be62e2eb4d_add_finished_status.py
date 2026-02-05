"""Add FINISHED status

Revision ID: 96be62e2eb4d
Revises: 46cb7d88d72d
Create Date: 2026-02-05 11:56:59.632698

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '96be62e2eb4d'
down_revision: Union[str, Sequence[str], None] = '46cb7d88d72d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add FINISHED to appointmentstatus enum
    # We use commit() because ALTER TYPE ADD VALUE cannot run inside a transaction in some Postgres versions
    # But Alembic handles this with its own transaction management.
    # However, for simply adding a value:
    op.execute("ALTER TYPE appointmentstatus ADD VALUE IF NOT EXISTS 'FINISHED'")

def downgrade() -> None:
    """Downgrade schema."""
    # Downgrading enums in Postgres is hard (requires deleting/recreating)
    # Usually we leave it as is or handle it if strictly necessary.
    pass

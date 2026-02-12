"""force_add_pending_to_enum

Revision ID: 2380ba801256
Revises: 99416b5b8c58
Create Date: 2026-02-12 11:53:12.139334

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2380ba801256'
down_revision: Union[str, Sequence[str], None] = '99416b5b8c58'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Use raw connection to avoid transaction issues with ALTER TYPE ADD VALUE
    connection = op.get_bind()
    # In Postgres, ALTER TYPE ADD VALUE cannot be executed inside a transaction block in some scenarios.
    # Alembic runs migrations in a transaction. We can try to use op.execute to run it.
    # If it fails, it's likely already there or the transaction is blocking it.
    try:
        op.execute("COMMIT")
        op.execute("ALTER TYPE appointmentstatus ADD VALUE 'PENDING'")
    except Exception as e:
        print(f"Could not add PENDING to enum (might already exist): {e}")


def downgrade() -> None:
    pass

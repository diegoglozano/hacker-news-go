"""modify stories table

Revision ID: be133a10ce0e
Revises: 72a3ad1a4d79
Create Date: 2026-02-01 23:16:56.629840

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'be133a10ce0e'
down_revision: Union[str, Sequence[str], None] = '72a3ad1a4d79'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.drop_column("stores", "type")


def downgrade() -> None:
    """Downgrade schema."""
    op.add_column("stories", sa.Column("type", sa.String(), nullable=False))

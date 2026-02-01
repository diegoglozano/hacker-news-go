"""enrich stories table

Revision ID: 72a3ad1a4d79
Revises: 3b20dfbc59e4
Create Date: 2026-02-01 23:09:17.985351

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '72a3ad1a4d79'
down_revision: Union[str, Sequence[str], None] = '3b20dfbc59e4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column("stories", sa.Column("by", sa.String(), nullable=False))
    op.add_column("stories", sa.Column("title", sa.String(), nullable=False))
    op.add_column("stories", sa.Column("descendants", sa.Integer(), nullable=True))
    op.add_column("stories", sa.Column("type", sa.String(), nullable=False))
    op.alter_column("stories", "text", nullable=True)
    op.alter_column("stories", "url", nullable=True)
    op.drop_column("stories", "name")


def downgrade() -> None:
    """Downgrade schema."""
    op.add_column("stories", sa.Column("name", sa.String(), nullable=False))
    op.drop_column("stories", "type")
    op.drop_column("stories", "descendants")
    op.drop_column("stories", "title")
    op.drop_column("stories", "by")
    op.alter_column("stories", "text", nullable=False)
    op.alter_column("stories", "url", nullable=False)

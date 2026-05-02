"""add gesponsord status and migrate existing sponsored clubs

Revision ID: 20260502_gesponsord_status
Revises: 9ac07d06ca65
Create Date: 2026-05-02 20:45:00.000000

"""

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260502_gesponsord_status"
down_revision: str | Sequence[str] | None = "7fe8f3932311"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("""
        UPDATE clubs SET status = 'gesponsord' WHERE is_sponsored = true AND status != 'gesponsord'
    """)


def downgrade() -> None:
    op.execute("""
        UPDATE clubs SET status = 'active', is_sponsored = true, sponsored_since = NOW() WHERE status = 'gesponsord'
    """)

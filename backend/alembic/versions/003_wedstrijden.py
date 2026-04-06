"""add wedstrijden table

Revision ID: 003_wedstrijden
Revises: 002_payments
Create Date: 2026-04-06

"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "003_wedstrijden"
down_revision: str | None = "002_payments"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "wedstrijden",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("ronde_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("thuisteam_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("uitteam_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("status", sa.String(20), server_default="ingepland"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("NOW()")),
        sa.ForeignKeyConstraint(["ronde_id"], ["speelrondes.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["thuisteam_id"], ["teams.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["uitteam_id"], ["teams.id"], ondelete="CASCADE"),
        sa.UniqueConstraint(
            "ronde_id", "thuisteam_id", "uitteam_id", name="uq_wedstrijden_ronde_teams"
        ),
    )
    op.create_index("idx_wedstrijden_ronde", "wedstrijden", ["ronde_id"])
    op.create_index("idx_wedstrijden_thuisteam", "wedstrijden", ["thuisteam_id"])
    op.create_index("idx_wedstrijden_uitteam", "wedstrijden", ["uitteam_id"])


def downgrade() -> None:
    op.drop_index("idx_wedstrijden_uitteam", table_name="wedstrijden")
    op.drop_index("idx_wedstrijden_thuisteam", table_name="wedstrijden")
    op.drop_index("idx_wedstrijden_ronde", table_name="wedstrijden")
    op.drop_table("wedstrijden")

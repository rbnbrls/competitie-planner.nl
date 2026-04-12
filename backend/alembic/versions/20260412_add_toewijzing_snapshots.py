"""add toewijzing_snapshots table

Revision ID: 20260412_add_toewijzing_snapshots
Revises: 20260412_add_competitie_format_fields
Create Date: 2026-04-12 00:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260412_add_toewijzing_snapshots"
down_revision: str | Sequence[str] | None = "20260412_add_competitie_format_fields"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "toewijzing_snapshots",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "ronde_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("speelrondes.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "club_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("clubs.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "aangemaakt_door",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id"),
            nullable=True,
        ),
        sa.Column("aanleiding", sa.String(50), nullable=False),
        sa.Column("snapshot_data", postgresql.JSON, nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("idx_snapshots_ronde", "toewijzing_snapshots", ["ronde_id"])


def downgrade() -> None:
    op.drop_index("idx_snapshots_ronde", table_name="toewijzing_snapshots")
    op.drop_table("toewijzing_snapshots")

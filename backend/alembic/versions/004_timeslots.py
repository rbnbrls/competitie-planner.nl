"""add timeslot support to baantoewijzingen

Revision ID: 004_timeslots
Revises: 003_wedstrijden
Create Date: 2026-04-06

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "004_timeslots"
down_revision: str | None = "003_wedstrijden"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.alter_column(
        "baantoewijzingen",
        "tijdslot_start",
        existing_type=sa.Time(),
        nullable=False,
        server_default=sa.text("'19:00:00'::time"),
    )
    op.drop_constraint("uq_toewijzingen_ronde_baan", "baantoewijzingen", type_="unique")
    op.create_unique_constraint(
        "uq_toewijzingen_ronde_baan_tijdslot",
        "baantoewijzingen",
        ["ronde_id", "baan_id", "tijdslot_start"],
    )


def downgrade() -> None:
    op.drop_constraint("uq_toewijzingen_ronde_baan_tijdslot", "baantoewijzingen", type_="unique")
    op.create_unique_constraint(
        "uq_toewijzingen_ronde_baan",
        "baantoewijzingen",
        ["ronde_id", "baan_id"],
    )
    op.alter_column(
        "baantoewijzingen",
        "tijdslot_start",
        existing_type=sa.Time(),
        nullable=True,
        server_default=None,
    )

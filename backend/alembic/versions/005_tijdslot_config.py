"""add tijdslot config to competities

Revision ID: 005_tijdslot_config
Revises: 004_timeslots
Create Date: 2026-04-06

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "005_tijdslot_config"
down_revision: str | None = "004_timeslots"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "competities",
        sa.Column("standaard_starttijden", sa.ARRAY(sa.Time()), server_default="{}", nullable=True),
    )
    op.add_column(
        "competities",
        sa.Column("eerste_datum", sa.Date(), nullable=True),
    )
    op.add_column(
        "competities",
        sa.Column("hergebruik_configuratie", sa.Boolean(), server_default="true", nullable=True),
    )


def downgrade() -> None:
    op.drop_column("competities", "hergebruik_configuratie")
    op.drop_column("competities", "eerste_datum")
    op.drop_column("competities", "standaard_starttijden")

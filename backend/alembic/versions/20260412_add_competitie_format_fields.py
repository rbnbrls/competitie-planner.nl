"""add format fields to competities

Revision ID: 20260412_competitie_fmt
Revises: 20260409_add_sponsor_fields
Create Date: 2026-04-12 00:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260412_competitie_fmt"
down_revision: str | Sequence[str] | None = "20260409_add_sponsor_fields"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("competities", sa.Column("competitie_type", sa.String(20), nullable=True))
    op.add_column(
        "competities",
        sa.Column("poule_grootte", sa.SmallInteger(), nullable=False, server_default="8"),
    )
    op.add_column(
        "competities",
        sa.Column("aantal_speeldagen", sa.SmallInteger(), nullable=False, server_default="7"),
    )
    op.add_column("competities", sa.Column("speelvorm", sa.String(20), nullable=True))
    op.add_column("competities", sa.Column("leeftijdscategorie", sa.String(20), nullable=True))


def downgrade() -> None:
    op.drop_column("competities", "leeftijdscategorie")
    op.drop_column("competities", "speelvorm")
    op.drop_column("competities", "aantal_speeldagen")
    op.drop_column("competities", "poule_grootte")
    op.drop_column("competities", "competitie_type")

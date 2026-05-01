"""
File: backend/alembic/versions/007_composite_indexes.py
Last updated: 2026-05-01
API version: 0.1.0
Author: Ruben Barels <ruben@rabar.nl>
Changelog:
  - 2026-05-01: Initial metadata header added
"""

"""add composite indexes

Revision ID: 007_composite_indexes
Revises: 006_iban_encryption
Create Date: 2026-04-06

"""

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "007_composite_indexes"
down_revision: str | None = "006_iban_encryption"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 1. Add index on (club_id, actief) for banen
    op.create_index("idx_banen_club_actief", "banen", ["club_id", "actief"], unique=False)

    # 2. Add index on (club_id, actief) for teams
    op.create_index("idx_teams_club_actief", "teams", ["club_id", "actief"], unique=False)

    # 3. Add index on (competitie_id, datum) for speelrondes
    op.create_index(
        "idx_rondes_competitie_datum", "speelrondes", ["competitie_id", "datum"], unique=False
    )


def downgrade() -> None:
    # 1. Remove index on (competitie_id, datum) for speelrondes
    op.drop_index("idx_rondes_competitie_datum", table_name="speelrondes")

    # 2. Remove index on (club_id, actief) for teams
    op.drop_index("idx_teams_club_actief", table_name="teams")

    # 3. Remove index on (club_id, actief) for banen
    op.drop_index("idx_banen_club_actief", table_name="banen")

"""
File: backend/alembic/versions/20260409_add_sponsor_fields.py
Last updated: 2026-05-01
API version: 0.1.0
Author: Ruben Barels <ruben@rabar.nl>
Changelog:
  - 2026-05-01: Initial metadata header added
"""

"""add sponsor fields to clubs

Revision ID: 20260409_add_sponsor_fields
Revises: 709d46bc8b51
Create Date: 2026-04-09 14:29:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260409_add_sponsor_fields"
down_revision: str | Sequence[str] | None = "709d46bc8b51"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "clubs", sa.Column("is_sponsored", sa.Boolean(), nullable=False, server_default="false")
    )
    op.add_column("clubs", sa.Column("sponsored_since", sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column("clubs", "is_sponsored")
    op.drop_column("clubs", "sponsored_since")

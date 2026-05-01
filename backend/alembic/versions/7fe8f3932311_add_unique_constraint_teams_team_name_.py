"""add_unique_constraint_teams_team_name_per_competitie

Revision ID: 7fe8f3932311
Revises: 9ac07d06ca65
Create Date: 2026-05-01 18:30:34.323337

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7fe8f3932311'
down_revision: Union[str, Sequence[str], None] = '9ac07d06ca65'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_unique_constraint(
        "uq_teams_club_competitie_naam",
        "teams",
        ["club_id", "competitie_id", "naam"],
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint(
        "uq_teams_club_competitie_naam",
        "teams",
        type_="unique",
    )

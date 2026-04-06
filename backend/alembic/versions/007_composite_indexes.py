"""add composite indexes

Revision ID: 007_composite_indexes
Revises: 006_iban_encryption
Create Date: 2026-04-06

"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '007_composite_indexes'
down_revision: Union[str, None] = '006_iban_encryption'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add index on (club_id, actief) for banen
    op.create_index('idx_banen_club_actief', 'banen', ['club_id', 'actief'], unique=False)
    
    # 2. Add index on (club_id, actief) for teams
    op.create_index('idx_teams_club_actief', 'teams', ['club_id', 'actief'], unique=False)
    
    # 3. Add index on (competitie_id, datum) for speelrondes
    op.create_index('idx_rondes_competitie_datum', 'speelrondes', ['competitie_id', 'datum'], unique=False)


def downgrade() -> None:
    # 1. Remove index on (competitie_id, datum) for speelrondes
    op.drop_index('idx_rondes_competitie_datum', table_name='speelrondes')
    
    # 2. Remove index on (club_id, actief) for teams
    op.drop_index('idx_teams_club_actief', table_name='teams')
    
    # 3. Remove index on (club_id, actief) for banen
    op.drop_index('idx_banen_club_actief', table_name='banen')

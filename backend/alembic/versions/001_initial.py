"""create initial tables

Revision ID: 001_initial
Revises:
Create Date: 2025-04-05

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "clubs",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("naam", sa.String(100), nullable=False),
        sa.Column("slug", sa.String(30), nullable=False, unique=True),
        sa.Column("adres", sa.Text(), nullable=True),
        sa.Column("postcode", sa.String(10), nullable=True),
        sa.Column("stad", sa.String(100), nullable=True),
        sa.Column("telefoon", sa.String(20), nullable=True),
        sa.Column("website", sa.String(255), nullable=True),
        sa.Column("primary_color", sa.String(7), server_default="#1B5E20"),
        sa.Column("secondary_color", sa.String(7), server_default="#FFFFFF"),
        sa.Column("accent_color", sa.String(7), server_default="#FFC107"),
        sa.Column("logo_url", sa.Text(), nullable=True),
        sa.Column("font_choice", sa.String(50), server_default="default"),
        sa.Column("status", sa.String(20), server_default="trial"),
        sa.Column("trial_ends_at", sa.DateTime(), nullable=True),
        sa.Column("max_banen", sa.SmallInteger(), server_default="8"),
        sa.Column("max_competities", sa.SmallInteger(), server_default="5"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("NOW()")),
    )
    op.create_index("idx_clubs_slug", "clubs", ["slug"])
    op.create_index("idx_clubs_status", "clubs", ["status"])

    op.create_table(
        "users",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("club_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("full_name", sa.String(100), nullable=True),
        sa.Column("role", sa.String(20), nullable=False),
        sa.Column("is_superadmin", sa.Boolean(), server_default="false"),
        sa.Column("is_active", sa.Boolean(), server_default="true"),
        sa.Column("last_login", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("NOW()")),
        sa.ForeignKeyConstraint(["club_id"], ["clubs.id"], ondelete="CASCADE"),
    )
    op.create_index("idx_users_club", "users", ["club_id"])
    op.create_index("idx_users_email", "users", ["email"])

    op.create_table(
        "invite_tokens",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("club_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("role", sa.String(20), nullable=False),
        sa.Column("token", sa.String(64), nullable=False, unique=True),
        sa.Column("used", sa.Boolean(), server_default="false"),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("NOW()")),
        sa.ForeignKeyConstraint(["club_id"], ["clubs.id"], ondelete="CASCADE"),
    )
    op.create_index("idx_invite_tokens_club", "invite_tokens", ["club_id"])

    op.create_table(
        "banen",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("club_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("nummer", sa.SmallInteger(), nullable=False),
        sa.Column("naam", sa.String(50), nullable=True),
        sa.Column("verlichting_type", sa.String(20), server_default="geen"),
        sa.Column("overdekt", sa.Boolean(), server_default="false"),
        sa.Column("prioriteit_score", sa.SmallInteger(), server_default="5"),
        sa.Column("actief", sa.Boolean(), server_default="true"),
        sa.Column("notitie", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("NOW()")),
        sa.ForeignKeyConstraint(["club_id"], ["clubs.id"], ondelete="CASCADE"),
        sa.UniqueConstraint("club_id", "nummer", name="uq_banen_club_nummer"),
    )
    op.create_index("idx_banen_club", "banen", ["club_id"])

    op.create_table(
        "competities",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("club_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("naam", sa.String(100), nullable=False),
        sa.Column("speeldag", sa.String(10), nullable=False),
        sa.Column("start_datum", sa.Date(), nullable=False),
        sa.Column("eind_datum", sa.Date(), nullable=False),
        sa.Column("feestdagen", postgresql.ARRAY(sa.Date()), server_default="{}"),
        sa.Column("inhaal_datums", postgresql.ARRAY(sa.Date()), server_default="{}"),
        sa.Column("actief", sa.Boolean(), server_default="true"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("NOW()")),
        sa.ForeignKeyConstraint(["club_id"], ["clubs.id"], ondelete="CASCADE"),
    )
    op.create_index("idx_competities_club", "competities", ["club_id"])

    op.create_table(
        "teams",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("club_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("competitie_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("naam", sa.String(100), nullable=False),
        sa.Column("captain_naam", sa.String(100), nullable=True),
        sa.Column("captain_email", sa.String(255), nullable=True),
        sa.Column("speelklasse", sa.String(50), nullable=True),
        sa.Column("knltb_team_id", sa.String(50), nullable=True),
        sa.Column("actief", sa.Boolean(), server_default="true"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("NOW()")),
        sa.ForeignKeyConstraint(["club_id"], ["clubs.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["competitie_id"], ["competities.id"], ondelete="CASCADE"),
    )
    op.create_index("idx_teams_competitie", "teams", ["competitie_id"])
    op.create_index("idx_teams_club", "teams", ["club_id"])

    op.create_table(
        "speelrondes",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("competitie_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("club_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("datum", sa.Date(), nullable=False),
        sa.Column("week_nummer", sa.SmallInteger(), nullable=True),
        sa.Column("is_inhaalronde", sa.Boolean(), server_default="false"),
        sa.Column("status", sa.String(20), server_default="concept"),
        sa.Column("gepubliceerd_op", sa.DateTime(), nullable=True),
        sa.Column("gepubliceerd_door", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("public_token", sa.String(64), nullable=True, unique=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("NOW()")),
        sa.ForeignKeyConstraint(["competitie_id"], ["competities.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["club_id"], ["clubs.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["gepubliceerd_door"], ["users.id"]),
        sa.UniqueConstraint("competitie_id", "datum", name="uq_rondes_competitie_datum"),
    )
    op.create_index("idx_rondes_competitie", "speelrondes", ["competitie_id"])
    op.create_index("idx_rondes_datum", "speelrondes", ["datum"])
    op.create_index("idx_rondes_token", "speelrondes", ["public_token"])

    op.create_table(
        "baantoewijzingen",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("ronde_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("team_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("baan_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("tijdslot_start", sa.Time(), nullable=True),
        sa.Column("tijdslot_eind", sa.Time(), nullable=True),
        sa.Column("notitie", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("NOW()")),
        sa.ForeignKeyConstraint(["ronde_id"], ["speelrondes.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["team_id"], ["teams.id"]),
        sa.ForeignKeyConstraint(["baan_id"], ["banen.id"]),
        sa.UniqueConstraint("ronde_id", "baan_id", name="uq_toewijzingen_ronde_baan"),
    )
    op.create_index("idx_toewijzingen_ronde", "baantoewijzingen", ["ronde_id"])
    op.create_index("idx_toewijzingen_team", "baantoewijzingen", ["team_id"])

    op.create_table(
        "planninghistorie",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("club_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("competitie_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("team_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("baan_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("aantal_keer", sa.SmallInteger(), server_default="0"),
        sa.Column("totaal_score", sa.Numeric(8, 2), server_default="0"),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("NOW()")),
        sa.ForeignKeyConstraint(["club_id"], ["clubs.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["competitie_id"], ["competities.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["team_id"], ["teams.id"]),
        sa.ForeignKeyConstraint(["baan_id"], ["banen.id"]),
        sa.UniqueConstraint(
            "competitie_id", "team_id", "baan_id", name="uq_historie_competitie_team_baan"
        ),
    )
    op.create_index("idx_historie_competitie", "planninghistorie", ["competitie_id"])
    op.create_index("idx_historie_team", "planninghistorie", ["team_id"])


def downgrade() -> None:
    op.drop_table("planninghistorie")
    op.drop_table("baantoewijzingen")
    op.drop_table("speelrondes")
    op.drop_table("teams")
    op.drop_table("competities")
    op.drop_table("banen")
    op.drop_table("invite_tokens")
    op.drop_table("users")
    op.drop_table("clubs")

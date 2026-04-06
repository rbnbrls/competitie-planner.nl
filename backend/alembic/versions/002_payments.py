"""add payments tables

Revision ID: 002_payments
Revises: 001_initial
Create Date: 2025-04-06

"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "002_payments"
down_revision: str | None = "001_initial"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "clubs",
        sa.Column("payment_enabled", sa.Boolean(), server_default="false"),
    )

    op.create_table(
        "mollie_config",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("api_key", sa.String(100), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("NOW()")),
    )

    op.create_table(
        "competition_prices",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("competitie_naam", sa.String(100), nullable=False),
        sa.Column("price_small_club", sa.SmallInteger(), nullable=False),
        sa.Column("price_large_club", sa.SmallInteger(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("NOW()")),
    )

    op.create_table(
        "sepa_mandates",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("club_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("mollie_mandate_id", sa.String(100), nullable=False, unique=True),
        sa.Column("mandate_reference", sa.String(100), nullable=False),
        sa.Column("consumer_name", sa.String(100), nullable=False),
        sa.Column("iban", sa.String(34), nullable=False),
        sa.Column("status", sa.String(20), server_default="pending"),
        sa.Column("signed_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("NOW()")),
        sa.ForeignKeyConstraint(["club_id"], ["clubs.id"], ondelete="CASCADE"),
    )
    op.create_index("idx_sepa_mandates_club", "sepa_mandates", ["club_id"])

    op.create_table(
        "payments",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("club_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("mandate_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("competitie_naam", sa.String(100), nullable=False),
        sa.Column("amount", sa.SmallInteger(), nullable=False),
        sa.Column("mollie_payment_id", sa.String(100), nullable=True),
        sa.Column("mollie_payment_status", sa.String(20), nullable=True),
        sa.Column("status", sa.String(20), server_default="pending"),
        sa.Column("paid_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("NOW()")),
        sa.ForeignKeyConstraint(["club_id"], ["clubs.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["mandate_id"], ["sepa_mandates.id"]),
    )
    op.create_index("idx_payments_club", "payments", ["club_id"])


def downgrade() -> None:
    op.drop_table("payments")
    op.drop_table("sepa_mandates")
    op.drop_table("competition_prices")
    op.drop_table("mollie_config")
    op.drop_column("clubs", "payment_enabled")

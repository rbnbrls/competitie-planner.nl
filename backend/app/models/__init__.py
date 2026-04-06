import uuid
from datetime import date, datetime, time
from typing import Optional

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Numeric,
    SmallInteger,
    String,
    Text,
    Time,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class Club(Base):
    __tablename__ = "clubs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    naam: Mapped[str] = mapped_column(String(100), nullable=False)
    slug: Mapped[str] = mapped_column(String(30), unique=True, nullable=False)
    adres: Mapped[str | None] = mapped_column(Text, default=None)
    postcode: Mapped[str | None] = mapped_column(String(10), default=None)
    stad: Mapped[str | None] = mapped_column(String(100), default=None)
    telefoon: Mapped[str | None] = mapped_column(String(20), default=None)
    website: Mapped[str | None] = mapped_column(String(255), default=None)

    primary_color: Mapped[str] = mapped_column(String(7), default="#1B5E20")
    secondary_color: Mapped[str] = mapped_column(String(7), default="#FFFFFF")
    accent_color: Mapped[str] = mapped_column(String(7), default="#FFC107")
    logo_url: Mapped[str | None] = mapped_column(Text, default=None)
    font_choice: Mapped[str] = mapped_column(String(50), default="default")

    status: Mapped[str] = mapped_column(String(20), default="trial")
    trial_ends_at: Mapped[datetime | None] = mapped_column(DateTime, default=None)
    max_banen: Mapped[int] = mapped_column(SmallInteger, default=8)
    max_competities: Mapped[int] = mapped_column(SmallInteger, default=5)
    billing_info: Mapped[str | None] = mapped_column(Text, default=None)
    payment_enabled: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    users: Mapped[list["User"]] = relationship("User", back_populates="club")
    banen: Mapped[list["Baan"]] = relationship("Baan", back_populates="club")
    competities: Mapped[list["Competitie"]] = relationship("Competitie", back_populates="club")


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    club_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("clubs.id", ondelete="CASCADE"), default=None
    )

    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str | None] = mapped_column(String(100), default=None)
    role: Mapped[str] = mapped_column(String(20), nullable=False)
    is_superadmin: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    email_opt_out: Mapped[bool] = mapped_column(Boolean, default=False)
    onboarding_completed: Mapped[bool] = mapped_column(Boolean, default=False)

    last_login: Mapped[datetime | None] = mapped_column(DateTime, default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    club: Mapped[Optional["Club"]] = relationship("Club", back_populates="users")


class InviteToken(Base):
    __tablename__ = "invite_tokens"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    club_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("clubs.id", ondelete="CASCADE"),
        nullable=False,
    )
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False)
    token: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    used: Mapped[bool] = mapped_column(Boolean, default=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    __table_args__ = (Index("idx_invite_tokens_club", "club_id"),)


class Baan(Base):
    __tablename__ = "banen"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    club_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("clubs.id", ondelete="CASCADE"),
        nullable=False,
    )

    nummer: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    naam: Mapped[str | None] = mapped_column(String(50), default=None)
    verlichting_type: Mapped[str] = mapped_column(String(20), default="geen")
    overdekt: Mapped[bool] = mapped_column(Boolean, default=False)
    prioriteit_score: Mapped[int] = mapped_column(SmallInteger, default=5)
    actief: Mapped[bool] = mapped_column(Boolean, default=True)
    notitie: Mapped[str | None] = mapped_column(Text, default=None)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    __table_args__ = (
        UniqueConstraint("club_id", "nummer", name="uq_banen_club_nummer"),
        Index("idx_banen_club", "club_id"),
    )

    club: Mapped["Club"] = relationship("Club", back_populates="banen")


class Competitie(Base):
    __tablename__ = "competities"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    club_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("clubs.id", ondelete="CASCADE"),
        nullable=False,
    )

    naam: Mapped[str] = mapped_column(String(100), nullable=False)
    speeldag: Mapped[str] = mapped_column(String(10), nullable=False)
    start_datum: Mapped[date] = mapped_column(Date, nullable=False)
    eind_datum: Mapped[date] = mapped_column(Date, nullable=False)
    feestdagen: Mapped[list[date]] = mapped_column(ARRAY(Date), default=[])
    inhaal_datums: Mapped[list[date]] = mapped_column(ARRAY(Date), default=[])
    actief: Mapped[bool] = mapped_column(Boolean, default=True)
    email_notifications_enabled: Mapped[bool] = mapped_column(Boolean, default=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    __table_args__ = (Index("idx_competities_club", "club_id"),)

    club: Mapped["Club"] = relationship("Club", back_populates="competities")
    teams: Mapped[list["Team"]] = relationship("Team", back_populates="competitie")
    speelrondes: Mapped[list["Speelronde"]] = relationship(
        "Speelronde", back_populates="competitie"
    )
    planninghistorie: Mapped[list["PlanningHistorie"]] = relationship(
        "PlanningHistorie", back_populates="competitie"
    )


class Team(Base):
    __tablename__ = "teams"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    club_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("clubs.id", ondelete="CASCADE"),
        nullable=False,
    )
    competitie_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("competities.id", ondelete="CASCADE"),
        nullable=False,
    )

    naam: Mapped[str] = mapped_column(String(100), nullable=False)
    captain_naam: Mapped[str | None] = mapped_column(String(100), default=None)
    captain_email: Mapped[str | None] = mapped_column(String(255), default=None)
    speelklasse: Mapped[str | None] = mapped_column(String(50), default=None)
    knltb_team_id: Mapped[str | None] = mapped_column(String(50), default=None)
    actief: Mapped[bool] = mapped_column(Boolean, default=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    __table_args__ = (
        Index("idx_teams_competitie", "competitie_id"),
        Index("idx_teams_club", "club_id"),
    )

    competitie: Mapped["Competitie"] = relationship("Competitie", back_populates="teams")


class Speelronde(Base):
    __tablename__ = "speelrondes"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    competitie_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("competities.id", ondelete="CASCADE"),
        nullable=False,
    )
    club_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("clubs.id", ondelete="CASCADE"),
        nullable=False,
    )

    datum: Mapped[date] = mapped_column(Date, nullable=False)
    week_nummer: Mapped[int | None] = mapped_column(SmallInteger, default=None)
    is_inhaalronde: Mapped[bool] = mapped_column(Boolean, default=False)
    status: Mapped[str] = mapped_column(String(20), default="concept")

    gepubliceerd_op: Mapped[datetime | None] = mapped_column(DateTime, default=None)
    gepubliceerd_door: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), default=None
    )
    public_token: Mapped[str | None] = mapped_column(String(64), unique=True, default=None)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    __table_args__ = (
        UniqueConstraint("competitie_id", "datum", name="uq_rondes_competitie_datum"),
        Index("idx_rondes_competitie", "competitie_id"),
        Index("idx_rondes_datum", "datum"),
        Index("idx_rondes_token", "public_token"),
    )

    competitie: Mapped["Competitie"] = relationship("Competitie", back_populates="speelrondes")
    baantoewijzingen: Mapped[list["BaanToewijzing"]] = relationship(
        "BaanToewijzing", back_populates="ronde"
    )


class BaanToewijzing(Base):
    __tablename__ = "baantoewijzingen"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ronde_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("speelrondes.id", ondelete="CASCADE"),
        nullable=False,
    )
    team_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("teams.id"), nullable=False
    )
    baan_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("banen.id"), nullable=False
    )

    tijdslot_start: Mapped[time | None] = mapped_column(Time, default=None)
    tijdslot_eind: Mapped[time | None] = mapped_column(Time, default=None)
    notitie: Mapped[str | None] = mapped_column(Text, default=None)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    __table_args__ = (
        UniqueConstraint("ronde_id", "baan_id", name="uq_toewijzingen_ronde_baan"),
        Index("idx_toewijzingen_ronde", "ronde_id"),
        Index("idx_toewijzingen_team", "team_id"),
    )

    ronde: Mapped["Speelronde"] = relationship("Speelronde", back_populates="baantoewijzingen")
    team: Mapped["Team"] = relationship("Team")
    baan: Mapped["Baan"] = relationship("Baan")


class PlanningHistorie(Base):
    __tablename__ = "planninghistorie"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    club_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("clubs.id", ondelete="CASCADE"),
        nullable=False,
    )
    competitie_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("competities.id", ondelete="CASCADE"),
        nullable=False,
    )
    team_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("teams.id"), nullable=False
    )
    baan_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("banen.id"), nullable=False
    )

    aantal_keer: Mapped[int] = mapped_column(SmallInteger, default=0)
    totaal_score: Mapped[float] = mapped_column(Numeric(8, 2), default=0)

    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    __table_args__ = (
        UniqueConstraint(
            "competitie_id",
            "team_id",
            "baan_id",
            name="uq_historie_competitie_team_baan",
        ),
        Index("idx_historie_competitie", "competitie_id"),
        Index("idx_historie_team", "team_id"),
    )

    competitie: Mapped["Competitie"] = relationship("Competitie", back_populates="planninghistorie")
    team: Mapped["Team"] = relationship("Team")
    baan: Mapped["Baan"] = relationship("Baan")


class StatusChange(Base):
    __tablename__ = "status_changes"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    club_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("clubs.id", ondelete="CASCADE"),
        nullable=False,
    )
    changed_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), default=None
    )
    old_status: Mapped[str | None] = mapped_column(String(20), default=None)
    new_status: Mapped[str] = mapped_column(String(20), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    __table_args__ = (Index("idx_status_changes_club", "club_id"),)


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    club_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("clubs.id", ondelete="CASCADE"),
        nullable=False,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    token: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    used: Mapped[bool] = mapped_column(Boolean, default=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    __table_args__ = (Index("idx_password_reset_tokens_user", "user_id"),)

    club: Mapped["Club"] = relationship("Club")
    user: Mapped["User"] = relationship("User")


class MollieConfig(Base):
    __tablename__ = "mollie_config"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    api_key: Mapped[str] = mapped_column(String(100), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )


class CompetitionPrice(Base):
    __tablename__ = "competition_prices"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    competitie_naam: Mapped[str] = mapped_column(String(100), nullable=False)
    price_small_club: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    price_large_club: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )


class SepaMandate(Base):
    __tablename__ = "sepa_mandates"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    club_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("clubs.id", ondelete="CASCADE"),
        nullable=False,
    )
    mollie_mandate_id: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    mandate_reference: Mapped[str] = mapped_column(String(100), nullable=False)
    consumer_name: Mapped[str] = mapped_column(String(100), nullable=False)
    iban: Mapped[str] = mapped_column(String(34), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    signed_at: Mapped[datetime | None] = mapped_column(DateTime, default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    __table_args__ = (Index("idx_sepa_mandates_club", "club_id"),)

    club: Mapped["Club"] = relationship("Club")


class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    club_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("clubs.id", ondelete="CASCADE"),
        nullable=False,
    )
    mandate_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("sepa_mandates.id"),
        nullable=False,
    )
    competitie_naam: Mapped[str] = mapped_column(String(100), nullable=False)
    amount: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    mollie_payment_id: Mapped[str | None] = mapped_column(String(100), default=None)
    mollie_payment_status: Mapped[str | None] = mapped_column(String(20), default=None)
    status: Mapped[str] = mapped_column(String(20), default="pending")
    paid_at: Mapped[datetime | None] = mapped_column(DateTime, default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    __table_args__ = (Index("idx_payments_club", "club_id"),)

    club: Mapped["Club"] = relationship("Club")
    mandate: Mapped["SepaMandate"] = relationship("SepaMandate")

import uuid
from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Index, SmallInteger, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


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
        Index("idx_rondes_competitie_datum", "competitie_id", "datum"),
        Index("idx_rondes_club_status", "club_id", "status"),
    )

    competitie: Mapped["Competitie"] = relationship("Competitie", back_populates="speelrondes")
    baantoewijzingen: Mapped[list["BaanToewijzing"]] = relationship(
        "BaanToewijzing", back_populates="ronde", cascade="all, delete-orphan"
    )
    wedstrijden: Mapped[list["Wedstrijd"]] = relationship(
        "Wedstrijd", back_populates="ronde", cascade="all, delete-orphan"
    )

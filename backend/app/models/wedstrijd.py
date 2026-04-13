import uuid
from datetime import date, datetime, time

from sqlalchemy import (
    Date,
    DateTime,
    ForeignKey,
    Index,
    SmallInteger,
    String,
    Text,
    Time,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class Wedstrijd(Base):
    __tablename__ = "wedstrijden"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    competitie_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("competities.id", ondelete="CASCADE"),
        nullable=False,
    )
    ronde_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("speelrondes.id", ondelete="CASCADE"),
        nullable=False,
    )
    thuisteam_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("teams.id", ondelete="CASCADE"),
        nullable=False,
    )
    uitteam_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("teams.id", ondelete="CASCADE"),
        nullable=False,
    )
    status: Mapped[str] = mapped_column(String(20), default="gepland")
    speeldatum: Mapped[date | None] = mapped_column(Date, default=None)
    speeltijd: Mapped[time | None] = mapped_column(Time, default=None)
    baan_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("banen.id"), default=None
    )
    uitslag_thuisteam: Mapped[int | None] = mapped_column(SmallInteger, default=None)
    uitslag_uitteam: Mapped[int | None] = mapped_column(SmallInteger, default=None)
    scorendetails: Mapped[str | None] = mapped_column(Text, default=None)
    notitie: Mapped[str | None] = mapped_column(Text, default=None)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    __table_args__ = (
        UniqueConstraint(
            "ronde_id", "thuisteam_id", "uitteam_id", name="uq_wedstrijden_ronde_teams"
        ),
        Index("idx_wedstrijden_competitie", "competitie_id"),
        Index("idx_wedstrijden_ronde", "ronde_id"),
        Index("idx_wedstrijden_thuisteam", "thuisteam_id"),
        Index("idx_wedstrijden_uitteam", "uitteam_id"),
    )

    competitie: Mapped["Competitie"] = relationship("Competitie")
    ronde: Mapped["Speelronde"] = relationship("Speelronde")
    thuisteam: Mapped["Team"] = relationship(
        "Team", foreign_keys=[thuisteam_id], back_populates="wedstrijden_thuis"
    )
    uitteam: Mapped["Team"] = relationship(
        "Team", foreign_keys=[uitteam_id], back_populates="wedstrijden_uit"
    )
    baan: Mapped["Baan"] = relationship("Baan")

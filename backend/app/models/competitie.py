"""
File: backend/app/models/competitie.py
Last updated: 2026-05-01
API version: 0.1.0
Author: Ruben Barels <ruben@rabar.nl>
Changelog:
  - 2026-05-01: Initial metadata header added
"""

import uuid
from datetime import date, datetime, time

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Index, SmallInteger, String, Time
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


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
    standaard_starttijden: Mapped[list[time]] = mapped_column(ARRAY(Time), default=[])
    eerste_datum: Mapped[date | None] = mapped_column(Date, default=None)
    hergebruik_configuratie: Mapped[bool] = mapped_column(Boolean, default=True)
    reminder_days_before: Mapped[int] = mapped_column(SmallInteger, default=3)
    competitie_type: Mapped[str | None] = mapped_column(String(20), default=None)
    poule_grootte: Mapped[int] = mapped_column(SmallInteger, default=8)
    aantal_speeldagen: Mapped[int] = mapped_column(SmallInteger, default=7)
    speelvorm: Mapped[str | None] = mapped_column(String(20), default=None)
    leeftijdscategorie: Mapped[str | None] = mapped_column(String(20), default=None)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    __table_args__ = (Index("idx_competities_club", "club_id"),)

    club: Mapped["Club"] = relationship("Club", back_populates="competities")
    teams: Mapped[list["Team"]] = relationship(
        "Team", back_populates="competitie", cascade="all, delete-orphan"
    )
    speelrondes: Mapped[list["Speelronde"]] = relationship(
        "Speelronde", back_populates="competitie", cascade="all, delete-orphan"
    )
    planninghistorie: Mapped[list["PlanningHistorie"]] = relationship(
        "PlanningHistorie", back_populates="competitie", cascade="all, delete-orphan"
    )

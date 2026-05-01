"""
File: backend/app/models/team.py
Last updated: 2026-05-01
API version: 0.1.0
Author: Ruben Barels <ruben@rabar.nl>
Changelog:
  - 2026-05-01: Initial metadata header added
"""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


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
    public_token: Mapped[str] = mapped_column(
        String(64), unique=True, default=lambda: uuid.uuid4().hex
    )

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    __table_args__ = (
        Index("idx_teams_competitie", "competitie_id"),
        Index("idx_teams_club", "club_id"),
        Index("idx_teams_club_actief", "club_id", "actief"),
        Index("idx_teams_club_competitie", "club_id", "competitie_id"),
        UniqueConstraint("club_id", "competitie_id", "naam", name="uq_teams_club_competitie_naam"),
    )

    competitie: Mapped["Competitie"] = relationship("Competitie", back_populates="teams")
    club: Mapped["Club"] = relationship("Club", back_populates="teams")
    wedstrijden_thuis: Mapped[list["Wedstrijd"]] = relationship(
        "Wedstrijd",
        foreign_keys="Wedstrijd.thuisteam_id",
        back_populates="thuisteam",
        cascade="all, delete-orphan",
    )
    wedstrijden_uit: Mapped[list["Wedstrijd"]] = relationship(
        "Wedstrijd",
        foreign_keys="Wedstrijd.uitteam_id",
        back_populates="uitteam",
        cascade="all, delete-orphan",
    )
    baantoewijzingen: Mapped[list["BaanToewijzing"]] = relationship(
        "BaanToewijzing", back_populates="team", cascade="all, delete-orphan"
    )
    beschikbaarheden: Mapped[list["Beschikbaarheid"]] = relationship(
        "Beschikbaarheid", back_populates="team", cascade="all, delete-orphan"
    )

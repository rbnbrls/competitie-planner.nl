"""
File: backend/app/models/baan_toewijzing.py
Last updated: 2026-05-01
API version: 0.1.0
Author: Ruben Barels <ruben@rabar.nl>
Changelog:
  - 2026-05-01: Initial metadata header added
"""

import uuid
from datetime import datetime, time

from sqlalchemy import DateTime, ForeignKey, Index, Text, Time, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


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

    tijdslot_start: Mapped[time] = mapped_column(Time, nullable=False, default=time(19, 0))
    tijdslot_eind: Mapped[time | None] = mapped_column(Time, default=None)
    notitie: Mapped[str | None] = mapped_column(Text, default=None)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    __table_args__ = (
        UniqueConstraint(
            "ronde_id", "baan_id", "tijdslot_start", name="uq_toewijzingen_ronde_baan_tijdslot"
        ),
        Index("idx_toewijzingen_ronde", "ronde_id"),
        Index("idx_toewijzingen_team", "team_id"),
        Index("idx_toewijzingen_ronde_baan", "ronde_id", "baan_id"),
    )

    ronde: Mapped["Speelronde"] = relationship("Speelronde", back_populates="baantoewijzingen")
    team: Mapped["Team"] = relationship("Team")
    baan: Mapped["Baan"] = relationship("Baan")

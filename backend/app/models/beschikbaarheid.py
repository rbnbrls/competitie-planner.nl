"""
File: backend/app/models/beschikbaarheid.py
Last updated: 2026-05-01
API version: 0.1.0
Author: Ruben Barels <ruben@rabar.nl>
Changelog:
  - 2026-05-01: Initial metadata header added
"""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class Beschikbaarheid(Base):
    __tablename__ = "beschikbaarheid"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    team_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("teams.id", ondelete="CASCADE"), nullable=False
    )
    ronde_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("speelrondes.id", ondelete="CASCADE"), nullable=False
    )

    is_beschikbaar: Mapped[bool] = mapped_column(Boolean, default=True)
    notitie: Mapped[str | None] = mapped_column(Text, default=None)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    __table_args__ = (
        UniqueConstraint("team_id", "ronde_id", name="uq_beschikbaarheid_team_ronde"),
        Index("idx_beschikbaarheid_team", "team_id"),
        Index("idx_beschikbaarheid_ronde", "ronde_id"),
    )

    team: Mapped["Team"] = relationship("Team", back_populates="beschikbaarheden")
    ronde: Mapped["Speelronde"] = relationship("Speelronde")

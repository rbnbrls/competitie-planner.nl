"""
File: backend/app/models/club.py
Last updated: 2026-05-01
API version: 0.1.0
Author: Ruben Barels <ruben@rabar.nl>
Changelog:
  - 2026-05-01: Initial metadata header added
"""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, SmallInteger, String, Text
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
    max_thuisteams_per_dag: Mapped[int] = mapped_column(SmallInteger, default=3)
    banen_types: Mapped[list[str]] = mapped_column(ARRAY(String(20)), default=["gravel"])
    billing_info: Mapped[str | None] = mapped_column(Text, default=None)
    payment_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    is_sponsored: Mapped[bool] = mapped_column(Boolean, default=False)
    sponsored_since: Mapped[datetime | None] = mapped_column(DateTime, default=None)

    heeft_buitenbanen: Mapped[bool] = mapped_column(Boolean, default=False)
    latitude: Mapped[float | None] = mapped_column(Float, default=None)
    longitude: Mapped[float | None] = mapped_column(Float, default=None)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    users: Mapped[list["User"]] = relationship("User", back_populates="club")
    banen: Mapped[list["Baan"]] = relationship("Baan", back_populates="club")
    competities: Mapped[list["Competitie"]] = relationship("Competitie", back_populates="club")
    teams: Mapped[list["Team"]] = relationship("Team", back_populates="club")

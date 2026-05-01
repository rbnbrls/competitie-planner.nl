"""
File: backend/app/models/payment.py
Last updated: 2026-05-01
API version: 0.1.0
Author: Ruben Barels <ruben@rabar.nl>
Changelog:
  - 2026-05-01: Initial metadata header added
"""

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, SmallInteger, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


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

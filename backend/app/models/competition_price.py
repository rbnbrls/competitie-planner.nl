import uuid
from datetime import datetime

from sqlalchemy import DateTime, SmallInteger, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


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

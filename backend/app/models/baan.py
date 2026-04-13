import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, SmallInteger, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


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
        Index("idx_banen_club_actief", "club_id", "actief"),
        Index("idx_banen_club_actief_nummer", "club_id", "actief", "nummer"),
    )

    club: Mapped["Club"] = relationship("Club", back_populates="banen")

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, Numeric, SmallInteger, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class PlanningHistorie(Base):
    __tablename__ = "planninghistorie"

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
    team_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("teams.id"), nullable=False
    )
    baan_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("banen.id"), nullable=False
    )

    aantal_keer: Mapped[int] = mapped_column(SmallInteger, default=0)
    totaal_score: Mapped[float] = mapped_column(Numeric(8, 2), default=0)

    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    __table_args__ = (
        UniqueConstraint(
            "competitie_id",
            "team_id",
            "baan_id",
            name="uq_historie_competitie_team_baan",
        ),
        Index("idx_historie_competitie", "competitie_id"),
        Index("idx_historie_team", "team_id"),
    )

    competitie: Mapped["Competitie"] = relationship("Competitie", back_populates="planninghistorie")
    team: Mapped["Team"] = relationship("Team")
    baan: Mapped["Baan"] = relationship("Baan")

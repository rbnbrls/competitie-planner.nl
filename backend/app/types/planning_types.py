from typing import TypedDict, Optional
from datetime import datetime, date, time
from uuid import UUID


class PlanningConflict(TypedDict):
    type: str  # "overlap", "double_booking", etc.
    description: str
    severity: str  # "error", "warning"
    entities: list[str]  # IDs of conflicting entities


class TimeSlotAssignment(TypedDict):
    team_id: UUID
    baan_id: UUID
    tijdslot_start: time
    tijdslot_eind: Optional[time]
    notitie: Optional[str]


class RoundPlanningResult(TypedDict):
    ronde_id: UUID
    toewijzingen: list[TimeSlotAssignment]
    conflicten: list[PlanningConflict]
    status: str  # "success", "partial", "failed"

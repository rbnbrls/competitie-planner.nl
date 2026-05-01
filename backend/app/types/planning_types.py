"""
File: backend/app/types/planning_types.py
Last updated: 2026-05-01
API version: 0.1.0
Author: Ruben Barels <ruben@rabar.nl>
Changelog:
  - 2026-05-01: Initial metadata header added
"""

from datetime import time
from typing import TypedDict
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
    tijdslot_eind: time | None
    notitie: str | None


class RoundPlanningResult(TypedDict):
    ronde_id: UUID
    toewijzingen: list[TimeSlotAssignment]
    conflicten: list[PlanningConflict]
    status: str  # "success", "partial", "failed"

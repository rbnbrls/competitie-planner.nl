from datetime import date

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from app.db import get_db
from app.services.tenant_auth import get_current_tenant_user
from app.services.planning import (
    bereken_banenvereisten,
    detecteer_conflicten,
    plan_banen,
    validate_club_max_thuisteams,
)

router = APIRouter(prefix="/api/v1/dagoverzicht", tags=["dagoverzicht"])


class CompetitieOverzicht(BaseModel):
    competitie_id: str
    team_naam: str
    competitie_naam: str
    divisie: str
    banen_nodig: int
    voorkeur_tijd: str
    speeldag: str | None = None


class DagoverzichtResponse(BaseModel):
    datum: str
    club_id: str
    club_naam: str
    beschikbare_banen: int
    max_thuisteams_per_dag: int
    competities: list[CompetitieOverzicht]
    training_gepland: bool = False
    vrije_spelers: bool = False
    conflict_warning: bool
    totaal_banen_nodig: int
    beschikbaarheid: dict[str, int]


class ConflictItem(BaseModel):
    type: str
    severity: str
    message: str
    suggestie: str


class ConflictenResponse(BaseModel):
    datum: str
    club_id: str
    has_conflicts: bool
    conflicten: list[ConflictItem]
    total_banen_nodig: int
    beschikbare_banen: int


class BaanToewijzingItem(BaseModel):
    competitie_id: str
    team_naam: str
    toegewezen_banen: int
    tijdblok: str | None
    status: str


class PlanBanenResponse(BaseModel):
    datum: str
    club_id: str
    total_banen: int
    used_banen: int
    toewijzingen: list[BaanToewijzingItem]
    unassigned: list[BaanToewijzingItem]


@router.get("", response_model=DagoverzichtResponse)
async def dagoverzicht_get(
    datum: date = Query(...),
    current: tuple = Depends(get_current_tenant_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Retourneert een geaggregeerd dagoverzicht met alle competities die thuiswedstrijden hebben
    op de gegeven datum, inclusief baanvereisten en conflictwaarschuwingen.
    """
    user, club = current
    result = await bereken_banenvereisten(datum, club.id, db)
    return result


@router.get("/conflicten", response_model=ConflictenResponse)
async def dagoverzicht_conflicten(
    datum: date = Query(...),
    current: tuple = Depends(get_current_tenant_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Retourneert specifieke conflicten voor een gegeven datum.
    """
    user, club = current
    result = await detecteer_conflicten(datum, club.id, db)
    return result


@router.post("/plan", response_model=PlanBanenResponse)
async def dagoverzicht_plan(
    datum: date = Query(...),
    current: tuple = Depends(get_current_tenant_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Voert het planning-algoritme uit om banen toe te wijzen over alle competities.
    """
    user, club = current
    dagoverzicht = await bereken_banenvereisten(datum, club.id, db)
    result = await plan_banen(dagoverzicht, db)
    return result


@router.get("/validate/max-thuisteams")
async def validate_max_thuisteams(
    datum: date = Query(...),
    current: tuple = Depends(get_current_tenant_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Valideer of het aantal thuisteams de club-instelling niet overschrijdt.
    """
    user, club = current
    is_valid = await validate_club_max_thuisteams(club.id, datum, db)
    return {
        "valid": is_valid,
        "datum": datum.isoformat(),
        "club_id": str(club.id),
        "max_thuisteams": club.max_thuisteams_per_dag,
    }

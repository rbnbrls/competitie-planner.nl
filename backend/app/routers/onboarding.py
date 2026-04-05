from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models import Baan, Club, Competitie, Team, User
from app.services.tenant_auth import get_current_tenant_user

router = APIRouter(prefix="/tenant/onboarding", tags=["onboarding"])

CURRENT_USER_DEP = Depends(get_current_tenant_user)


class OnboardingStep1(BaseModel):
    naam: str
    adres: str | None = None
    postcode: str | None = None
    stad: str | None = None
    telefoon: str | None = None


class OnboardingStep2(BaseModel):
    primary_color: str = "#1B5E20"
    secondary_color: str = "#FFFFFF"
    accent_color: str = "#FFC107"


class OnboardingStep3(BaseModel):
    banen: list[dict]


class OnboardingStep4(BaseModel):
    competitie_naam: str
    speeldag: str
    start_datum: str
    eind_datum: str


class OnboardingStep5(BaseModel):
    teams: list[dict]


@router.get("/status")
async def get_onboarding_status(
    current: tuple = CURRENT_USER_DEP,
    db: AsyncSession = Depends(get_db),
) -> dict:
    user, club = current
    return {
        "onboarding_completed": user.onboarding_completed,
        "has_teams": club.competities and any(c.teams for c in club.competities)
        if club.competities
        else False,
        "has_banen": len(club.banen) > 0 if club.banen else False,
    }


@router.post("/step1")
async def complete_step1(
    data: OnboardingStep1,
    current: tuple = CURRENT_USER_DEP,
    db: AsyncSession = Depends(get_db),
) -> dict:
    user, club = current

    club.naam = data.naam
    club.adres = data.adres
    club.postcode = data.postcode
    club.stad = data.stad
    club.telefoon = data.telefoon

    await db.commit()
    await db.refresh(club)

    return {"step": 1, "completed": True}


@router.post("/step2")
async def complete_step2(
    data: OnboardingStep2,
    current: tuple = CURRENT_USER_DEP,
    db: AsyncSession = Depends(get_db),
) -> dict:
    user, club = current

    club.primary_color = data.primary_color
    club.secondary_color = data.secondary_color
    club.accent_color = data.accent_color

    await db.commit()
    await db.refresh(club)

    return {"step": 2, "completed": True}


@router.post("/step3")
async def complete_step3(
    data: OnboardingStep3,
    current: tuple = CURRENT_USER_DEP,
    db: AsyncSession = Depends(get_db),
) -> dict:
    user, club = current

    for baan_data in data.banen:
        baan = Baan(
            club_id=club.id,
            nummer=baan_data.get("nummer", 1),
            naam=baan_data.get("naam"),
            verlichting_type=baan_data.get("verlichting_type", "geen"),
            overdekt=baan_data.get("overdekt", False),
            prioriteit_score=baan_data.get("prioriteit_score", 5),
        )
        db.add(baan)

    await db.commit()

    return {"step": 3, "completed": True}


@router.post("/step4")
async def complete_step4(
    data: OnboardingStep4,
    current: tuple = CURRENT_USER_DEP,
    db: AsyncSession = Depends(get_db),
) -> dict:
    from datetime import date

    user, club = current

    competitie = Competitie(
        club_id=club.id,
        naam=data.competitie_naam,
        speeldag=data.speeldag,
        start_datum=date.fromisoformat(data.start_datum),
        eind_datum=date.fromisoformat(data.eind_datum),
    )
    db.add(competitie)
    await db.commit()
    await db.refresh(competitie)

    return {"step": 4, "completed": True, "competitie_id": str(competitie.id)}


@router.post("/step5")
async def complete_step5(
    data: OnboardingStep5,
    competitie_id: str,
    current: tuple = CURRENT_USER_DEP,
    db: AsyncSession = Depends(get_db),
) -> dict:
    user, club = current

    try:
        competitie_uuid = UUID(competitie_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid competitie ID",
        )

    result = await db.execute(
        select(Competitie).where(
            Competitie.id == competitie_uuid,
            Competitie.club_id == club.id,
        )
    )
    competitie = result.scalar_one_or_none()
    if not competitie:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Competitie not found",
        )

    for team_data in data.teams:
        team = Team(
            club_id=club.id,
            competitie_id=competitie_uuid,
            naam=team_data.get("naam", ""),
            captain_naam=team_data.get("captain_naam"),
            captain_email=team_data.get("captain_email"),
            speelklasse=team_data.get("speelklasse"),
        )
        db.add(team)

    user.onboarding_completed = True
    await db.commit()
    await db.refresh(user)

    return {"step": 5, "completed": True}


@router.post("/skip")
async def skip_onboarding(
    current: tuple = CURRENT_USER_DEP,
    db: AsyncSession = Depends(get_db),
) -> dict:
    user, club = current

    user.onboarding_completed = True
    await db.commit()
    await db.refresh(user)

    return {"skipped": True}

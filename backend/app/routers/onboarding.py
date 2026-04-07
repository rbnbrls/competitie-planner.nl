from datetime import date
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db import get_db
from app.models import Baan, Club, Competitie, Team
from app.services.tenant_auth import get_current_tenant_user
router = APIRouter(
    prefix="/tenant/onboarding",
    tags=["onboarding"]
)
CURRENT_USER_DEP = Depends(get_current_tenant_user)
class ClubInfo(BaseModel):
    naam: str = Field(..., min_length=2
)
    adres: str | None = None
    postcode: str | None = None
    stad: str | None = None
    telefoon: str | None = None
    email: str | None = None
class CourtInput(BaseModel):
    naam: str = Field(...
)
    ondergrond: str = Field(...
)
    prioriteit_score: int = Field(..., ge=1, le=10
)
    nummer: int | None = None
class CourtsInput(BaseModel):
    banen: list[CourtInput] = Field(..., min_length=1
)
class CompetitionInput(BaseModel):
    naam: str = Field(...
)
    speeldag: str = Field(...
)
    start_datum: str = Field(...
)
    eind_datum: str = Field(...
)
class TeamInput(BaseModel):
    naam: str = Field(...
)
    captain_naam: str | None = None
    captain_email: str | None = None
    speelklasse: str | None = None
class TeamsInput(BaseModel):
    teams: list[TeamInput] = Field(..., min_length=1
)
@router.get("/status")
async def get_onboarding_status(
    current: tuple = CURRENT_USER_DEP,
    db: AsyncSession = Depends(get_db),
) -> dict:
    user, club = current
    result = await db.execute(select(Competitie).where(Competitie.club_id == club.id))
    competities = result.scalars().all()
    has_teams = False
    for comp in competities:
        if comp.teams:
            has_teams = True
            break
    return {
        "onboarding_completed": user.onboarding_completed,
        "step1_completed": club.naam is not None and len(club.naam) >= 2,
        "step2_completed": len(club.banen) > 0 if club.banen else False,
        "step3_completed": len(competities) > 0,
        "step4_completed": has_teams,
        "has_club": club.naam is not None,
        "has_courts": len(club.banen) > 0 if club.banen else False,
        "has_competition": len(competities) > 0,
        "has_teams": has_teams,
    }
@router.post("/club")
async def save_club_info(
    data: ClubInfo,
    current: tuple = CURRENT_USER_DEP,
    db: AsyncSession = Depends(get_db),
) -> dict:
    user, club = current
    result = await db.execute(select(Club).where(Club.naam.ilike(data.naam), Club.id != club.id))
    existing_club = result.scalar_one_or_none()
    if existing_club:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Er bestaat al een club met deze naam. Kies een andere naam.",
        )
    club.naam = data.naam
    club.adres = data.adres
    club.postcode = data.postcode
    club.stad = data.stad
    club.telefoon = data.telefoon
    if data.email:
        club.website = data.email
    await db.commit()
    await db.refresh(club)
    return {"step": 1, "completed": True, "club_naam": club.naam}
@router.post("/courts")
async def save_courts(
    data: CourtsInput,
    current: tuple = CURRENT_USER_DEP,
    db: AsyncSession = Depends(get_db),
) -> dict:
    user, club = current
    existing_nummers = set()
    if club.banen:
        for baan in club.banen:
            existing_nummers.add(baan.nummer)
    toegevoegd = []
    for idx, baan_data in enumerate(data.banen):
        nummer = baan_data.nummer if baan_data.nummer else (idx + 1)
        if nummer in existing_nummers:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Baan nummer {nummer} bestaat al. Kies een ander nummer.",
            )
        ondergrond = baan_data.ondergrond.lower()
        if ondergrond not in ["gravel", "hard", "gras", "tapijt"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ongeldige ondergrond. Kies uit: gravel, hard, gras, tapijt",
            )
        baan = Baan(
            club_id=club.id,
            nummer=nummer,
            naam=baan_data.naam,
            verlichting_type="geen",
            overdekt=False,
            prioriteit_score=baan_data.prioriteit_score,
        )
        db.add(baan)
        toegevoegd.append(baan.naam)
        existing_nummers.add(nummer)
    await db.commit()
    return {"step": 2, "completed": True, "banen_toegevoegd": len(toegevoegd)}
@router.post("/competition")
async def save_competition(
    data: CompetitionInput,
    current: tuple = CURRENT_USER_DEP,
    db: AsyncSession = Depends(get_db),
) -> dict:
    user, club = current
    try:
        start = date.fromisoformat(data.start_datum)
        eind = date.fromisoformat(data.eind_datum)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ongeldige datumformaat. Gebruik YYYY-MM-DD.",
        )
    if start <= date.today():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="De startdatum moet in de toekomst liggen.",
        )
    if eind <= start:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="De einddatum moet na de startdatum liggen.",
        )
    if (eind - start).days < 28:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="De competitie moet minimaal 4 weken duren.",
        )
    valid_days = ["maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag", "zondag"]
    if data.speeldag.lower() not in valid_days:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ongeldige speeldag. Kies: maandag, dinsdag, woensdag, donderdag, vrijdag, zaterdag of zondag.",
        )
    competitie = Competitie(
        club_id=club.id,
        naam=data.naam,
        speeldag=data.speeldag.lower(),
        start_datum=start,
        eind_datum=eind,
    )
    db.add(competitie)
    await db.commit()
    await db.refresh(competitie)
    return {
        "step": 3,
        "completed": True,
        "competitie_id": str(competitie.id),
        "competitie_naam": competitie.naam,
    }
@router.post("/teams")
async def save_teams(
    data: TeamsInput,
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
            detail="Ongeldig competitie ID.",
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
            detail="Competitie niet gevonden.",
        )
    teams_toegevoegd = []
    for team_data in data.teams:
        team = Team(
            club_id=club.id,
            competitie_id=competitie_uuid,
            naam=team_data.naam,
            captain_naam=team_data.captain_naam,
            captain_email=team_data.captain_email,
            speelklasse=team_data.speelklasse,
        )
        db.add(team)
        teams_toegevoegd.append(team_data.naam)
    await db.commit()
    return {"step": 4, "completed": True, "teams_toegevoegd": len(teams_toegevoegd)}
@router.post("/complete")
async def complete_onboarding(
    current: tuple = CURRENT_USER_DEP,
    db: AsyncSession = Depends(get_db),
) -> dict:
    user, club = current
    if not club.naam or len(club.naam) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Clubinformatie ontbreekt. Vul eerst je clubgegevens in.",
        )
    if not club.banen or len(club.banen) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Geen banen toegevoegd. Voeg minimaal 1 baan toe.",
        )
    result = await db.execute(select(Competitie).where(Competitie.club_id == club.id))
    competities = result.scalars().all()
    if not competities:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Geen competitie aangemaakt. Maak eerst een competitie aan.",
        )
    has_teams = any(comp.teams for comp in competities if comp.teams)
    if not has_teams:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Geen teams toegevoegd. Voeg minimaal 1 team toe.",
        )
    user.onboarding_completed = True
    await db.commit()
    await db.refresh(user)
    return {"completed": True, "message": "Onboarding voltooid!"}
@router.post("/skip")
async def skip_onboarding(
    current: tuple = CURRENT_USER_DEP,
    db: AsyncSession = Depends(get_db),
) -> dict:
    user, club = current
    user.onboarding_completed = True
    await db.commit()
    await db.refresh(user)
    return {"skipped": True, "message": "Onboarding overgeslagen."}
@router.post("/reset")
async def reset_onboarding(
    current: tuple = CURRENT_USER_DEP,
    db: AsyncSession = Depends(get_db),
) -> dict:
    user, club = current
    user.onboarding_completed = False
    await db.commit()
    await db.refresh(user)
    return {"reset": True, "message": "Onboarding reset. Je kunt nu opnieuw beginnen."}

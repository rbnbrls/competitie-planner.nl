from csv import reader
from datetime import date
from io import StringIO
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models import Baan, Competitie, Speelronde, Team, Wedstrijd
from app.schemas import WedstrijdCreate, WedstrijdUpdate
from app.services.tenant_auth import get_current_tenant_user

router = APIRouter(prefix="/tenant/wedstrijden", tags=["wedstrijden"])


class WedstrijdFilterParams(BaseModel):
    competitie_id: str | None = None
    ronde_id: str | None = None
    thuisteam_id: str | None = None
    uitteam_id: str | None = None
    status: str | None = None


class ImportResult(BaseModel):
    succes: bool
    geimporteerd: int = 0
    overgeslagen: int = 0
    fouten: list[dict] = []


class RondeAgendaItem(BaseModel):
    ronde_id: str
    ronde_datum: date
    thuisteam_naam: str
    uitteam_naam: str
    thuisteam_id: str
    uitteam_id: str
    baan_nummer: int | None = None
    speeltijd: str | None = None
    status: str


@router.get("")
async def list_wedstrijden(
    competitie_id: str | None = None,
    ronde_id: str | None = None,
    status_filter: str | None = None,
    current: tuple = Depends(get_current_tenant_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    user, club = current

    if competitie_id:
        try:
            competitie_uuid = UUID(competitie_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid competitie ID",
            )

        result = await db.execute(select(Competitie).where(Competitie.id == competitie_uuid))
        competitie = result.scalar_one_or_none()
        if not competitie or competitie.club_id != club.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied",
            )

    query = select(Wedstrijd).options(
        Wedstrijd.thuisteam,
        Wedstrijd.uitteam,
        Wedstrijd.baan,
        Wedstrijd.ronde,
    )

    conditions = []
    if competitie_id:
        try:
            conditions.append(Wedstrijd.competitie_id == UUID(competitie_id))
        except ValueError:
            pass
    if ronde_id:
        try:
            conditions.append(Wedstrijd.ronde_id == UUID(ronde_id))
        except ValueError:
            pass
    if status_filter:
        conditions.append(Wedstrijd.status == status_filter)

    if conditions:
        query = query.where(and_(*conditions))

    result = await db.execute(query)
    wedstrijden = result.scalars().all()

    return {
        "wedstrijden": [
            {
                "id": str(w.id),
                "competitie_id": str(w.competitie_id),
                "ronde_id": str(w.ronde_id),
                "thuisteam_id": str(w.thuisteam_id),
                "uitteam_id": str(w.uitteam_id),
                "status": w.status,
                "speeldatum": w.speeldatum.isoformat() if w.speeldatum else None,
                "speeltijd": w.speeltijd.isoformat() if w.speeltijd else None,
                "uitslag_thuisteam": w.uitslag_thuisteam,
                "uitslag_uitteam": w.uitslag_uitteam,
                "scorendetails": w.scorendetails,
                "notitie": w.notitie,
                "created_at": w.created_at.isoformat() if w.created_at else None,
                "updated_at": w.updated_at.isoformat() if w.updated_at else None,
                "thuisteam": (
                    {
                        "id": str(w.thuisteam.id),
                        "naam": w.thuisteam.naam,
                        "captain_naam": w.thuisteam.captain_naam,
                        "speelklasse": w.thuisteam.speelklasse,
                    }
                    if w.thuisteam
                    else None
                ),
                "uitteam": (
                    {
                        "id": str(w.uitteam.id),
                        "naam": w.uitteam.naam,
                        "captain_naam": w.uitteam.captain_naam,
                        "speelklasse": w.uitteam.speelklasse,
                    }
                    if w.uitteam
                    else None
                ),
                "baan": (
                    {
                        "id": str(w.baan.id),
                        "nummer": w.baan.nummer,
                        "naam": w.baan.naam,
                    }
                    if w.baan
                    else None
                ),
                "ronde": (
                    {
                        "id": str(w.ronde.id),
                        "datum": w.ronde.datum.isoformat(),
                        "week_nummer": w.ronde.week_nummer,
                        "status": w.ronde.status,
                    }
                    if w.ronde
                    else None
                ),
            }
            for w in wedstrijden
        ]
    }


@router.get("/{wedstrijd_id}")
async def get_wedstrijd(
    wedstrijd_id: str,
    current: tuple = Depends(get_current_tenant_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    user, club = current

    try:
        wedstrijd_uuid = UUID(wedstrijd_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid wedstrijd ID",
        )

    result = await db.execute(
        select(Wedstrijd)
        .where(Wedstrijd.id == wedstrijd_uuid)
        .options(
            Wedstrijd.thuisteam,
            Wedstrijd.uitteam,
            Wedstrijd.baan,
            Wedstrijd.ronde,
        )
    )
    wedstrijd = result.scalar_one_or_none()
    if not wedstrijd:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Wedstrijd not found",
        )

    result = await db.execute(select(Speelronde).where(Speelronde.id == wedstrijd.ronde_id))
    ronde = result.scalar_one_or_none()
    if not ronde or ronde.club_id != club.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )

    return {
        "id": str(wedstrijd.id),
        "competitie_id": str(wedstrijd.competitie_id),
        "ronde_id": str(wedstrijd.ronde_id),
        "thuisteam_id": str(wedstrijd.thuisteam_id),
        "uitteam_id": str(wedstrijd.uitteam_id),
        "status": wedstrijd.status,
        "speeldatum": wedstrijd.speeldatum.isoformat() if wedstrijd.speeldatum else None,
        "speeltijd": wedstrijd.speeltijd.isoformat() if wedstrijd.speeltijd else None,
        "uitslag_thuisteam": wedstrijd.uitslag_thuisteam,
        "uitslag_uitteam": wedstrijd.uitslag_uitteam,
        "scorendetails": wedstrijd.scorendetails,
        "notitie": wedstrijd.notitie,
        "thuisteam": (
            {
                "id": str(wedstrijd.thuisteam.id),
                "naam": wedstrijd.thuisteam.naam,
                "captain_naam": wedstrijd.thuisteam.captain_naam,
                "speelklasse": wedstrijd.thuisteam.speelklasse,
            }
            if wedstrijd.thuisteam
            else None
        ),
        "uitteam": (
            {
                "id": str(wedstrijd.uitteam.id),
                "naam": wedstrijd.uitteam.naam,
                "captain_naam": wedstrijd.uitteam.captain_naam,
                "speelklasse": wedstrijd.uitteam.speelklasse,
            }
            if wedstrijd.uitteam
            else None
        ),
        "baan": (
            {
                "id": str(wedstrijd.baan.id),
                "nummer": wedstrijd.baan.nummer,
                "naam": wedstrijd.baan.naam,
            }
            if wedstrijd.baan
            else None
        ),
        "ronde": (
            {
                "id": str(wedstrijd.ronde.id),
                "datum": wedstrijd.ronde.datum.isoformat(),
                "week_nummer": wedstrijd.ronde.week_nummer,
                "status": wedstrijd.ronde.status,
            }
            if wedstrijd.ronde
            else None
        ),
    }


@router.post("")
async def create_wedstrijd(
    data: WedstrijdCreate,
    current: tuple = Depends(get_current_tenant_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    user, club = current

    result = await db.execute(select(Competitie).where(Competitie.id == data.competitie_id))
    competitie = result.scalar_one_or_none()
    if not competitie or competitie.club_id != club.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )

    result = await db.execute(select(Speelronde).where(Speelronde.id == data.ronde_id))
    ronde = result.scalar_one_or_none()
    if not ronde:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Speelronde not found",
        )

    if ronde.competitie_id != data.competitie_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ronde belongs to different competitie",
        )

    result = await db.execute(select(Team).where(Team.id == data.thuisteam_id))
    thuisteam = result.scalar_one_or_none()
    if not thuisteam:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Thuisteam not found",
        )

    result = await db.execute(select(Team).where(Team.id == data.uitteam_id))
    uitteam = result.scalar_one_or_none()
    if not uitteam:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Uitteam not found",
        )

    result = await db.execute(
        select(Wedstrijd).where(
            Wedstrijd.ronde_id == data.ronde_id,
            Wedstrijd.thuisteam_id == data.thuisteam_id,
            Wedstrijd.uitteam_id == data.uitteam_id,
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Wedstrijd already exists for this combination",
        )

    wedstrijd = Wedstrijd(
        competitie_id=data.competitie_id,
        ronde_id=data.ronde_id,
        thuisteam_id=data.thuisteam_id,
        uitteam_id=data.uitteam_id,
        status=data.status,
        speeldatum=data.speeldatum,
        speeltijd=data.speeltijd,
        uitslag_thuisteam=data.uitslag_thuisteam,
        uitslag_uitteam=data.uitslag_uitteam,
        scorendetails=data.scorendetails,
        notitie=data.notitie,
        baan_id=data.baan_id,
    )
    db.add(wedstrijd)
    await db.commit()
    await db.refresh(wedstrijd)

    return {
        "id": str(wedstrijd.id),
        "competitie_id": str(wedstrijd.competitie_id),
        "ronde_id": str(wedstrijd.ronde_id),
        "thuisteam_id": str(wedstrijd.thuisteam_id),
        "uitteam_id": str(wedstrijd.uitteam_id),
        "status": wedstrijd.status,
    }


@router.patch("/{wedstrijd_id}")
async def update_wedstrijd(
    wedstrijd_id: str,
    data: WedstrijdUpdate,
    current: tuple = Depends(get_current_tenant_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    user, club = current

    try:
        wedstrijd_uuid = UUID(wedstrijd_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid wedstrijd ID",
        )

    result = await db.execute(select(Wedstrijd).where(Wedstrijd.id == wedstrijd_uuid))
    wedstrijd = result.scalar_one_or_none()
    if not wedstrijd:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Wedstrijd not found",
        )

    result = await db.execute(select(Speelronde).where(Speelronde.id == wedstrijd.ronde_id))
    ronde = result.scalar_one_or_none()
    if not ronde or ronde.club_id != club.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )

    if data.competitie_id is not None:
        result = await db.execute(select(Competitie).where(Competitie.id == data.competitie_id))
        comp = result.scalar_one_or_none()
        if not comp:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Competitie not found",
            )
        wedstrijd.competitie_id = data.competitie_id

    if data.ronde_id is not None:
        result = await db.execute(select(Speelronde).where(Speelronde.id == data.ronde_id))
        rnd = result.scalar_one_or_none()
        if not rnd:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Speelronde not found",
            )
        wedstrijd.ronde_id = data.ronde_id

    if data.thuisteam_id is not None:
        result = await db.execute(select(Team).where(Team.id == data.thuisteam_id))
        team = result.scalar_one_or_none()
        if not team:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Team not found",
            )
        wedstrijd.thuisteam_id = data.thuisteam_id

    if data.uitteam_id is not None:
        result = await db.execute(select(Team).where(Team.id == data.uitteam_id))
        team = result.scalar_one_or_none()
        if not team:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Team not found",
            )
        wedstrijd.uitteam_id = data.uitteam_id

    if data.baan_id is not None:
        if data.baan_id:
            result = await db.execute(select(Baan).where(Baan.id == data.baan_id))
            baan = result.scalar_one_or_none()
            if not baan:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Baan not found",
                )
        wedstrijd.baan_id = data.baan_id

    if data.status is not None:
        wedstrijd.status = data.status

    if data.speeldatum is not None:
        wedstrijd.speeldatum = data.speeldatum

    if data.speeltijd is not None:
        wedstrijd.speeltijd = data.speeltijd

    if data.uitslag_thuisteam is not None:
        wedstrijd.uitslag_thuisteam = data.uitslag_thuisteam

    if data.uitslag_uitteam is not None:
        wedstrijd.uitslag_uitteam = data.uitslag_uitteam

    if data.scorendetails is not None:
        wedstrijd.scorendetails = data.scorendetails

    if data.notitie is not None:
        wedstrijd.notitie = data.notitie

    await db.commit()
    await db.refresh(wedstrijd)

    return {
        "id": str(wedstrijd.id),
        "competitie_id": str(wedstrijd.competitie_id),
        "ronde_id": str(wedstrijd.ronde_id),
        "thuisteam_id": str(wedstrijd.thuisteam_id),
        "uitteam_id": str(wedstrijd.uitteam_id),
        "status": wedstrijd.status,
    }


@router.delete("/{wedstrijd_id}")
async def delete_wedstrijd(
    wedstrijd_id: str,
    current: tuple = Depends(get_current_tenant_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    user, club = current

    try:
        wedstrijd_uuid = UUID(wedstrijd_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid wedstrijd ID",
        )

    result = await db.execute(select(Wedstrijd).where(Wedstrijd.id == wedstrijd_uuid))
    wedstrijd = result.scalar_one_or_none()
    if not wedstrijd:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Wedstrijd not found",
        )

    result = await db.execute(select(Speelronde).where(Speelronde.id == wedstrijd.ronde_id))
    ronde = result.scalar_one_or_none()
    if not ronde or ronde.club_id != club.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )

    await db.delete(wedstrijd)
    await db.commit()

    return {"message": "Wedstrijd deleted successfully"}


@router.get("/competitie/{competitie_id}/thuis-per-ronde")
async def get_thuis_wedstrijden_per_ronde(
    competitie_id: str,
    current: tuple = Depends(get_current_tenant_user),
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

    result = await db.execute(select(Competitie).where(Competitie.id == competitie_uuid))
    competitie = result.scalar_one_or_none()
    if not competitie or competitie.club_id != club.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )

    result = await db.execute(
        select(Wedstrijd)
        .where(
            Wedstrijd.competitie_id == competitie_uuid,
            Wedstrijd.thuisteam_id.in_(
                select(Team.id).where(
                    Team.competitie_id == competitie_uuid,
                    Team.actief,
                )
            ),
        )
        .options(
            Wedstrijd.thuisteam,
            Wedstrijd.uitteam,
            Wedstrijd.baan,
            Wedstrijd.ronde,
        )
        .order_by(Wedstrijd.ronde_id, Wedstrijd.thuisteam_id)
    )
    wedstrijden = result.scalars().all()

    grouped: dict[str, list[dict]] = {}
    for w in wedstrijden:
        ronde_id_str = str(w.ronde_id)
        if ronde_id_str not in grouped:
            grouped[ronde_id_str] = {
                "ronde_id": ronde_id_str,
                "ronde_datum": w.ronde.datum.isoformat() if w.ronde else None,
                "week_nummer": w.ronde.week_nummer if w.ronde else None,
                "wedstrijden": [],
            }
        grouped[ronde_id_str]["wedstrijden"].append(
            {
                "id": str(w.id),
                "thuisteam_id": str(w.thuisteam_id),
                "uitteam_id": str(w.uitteam_id),
                "thuisteam_naam": w.thuisteam.naam if w.thuisteam else "",
                "uitteam_naam": w.uitteam.naam if w.uitteam else "",
                "baan_nummer": w.baan.nummer if w.baan else None,
                "speeltijd": w.speeltijd.isoformat() if w.speeltijd else None,
                "status": w.status,
            }
        )

    return {
        "rondes": list(grouped.values()),
    }


@router.post("/competitie/{competitie_id}/import")
async def import_wedstrijden(
    competitie_id: str,
    file: UploadFile = File(...),
    current: tuple = Depends(get_current_tenant_user),
    db: AsyncSession = Depends(get_db),
) -> ImportResult:
    user, club = current

    try:
        competitie_uuid = UUID(competitie_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid competitie ID",
        )

    result = await db.execute(select(Competitie).where(Competitie.id == competitie_uuid))
    competitie = result.scalar_one_or_none()
    if not competitie or competitie.club_id != club.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )

    content = await file.read()
    text = content.decode("utf-8")

    try:
        csv_reader = reader(StringIO(text))
        lines = list(csv_reader)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid CSV format: {str(e)}",
        )

    if len(lines) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="CSV file is empty",
        )

    headers = [h.strip().lower() for h in lines[0]]

    datum_idx = next(
        (i for i, h in enumerate(headers) if h in ["datum", "date", "speeldatum"]), None
    )
    thuis_idx = next(
        (i for i, h in enumerate(headers) if h in ["thuis", "hometeam", "thuisteam"]), None
    )
    uit_idx = next((i for i, h in enumerate(headers) if h in ["uit", "awayteam", "uitteam"]), None)
    thuis_uit_idx = next(
        (i for i, h in enumerate(headers) if h in ["thuis/uit", "home/away", "thuis_uit"]), None
    )
    ronde_idx = next((i for i, h in enumerate(headers) if h in ["ronde", "round"]), None)  # noqa: F841
    poulee_idx = next((i for i, h in enumerate(headers) if h in ["poule", "poul"]), None)  # noqa: F841

    if datum_idx is None or thuis_idx is None or uit_idx is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Required columns missing: datum, thuisteam, uitteam",
        )

    result = await db.execute(
        select(Team).where(Team.competitie_id == competitie_uuid, Team.actief)
    )
    teams = list(result.scalars().all())
    team_name_map: dict[str, Team] = {t.naam.lower(): t for t in teams}

    result = await db.execute(select(Speelronde).where(Speelronde.competitie_id == competitie_uuid))
    rondes = list(result.scalars().all())
    ronde_datum_map: dict[str, Speelronde] = {r.datum.isoformat(): r for r in rondes}

    result = await db.execute(select(Baan).where(Baan.club_id == club.id, Baan.actief))
    _banen = list(result.scalars().all())  # noqa: F841

    imported = 0
    skipped = 0
    errors: list[dict] = []

    for i, line in enumerate(lines[1:], start=2):
        if not line or not line[0]:
            continue

        try:
            datum_str = line[datum_idx].strip() if datum_idx < len(line) else ""
            thuis_naam = line[thuis_idx].strip() if thuis_idx < len(line) else ""
            uit_naam = line[uit_idx].strip() if uit_idx < len(line) else ""

            if not datum_str or not thuis_naam or not uit_naam:
                errors.append(
                    {
                        "rij": i,
                        "fout": "Missing required fields",
                    }
                )
                skipped += 1
                continue

            thuis_naam_lower = thuis_naam.lower()
            uit_naam_lower = uit_naam.lower()

            thuisteam = team_name_map.get(thuis_naam_lower)
            uitteam = team_name_map.get(uit_naam_lower)

            if not thuisteam:
                errors.append(
                    {
                        "rij": i,
                        "fout": f"Team not found: {thuis_naam}",
                    }
                )
                skipped += 1
                continue

            if not uitteam:
                errors.append(
                    {
                        "rij": i,
                        "fout": f"Team not found: {uit_naam}",
                    }
                )
                skipped += 1
                continue

            try:
                ronde_datum = date.fromisoformat(datum_str)
            except ValueError:
                try:
                    ronde_datum = date.fromisoformat(datum_str.replace("/", "-"))
                except Exception:
                    errors.append(
                        {
                            "rij": i,
                            "fout": f"Invalid date format: {datum_str}",
                        }
                    )
                    skipped += 1
                    continue

            ronde = ronde_datum_map.get(ronde_datum.isoformat())
            if not ronde:
                errors.append(
                    {
                        "rij": i,
                        "fout": f"Speelronde not found for date: {datum_str}",
                    }
                )
                skipped += 1
                continue

            result = await db.execute(
                select(Wedstrijd).where(
                    Wedstrijd.ronde_id == ronde.id,
                    Wedstrijd.thuisteam_id == thuisteam.id,
                    Wedstrijd.uitteam_id == uitteam.id,
                )
            )
            existing = result.scalar_one_or_none()
            if existing:
                errors.append(
                    {
                        "rij": i,
                        "fout": f"Wedstrijd already exists: {thuis_naam} vs {uit_naam}",
                    }
                )
                skipped += 1
                continue

            thuis_uit_code = "thuis"
            if thuis_uit_idx is not None and thuis_uit_idx < len(line):
                thuis_uit_code = line[thuis_uit_idx].strip().lower()
                if thuis_uit_code in ["uit", "away"]:
                    thuisteam_id = uitteam.id
                    uitteam_id = thuisteam.id
                else:
                    thuisteam_id = thuisteam.id
                    uitteam_id = uitteam.id
            else:
                thuisteam_id = thuisteam.id
                uitteam_id = uitteam.id

            wedstrijd = Wedstrijd(
                competitie_id=competitie_uuid,
                ronde_id=ronde.id,
                thuisteam_id=thuisteam_id,
                uitteam_id=uitteam_id,
                status="gepland",
            )
            db.add(wedstrijd)
            imported += 1

        except Exception as e:
            errors.append(
                {
                    "rij": i,
                    "fout": str(e),
                }
            )
            skipped += 1

    if imported > 0:
        await db.commit()

    return ImportResult(
        succes=imported > 0 and skipped == 0,
        geimporteerd=imported,
        overgeslagen=skipped,
        fouten=errors,
    )


@router.get("/competitie/{competitie_id}/agenda-export")
async def export_agenda(
    competitie_id: str,
    current: tuple = Depends(get_current_tenant_user),
    db: AsyncSession = Depends(get_db),
) -> str:
    user, club = current

    try:
        competitie_uuid = UUID(competitie_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid competitie ID",
        )

    result = await db.execute(select(Competitie).where(Competitie.id == competitie_uuid))
    competitie = result.scalar_one_or_none()
    if not competitie or competitie.club_id != club.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )

    result = await db.execute(
        select(Wedstrijd)
        .where(Wedstrijd.competitie_id == competitie_uuid)
        .options(
            Wedstrijd.thuisteam,
            Wedstrijd.uitteam,
            Wedstrijd.ronde,
        )
        .order_by(Wedstrijd.ronde_id)
    )
    wedstrijden = result.scalars().all()

    ics_lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//CompetitiePlanner//NL",
        f"X-WR-CALNAME:{competitie.naam} - Wedstrijden",
    ]

    for w in wedstrijden:
        if not w.ronde or not w.thuisteam or not w.uitteam:
            continue

        dt = w.ronde.datum
        if w.speeltijd:
            dt = f"{dt.isoformat()}T{w.speeltijd.isoformat()}"
        else:
            dt = f"{dt.isoformat()}T190000"

        thuis_uit = "Thuis" if w.thuisteam_id == w.thuisteam.id else "Uit"
        summary = f"Tennis: {w.thuisteam.naam} - {w.uitteam.naam} ({thuis_uit})"

        ics_lines.extend(
            [
                "BEGIN:VEVENT",
                f"DTSTART:{dt.replace('-', '')}",
                f"SUMMARY:{summary}",
                f"DESCRIPTION:{thuis_uit} wedstrijd\\nStatus: {w.status}",
                "END:VEVENT",
            ]
        )

    ics_lines.append("END:VCALENDAR")

    return "\n".join(ics_lines)


@router.post("/competitie/{competitie_id}/validatie")
async def validate_wedstrijden(
    competitie_id: str,
    current: tuple = Depends(get_current_tenant_user),
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

    result = await db.execute(select(Competitie).where(Competitie.id == competitie_uuid))
    competitie = result.scalar_one_or_none()
    if not competitie or competitie.club_id != club.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )

    result = await db.execute(
        select(Team).where(Team.competitie_id == competitie_uuid, Team.actief)
    )
    teams = list(result.scalars().all())

    result = await db.execute(select(Speelronde).where(Speelronde.competitie_id == competitie_uuid))
    rondes = list(result.scalars().all())

    result = await db.execute(select(Wedstrijd).where(Wedstrijd.competitie_id == competitie_uuid))
    wedstrijden = list(result.scalars().all())

    issues: list[dict] = []

    for team in teams:
        team_wed = [w for w in wedstrijden if w.thuisteam_id == team.id or w.uitteam_id == team.id]
        team_wed_ids = set(w.ronde_id for w in team_wed)

        for ronde in rondes:
            if ronde.id not in team_wed_ids:
                issues.append(
                    {
                        "type": "missing_match",
                        "team_id": str(team.id),
                        "team_naam": team.naam,
                        "ronde_id": str(ronde.id),
                        "ronde_datum": ronde.datum.isoformat(),
                        "message": f"Team {team.naam} heeft geen wedstrijd in ronde {ronde.datum.isoformat()}",
                    }
                )

    team_combos: dict[tuple[UUID, UUID], bool] = {}
    for w in wedstrijden:
        combo = tuple(sorted([w.thuisteam_id, w.uitteam_id]))
        if combo in team_combos:
            issues.append(
                {
                    "type": "duplicate",
                    "thuisteam_id": str(w.thuisteam_id),
                    "uitteam_id": str(w.uitteam_id),
                    "message": "Duplicate match between teams",
                }
            )
        team_combos[combo] = True

    for team in teams:
        team_wed = [w for w in wedstrijden if w.thuisteam_id == team.id]
        uit_wed = [w for w in wedstrijden if w.uitteam_id == team.id]

        if len(team_wed) < len(teams) - 1:
            issues.append(
                {
                    "type": " unbalanced",
                    "team_id": str(team.id),
                    "team_naam": team.naam,
                    "message": f"Team {team.naam} heeft {len(team_wed)} thuiswedstrijden en {len(uit_wed)} uitwedstrijden",
                }
            )

    return {
        "valid": len(issues) == 0,
        "issues": issues,
        "total_wedstrijden": len(wedstrijden),
        "expected_wedstrijden": len(teams) * (len(teams) - 1),
    }

from datetime import date, datetime, time
from uuid import UUID

from enum import Enum
from pydantic import BaseModel, ConfigDict, EmailStr


class WedstrijdStatus(str, Enum):
    GEPLAND = "gepland"
    BEVESTIGD = "bevestigd"
    GAANDE = "gaande"
    VOLTOOID = "voltooid"
    UITGESTELD = "uitgesteld"
    AFGELAST = "afgelast"


class WedstrijdBase(BaseModel):
    status: str = "gepland"
    speeldatum: date | None = None
    speeltijd: time | None = None
    uitslag_thuisteam: int | None = None
    uitslag_uitteam: int | None = None
    scorendetails: str | None = None
    notitie: str | None = None


class WedstrijdCreate(WedstrijdBase):
    competitie_id: UUID
    ronde_id: UUID
    thuisteam_id: UUID
    uitteam_id: UUID
    baan_id: UUID | None = None


class WedstrijdUpdate(BaseModel):
    competitie_id: UUID | None = None
    ronde_id: UUID | None = None
    thuisteam_id: UUID | None = None
    uitteam_id: UUID | None = None
    baan_id: UUID | None = None
    status: str | None = None
    speeldatum: date | None = None
    speeltijd: time | None = None
    uitslag_thuisteam: int | None = None
    uitslag_uitteam: int | None = None
    scorendetails: str | None = None
    notitie: str | None = None


class TeamNestedResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    naam: str
    captain_naam: str | None = None
    speelklasse: str | None = None


class BaanNestedResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    nummer: int
    naam: str | None = None


class SpeelrondeNestedResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    datum: date
    week_nummer: int | None = None


class WedstrijdResponse(WedstrijdBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    competitie_id: UUID
    ronde_id: UUID
    thuisteam_id: UUID
    uitteam_id: UUID
    baan_id: UUID | None = None
    created_at: datetime
    updated_at: datetime
    thuisteam: TeamNestedResponse | None = None
    uitteam: TeamNestedResponse | None = None
    baan: BaanNestedResponse | None = None
    ronde: SpeelrondeNestedResponse | None = None


class WedstrijdImportRow(BaseModel):
    ronde_datum: date
    thuisteam_naam: str
    uitteam_naam: str
    thuis_uit: str
    poule: str | None = None

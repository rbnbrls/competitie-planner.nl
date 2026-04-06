from datetime import date, datetime, time
from uuid import UUID
from enum import Enum
from typing import Generic, TypeVar, List
from pydantic import BaseModel, ConfigDict, EmailStr


T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    items: List[T]
    total: int
    page: int
    size: int
    pages: int


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


# --- Added Schemas ---

class UserBase(BaseModel):
    email: EmailStr
    full_name: str | None = None
    role: str
    is_active: bool = True
    email_opt_out: bool = False


class UserResponse(UserBase):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    club_id: UUID | None = None
    is_superadmin: bool
    last_login: datetime | None = None
    created_at: datetime
    updated_at: datetime


class UserUpdate(BaseModel):
    email: EmailStr | None = None
    full_name: str | None = None
    role: str | None = None
    is_active: bool | None = None
    email_opt_out: bool | None = None
    onboarding_completed: bool | None = None


class ClubBase(BaseModel):
    naam: str
    slug: str
    adres: str | None = None
    postcode: str | None = None
    stad: str | None = None
    telefoon: str | None = None
    website: str | None = None


class ClubCreate(ClubBase):
    pass


class ClubUpdate(BaseModel):
    naam: str | None = None
    slug: str | None = None
    adres: str | None = None
    postcode: str | None = None
    stad: str | None = None
    telefoon: str | None = None
    website: str | None = None
    status: str | None = None
    primary_color: str | None = None
    secondary_color: str | None = None
    accent_color: str | None = None
    logo_url: str | None = None
    font_choice: str | None = None
    max_banen: int | None = None
    max_competities: int | None = None
    max_thuisteams_per_dag: int | None = None


class ClubResponse(ClubBase):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    status: str
    trial_ends_at: datetime | None = None
    primary_color: str
    secondary_color: str
    accent_color: str
    logo_url: str | None = None
    font_choice: str
    max_banen: int
    max_competities: int
    max_thuisteams_per_dag: int
    banen_types: list[str]
    billing_info: str | None = None
    payment_enabled: bool
    created_at: datetime
    updated_at: datetime


class TeamBase(BaseModel):
    naam: str
    captain_naam: str | None = None
    captain_email: EmailStr | None = None
    speelklasse: str | None = None
    knltb_team_id: str | None = None
    actief: bool = True


class TeamCreate(TeamBase):
    competitie_id: UUID


class TeamUpdate(BaseModel):
    naam: str | None = None
    captain_naam: str | None = None
    captain_email: EmailStr | None = None
    speelklasse: str | None = None
    knltb_team_id: str | None = None
    actief: bool | None = None
    public_token: str | None = None


class TeamResponse(TeamBase):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    club_id: UUID
    competitie_id: UUID
    created_at: datetime
    updated_at: datetime
    public_token: str


class BaanBase(BaseModel):
    nummer: int
    naam: str | None = None
    verlichting_type: str = "geen"
    overdekt: bool = False
    prioriteit_score: int = 5
    actief: bool = True
    notitie: str | None = None


class BaanCreate(BaanBase):
    pass


class BaanUpdate(BaseModel):
    nummer: int | None = None
    naam: str | None = None
    verlichting_type: str | None = None
    overdekt: bool | None = None
    prioriteit_score: int | None = None
    actief: bool | None = None
    notitie: str | None = None


class BaanResponse(BaanBase):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    club_id: UUID
    created_at: datetime
    updated_at: datetime


class CompetitieBase(BaseModel):
    naam: str
    speeldag: str
    start_datum: date
    eind_datum: date
    feestdagen: list[date] = []
    inhaal_datums: list[date] = []
    actief: bool = True
    email_notifications_enabled: bool = True
    standaard_starttijden: list[time] = []
    eerste_datum: date | None = None
    hergebruik_configuratie: bool = True
    reminder_days_before: int = 3


class CompetitieCreate(CompetitieBase):
    pass


class CompetitieUpdate(BaseModel):
    naam: str | None = None
    speeldag: str | None = None
    start_datum: date | None = None
    eind_datum: date | None = None
    feestdagen: list[date] | None = None
    inhaal_datums: list[date] | None = None
    actief: bool | None = None
    email_notifications_enabled: bool | None = None
    standaard_starttijden: list[time] | None = None
    eerste_datum: date | None = None
    hergebruik_configuratie: bool | None = None
    reminder_days_before: int | None = None


class CompetitieResponse(CompetitieBase):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    club_id: UUID
    created_at: datetime
    updated_at: datetime


class SpeelrondeBase(BaseModel):
    datum: date
    week_nummer: int | None = None
    is_inhaalronde: bool = False
    status: str = "concept"


class SpeelrondeCreate(SpeelrondeBase):
    competitie_id: UUID


class SpeelrondeUpdate(BaseModel):
    datum: date | None = None
    week_nummer: int | None = None
    is_inhaalronde: bool | None = None
    status: str | None = None


class SpeelrondeResponse(SpeelrondeBase):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    competitie_id: UUID
    club_id: UUID
    gepubliceerd_op: datetime | None = None
    gepubliceerd_door: UUID | None = None
    public_token: str | None = None
    created_at: datetime
    updated_at: datetime


class SeizoensoverzichtEntry(BaseModel):
    ronde_id: UUID
    type: str  # "thuis", "uit", "vrij"
    label: str  # e.g. "B1", "UIT", "VRIJ"
    details: str | None = None
    status: str  # concept, gepubliceerd


class SeizoensoverzichtTeamRow(BaseModel):
    team_id: UUID
    team_naam: str
    planning: List[SeizoensoverzichtEntry]


class SeizoensoverzichtResponse(BaseModel):
    rondes: List[SpeelrondeNestedResponse]
    rows: List[SeizoensoverzichtTeamRow]


# --- Captain Portal Schemas ---

class BeschikbaarheidBase(BaseModel):
    is_beschikbaar: bool = True
    notitie: str | None = None


class BeschikbaarheidCreate(BeschikbaarheidBase):
    ronde_id: UUID


class BeschikbaarheidResponse(BeschikbaarheidBase):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    team_id: UUID
    ronde_id: UUID
    created_at: datetime
    updated_at: datetime


class CaptainWedstrijdResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    datum: date
    tijd: time | None = None
    is_thuis: bool
    tegenstander: str
    baan_nummer: int | None = None
    baan_naam: str | None = None
    status: str
    uitslag_thuisteam: int | None = None
    uitslag_uitteam: int | None = None

class DisplayClubInfo(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    naam: str
    slug: str
    primary_color: str
    secondary_color: str
    accent_color: str
    logo_url: str | None = None


class CaptainPortalResponse(BaseModel):
    team_naam: str
    competitie_naam: str
    club: DisplayClubInfo
    volgende_wedstrijd: CaptainWedstrijdResponse | None = None
    alle_wedstrijden: List[CaptainWedstrijdResponse]
    beschikbaarheden: List[BeschikbaarheidResponse]


class ResultSubmission(BaseModel):
    wedstrijd_id: UUID
    uitslag_thuisteam: int
    uitslag_uitteam: int
    notitie: str | None = None

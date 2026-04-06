from datetime import date, datetime, time
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr


class ClubBase(BaseModel):
    naam: str
    slug: str
    adres: str | None = None
    postcode: str | None = None
    stad: str | None = None
    telefoon: str | None = None
    website: str | None = None
    primary_color: str = "#1B5E20"
    secondary_color: str = "#FFFFFF"
    accent_color: str = "#FFC107"
    logo_url: str | None = None
    font_choice: str = "default"
    status: str = "trial"
    trial_ends_at: datetime | None = None
    max_banen: int = 8
    max_competities: int = 5


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
    primary_color: str | None = None
    secondary_color: str | None = None
    accent_color: str | None = None
    logo_url: str | None = None
    font_choice: str | None = None
    status: str | None = None
    trial_ends_at: datetime | None = None
    max_banen: int | None = None
    max_competities: int | None = None


class ClubResponse(ClubBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    created_at: datetime
    updated_at: datetime


class UserBase(BaseModel):
    email: EmailStr
    full_name: str | None = None
    role: str
    is_superadmin: bool = False
    is_active: bool = True


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    email: EmailStr | None = None
    full_name: str | None = None
    role: str | None = None
    is_active: bool | None = None


class UserResponse(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    club_id: UUID | None = None
    last_login: datetime | None = None
    created_at: datetime
    updated_at: datetime


class InviteTokenCreate(BaseModel):
    email: EmailStr
    role: str
    expires_at: datetime


class InviteTokenResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    club_id: UUID
    email: str
    role: str
    token: str
    used: bool
    expires_at: datetime
    created_at: datetime


class BaanBase(BaseModel):
    nummer: int
    naam: str | None = None
    verlichting_type: str = "geen"
    overdekt: bool = False
    prioriteit_score: int = 5
    actief: bool = True
    notitie: str | None = None


class BaanCreate(BaanBase):
    club_id: UUID


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


class CompetitieCreate(CompetitieBase):
    club_id: UUID


class CompetitieUpdate(BaseModel):
    naam: str | None = None
    speeldag: str | None = None
    start_datum: date | None = None
    eind_datum: date | None = None
    feestdagen: list[date] | None = None
    inhaal_datums: list[date] | None = None
    actief: bool | None = None


class CompetitieResponse(CompetitieBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    club_id: UUID
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
    club_id: UUID
    competitie_id: UUID


class TeamUpdate(BaseModel):
    naam: str | None = None
    captain_naam: str | None = None
    captain_email: EmailStr | None = None
    speelklasse: str | None = None
    knltb_team_id: str | None = None
    actief: bool | None = None


class TeamResponse(TeamBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    club_id: UUID
    competitie_id: UUID
    created_at: datetime
    updated_at: datetime


class SpeelrondeBase(BaseModel):
    datum: date
    week_nummer: int | None = None
    is_inhaalronde: bool = False
    status: str = "concept"


class SpeelrondeCreate(SpeelrondeBase):
    competitie_id: UUID
    club_id: UUID


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


class BaanToewijzingBase(BaseModel):
    tijdslot_start: time | None = None
    tijdslot_eind: time | None = None
    notitie: str | None = None


class BaanToewijzingCreate(BaanToewijzingBase):
    ronde_id: UUID
    team_id: UUID
    baan_id: UUID


class BaanToewijzingUpdate(BaseModel):
    tijdslot_start: time | None = None
    tijdslot_eind: time | None = None
    notitie: str | None = None


class BaanToewijzingResponse(BaanToewijzingBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    ronde_id: UUID
    team_id: UUID
    baan_id: UUID
    created_at: datetime
    updated_at: datetime


class PlanningHistorieBase(BaseModel):
    aantal_keer: int = 0
    totaal_score: float = 0


class PlanningHistorieCreate(PlanningHistorieBase):
    club_id: UUID
    competitie_id: UUID
    team_id: UUID
    baan_id: UUID


class PlanningHistorieResponse(PlanningHistorieBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    club_id: UUID
    competitie_id: UUID
    team_id: UUID
    baan_id: UUID
    updated_at: datetime


class WedstrijdBase(BaseModel):
    status: str = "ingepland"


class WedstrijdCreate(WedstrijdBase):
    ronde_id: UUID
    thuisteam_id: UUID
    uitteam_id: UUID


class WedstrijdUpdate(BaseModel):
    thuisteam_id: UUID | None = None
    uitteam_id: UUID | None = None
    status: str | None = None


class TeamNestedResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    naam: str
    captain_naam: str | None = None
    speelklasse: str | None = None


class WedstrijdResponse(WedstrijdBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    ronde_id: UUID
    thuisteam_id: UUID
    uitteam_id: UUID
    created_at: datetime
    updated_at: datetime
    thuisteam: TeamNestedResponse | None = None
    uitteam: TeamNestedResponse | None = None

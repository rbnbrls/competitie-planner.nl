<!--
File: datamodel/01-core-schema.md
Last updated: 2026-05-01
API version: 0.1.0
Author: Ruben Barels <ruben@rabar.nl>
Changelog:
  - 2026-05-01: Initial metadata header added
-->

# Datamodel — Core schema

## Entiteit overzicht

```
Platform
└── Club (tenant)
      ├── User (vereniging admin / planner)
      ├── Baan
      └── Competitie
            ├── Team
            └── Speelronde
                  ├── BaanToewijzing
                  │     ├── → Team
                  │     └── → Baan
                  └── PlanningHistorie
```

---

## Tabel: Club

Centrale tenant entiteit. Elke vereniging is één Club record.

```sql
CREATE TABLE clubs (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Identiteit
    naam              VARCHAR(100) NOT NULL,
    slug              VARCHAR(30) UNIQUE NOT NULL,     -- subdomain identifier
    adres             TEXT,
    postcode          VARCHAR(10),
    stad              VARCHAR(100),
    telefoon          VARCHAR(20),
    website           VARCHAR(255),

    -- Branding
    primary_color     VARCHAR(7) DEFAULT '#1B5E20',    -- hex
    secondary_color   VARCHAR(7) DEFAULT '#FFFFFF',
    accent_color      VARCHAR(7) DEFAULT '#FFC107',
    logo_url          TEXT,
    font_choice       VARCHAR(50) DEFAULT 'default',

    -- Platform
    status            VARCHAR(20) DEFAULT 'trial',     -- trial | active | suspended | inactive
    trial_ends_at     TIMESTAMPTZ,
    max_banen         SMALLINT DEFAULT 8,
    max_competities   SMALLINT DEFAULT 5,

    -- Audit
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_clubs_slug ON clubs(slug);
CREATE INDEX idx_clubs_status ON clubs(status);
```

---

## Tabel: User

Platform- en vereniging gebruikers in één tabel, gescheiden via `club_id` en `is_superadmin`.

```sql
CREATE TABLE users (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id           UUID REFERENCES clubs(id) ON DELETE CASCADE,   -- NULL voor superadmin

    email             VARCHAR(255) UNIQUE NOT NULL,
    password_hash     VARCHAR(255) NOT NULL,
    full_name         VARCHAR(100),
    role              VARCHAR(20) NOT NULL,   -- superadmin | vereniging_admin | planner
    is_superadmin     BOOLEAN DEFAULT FALSE,
    is_active         BOOLEAN DEFAULT TRUE,

    last_login        TIMESTAMPTZ,
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_club ON users(club_id);
CREATE INDEX idx_users_email ON users(email);

CREATE TABLE invite_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id     UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
    email       VARCHAR(255) NOT NULL,
    role        VARCHAR(20) NOT NULL,
    token       VARCHAR(64) UNIQUE NOT NULL,
    used        BOOLEAN DEFAULT FALSE,
    expires_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Tabel: Baan

Fysieke banen van een vereniging met eigenschappen voor het planningsalgoritme.

```sql
CREATE TABLE banen (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id           UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,

    nummer            SMALLINT NOT NULL,             -- 1, 2, 3, ...
    naam              VARCHAR(50),                    -- optioneel: "Centerbaan"
    verlichting_type  VARCHAR(20) DEFAULT 'geen',    -- geen | TL | LED | halogeen
    overdekt          BOOLEAN DEFAULT FALSE,
    prioriteit_score  SMALLINT DEFAULT 5,            -- 1 (laagste) - 10 (hoogste)
    actief            BOOLEAN DEFAULT TRUE,
    notitie           TEXT,

    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (club_id, nummer)
);

CREATE INDEX idx_banen_club ON banen(club_id);
```

> **prioriteit_score**: hogere score = betere baan. Het algoritme gebruikt deze score om te bepalen welk team "recht heeft" op een goede baan na slechte eerdere rondes.

---

## Tabel: Competitie

Een seizoenscompetitie van een vereniging.

```sql
CREATE TABLE competities (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id         UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,

    naam            VARCHAR(100) NOT NULL,           -- bijv. "KNLTB Zomercompetitie 2025"
    speeldag        VARCHAR(10) NOT NULL,             -- maandag | dinsdag | ... | zondag
    start_datum     DATE NOT NULL,
    eind_datum      DATE NOT NULL,
    feestdagen      DATE[] DEFAULT '{}',             -- array van overgeslagen datums
    inhaal_datums   DATE[] DEFAULT '{}',             -- array van extra speeldatums
    actief          BOOLEAN DEFAULT TRUE,

    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_competities_club ON competities(club_id);
```

---

## Tabel: Team

Een team dat deelneemt aan een competitie.

```sql
CREATE TABLE teams (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id         UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
    competitie_id   UUID NOT NULL REFERENCES competities(id) ON DELETE CASCADE,

    naam            VARCHAR(100) NOT NULL,
    captain_naam    VARCHAR(100),
    captain_email   VARCHAR(255),
    speelklasse     VARCHAR(50),                     -- bijv. "3e klasse heren"
    knltb_team_id   VARCHAR(50),                     -- optioneel, voor toekomstige integratie
    actief          BOOLEAN DEFAULT TRUE,

    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_teams_competitie ON teams(competitie_id);
CREATE INDEX idx_teams_club ON teams(club_id);
```

---

## Tabel: Speelronde

Eén speeldag binnen een competitie.

```sql
CREATE TABLE speelrondes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    competitie_id   UUID NOT NULL REFERENCES competities(id) ON DELETE CASCADE,
    club_id         UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,

    datum           DATE NOT NULL,
    week_nummer     SMALLINT,
    is_inhaalronde  BOOLEAN DEFAULT FALSE,
    status          VARCHAR(20) DEFAULT 'concept',   -- concept | gepubliceerd

    -- Publicatie
    gepubliceerd_op TIMESTAMPTZ,
    gepubliceerd_door UUID REFERENCES users(id),
    public_token    VARCHAR(64) UNIQUE,              -- voor publieke URL

    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (competitie_id, datum)
);

CREATE INDEX idx_rondes_competitie ON speelrondes(competitie_id);
CREATE INDEX idx_rondes_datum ON speelrondes(datum);
CREATE INDEX idx_rondes_token ON speelrondes(public_token);
```

---

## Tabel: BaanToewijzing

Koppeling tussen team, baan en speelronde.

```sql
CREATE TABLE baantoewijzingen (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ronde_id        UUID NOT NULL REFERENCES speelrondes(id) ON DELETE CASCADE,
    team_id         UUID NOT NULL REFERENCES teams(id),
    baan_id         UUID NOT NULL REFERENCES banen(id),

    tijdslot_start  TIME,
    tijdslot_eind   TIME,
    notitie         TEXT,

    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (ronde_id, baan_id)    -- één team per baan per ronde
);

CREATE INDEX idx_toewijzingen_ronde ON baantoewijzingen(ronde_id);
CREATE INDEX idx_toewijzingen_team ON baantoewijzingen(team_id);
```

---

## Tabel: PlanningHistorie

Geaggregeerde score per team-baan combinatie. Wordt bijgewerkt na elke publicatie en gebruikt door het algoritme.

```sql
CREATE TABLE planninghistorie (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id         UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
    competitie_id   UUID NOT NULL REFERENCES competities(id) ON DELETE CASCADE,
    team_id         UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    baan_id         UUID NOT NULL REFERENCES banen(id) ON DELETE CASCADE,

    aantal_keer     SMALLINT DEFAULT 0,              -- hoe vaak team op deze baan speelde
    totaal_score    NUMERIC(8,2) DEFAULT 0,          -- som van prioriteit_scores

    updated_at      TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (competitie_id, team_id, baan_id)
);

CREATE INDEX idx_historie_competitie ON planninghistorie(competitie_id);
CREATE INDEX idx_historie_team ON planninghistorie(team_id);
```

---

## ERD (tekstueel)

```
clubs ──< users
clubs ──< banen
clubs ──< competities
           competities ──< teams
           competities ──< speelrondes
                           speelrondes ──< baantoewijzingen >── teams
                           speelrondes ──< baantoewijzingen >── banen
           competities ──< planninghistorie >── teams
           competities ──< planninghistorie >── banen
```

# Competitie-Planner — Gebruikershandleiding

> Welkom! Deze handleiding legt uit wat Competitie-Planner is en hoe je de website kunt gebruiken om tenniswedstrijden te plannen voor jouw vereniging.

---

## Developer Setup

### Vereisten

- Docker en Docker Compose
- Of: Node.js 20+ en Python 3.12

### Docker (aanbevolen)

```bash
# Start alle services
make up

# Bekijk logs
make logs

# Stop alle services
make down
```

Services draaien op:
- Frontend: http://localhost:5173
- Backend: http://localhost:8000
- Database: localhost:5432

### Handmatig

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

**Backend:**
```bash
cd backend
cp .env.example .env
uv sync
uv run alembic upgrade head
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### TypeScript API Client

De frontend heeft een getypt API-client die gegenereerd wordt vanuit de OpenAPI-spec:

```bash
# Zorg dat de backend draait, dan:
cd frontend
npm run generate:api
```

Dit genereert types in `frontend/src/types/api.ts`. Herhaal na elke API-wijziging.

### Pre-commit quality hooks

CQ-003 introduces local pre-commit hooks that orchestrate existing quality checks (Ruff, Mypy, ESLint, TypeScript) before commit without replacing project tooling.

```bash
# One-time install
uv tool install pre-commit
pre-commit install

# Run all hooks manually
pre-commit run --all-files
```

Hook configuration is defined in `.pre-commit-config.yaml` and runs:

- Backend: `uv run ruff check app tests`, `uv run mypy app`
- Frontend: staged-file ESLint (`npm run lint -- <files>`), full typecheck (`npm run typecheck`)

### CI/CD Workflows

GitHub Actions workflows staan in `.github/workflows/` en volgen deze indeling:

- `ci.yml`: hoofdworkflow met pad-detectie, frontend/backend quality gates en Docker build-validatie.
- `security.yml`: dependency- en container-scans (warn-only of enforced via `SECURITY_ENFORCE` repository variable).
- `deploy-staging.yml`: automatische staging deploy via Coolify webhook na succesvolle `main` CI-run.
- `deploy-production.yml`: handmatige production deploy met verplichte GitHub environment approval.
- `rollback.yml`: handmatige rollback naar een eerder bekende SHA/tag via Coolify.
- `performance.yml`: niet-blokkerende performance signalen (frontend bundlegrootte en backend smoke latency).

Belangrijkste CI-commando's:

- Frontend (`frontend`): `npm ci`, `npm run lint`, `npm run typecheck`, `npm run test:run`, `npm run build`
- Backend (`backend`): `uv sync --dev`, `uv run ruff check .`, `uv run mypy .`, `uv run pytest`

Vereiste GitHub secrets/environments:

- Environments: `staging`, `production`
- Secrets: `COOLIFY_STAGING_WEBHOOK_URL`, `COOLIFY_PRODUCTION_WEBHOOK_URL`
- Optioneel: `COOLIFY_API_TOKEN`, `COOLIFY_APP_ID_STAGING`, `COOLIFY_APP_ID_PRODUCTION`
- Variabelen (optioneel voor staging smoke checks): `STAGING_API_HEALTH_URL`, `STAGING_FRONTEND_SMOKE_URL`

---

## Wat is Competitie-Planner?

Competitie-Planner is een online platform waarmee tennisverenigingen hun competitieroosters eenvoudig kunnen plannen en publiceren. Het systeem werkt multi-tenant: elke vereniging heeft een eigen omgeving op een eigen subdomein (`[slug].competitie-planner.nl`).

---

## Rollen

Het platform kent drie rollen met elk eigen rechten en mogelijkheden:

| | Superadmin | Vereniging Admin | Planner |
|---|---|---|---|
| Platform beheren | ✅ | — | — |
| Alle clubs inzien | ✅ | — | — |
| Betalingen beheren | ✅ | — | — |
| Clubinstellingen & branding | — | ✅ | — |
| Gebruikers beheren | — | ✅ | — |
| Banen beheren | — | ✅ | — |
| Competities aanmaken | — | ✅ | ✅ |
| Teams beheren | — | ✅ | ✅ |
| Banenindeling maken & publiceren | — | ✅ | ✅ |
| Publieke display bekijken | — | ✅ | ✅ |

---

## Functies per rol

### Superadmin

De superadmin beheert het hele platform via `admin.competitie-planner.nl`.

**Dashboard**
- Platformstatistieken: totaal clubs, actieve clubs, proefaccounts, opgeschorte clubs, totaal gebruikers en actieve gebruikers afgelopen 7 dagen
- Overzicht recent aangemelde clubs en recente inlogs

**Clubs beheren**
- Lijst van alle clubs met status (actief / trial / opgeschort)
- Club aanmaken met naam, slug en initieel admin-account
- Clubdetails inzien en bewerken (inclusief sponsorinformatie)
- Club sponsoren/ontsponsoren via clubdetail om betaalplicht te overrulen (gratis platformtoegang)
- Gesponsorde status zichtbaar in clubdetail met directe update van platformtoegang

**Gebruikers beheren**
- Platform-breed overzicht van alle gebruikers
- Gebruikersgegevens inzien en bewerken

**Betalingen (Mollie)**
- Prijsconfiguratie per competitietype (klein / groot club)
- Overzicht van IBAN-mandaten per club
- Betalingshistorie per club

---

### Vereniging Admin

De verenigingsbeheerder beheert de eigen club via `[slug].competitie-planner.nl`.

**Onboarding**

Bij het eerste gebruik wordt een begeleide setup-wizard gestart met vier stappen:
1. Clubgegevens invullen (naam, adres, contactinfo)
2. Banen toevoegen (naam, ondergrond, prioriteit)
3. Eerste competitie aanmaken
4. Teams aanmaken

**Dashboard**
- Overzicht van geplande acties en komende speelrondes
- Directe links naar openstaande taken (rondes zonder baanindeling, niet-gepubliceerde rondes)
- Weersignalen voor aankomende rondes

**Clubinstellingen**
- Naam, adres, website, telefoon
- Maximum thuisteams per speeldag
- Maximum aantal banen

**Branding**
- Primaire, secundaire en accentkleur instellen
- Lettertype kiezen
- Club-logo uploaden

**Gebruikers beheren**
- Overzicht van alle gebruikers binnen de club
- Gebruiker uitnodigen per e-mail (met rol: admin of planner)
- Uitnodigingen verlopen na 48 uur
- Gebruiker bewerken of verwijderen

**Banen beheren**
- Baan toevoegen met naam, nummer, ondergrond, verlichtingstype en prioriteitsscore
- Baan bewerken of verwijderen
- Banen worden gebruikt bij de automatische baanindeling

**Competities beheren**
- Competitie aanmaken (naam, speeldag, start-/einddatum, competitietype, poulegrootte, speelvorm, leeftijdscategorie)
- KNLTB-competitietemplates gebruiken als startpunt
- Competitie bewerken, dupliceren of verwijderen
- Feestdagen en inhaaldata per competitie instellen
- Standaard starttijden per competitie configureren
- Tijdslotconfiguratie per competitie instellen
- Wedstrijdschema importeren via de KNLTB-importfunctie

**Teams beheren**
- Team aanmaken met naam, captain, e-mail en speelklasse
- Team bewerken of verwijderen
- Teams bulk-activeren voor een competitieseizoen
- Teams importeren via CSV

**Seizoensoverzicht**
- Volledig overzicht van alle rondes en resultaten per competitie
- Exporteren als PDF of CSV

---

### Planner

De planner kan alles op het gebied van rondes plannen en publiceren.

**Speelrondes beheren**
- Overzicht van alle rondes per competitie met status (concept / gepubliceerd / afgelast)
- Enkele ronde genereren (automatische baanindeling)
- Meerdere rondes tegelijk genereren (bulk-generate)
- Gepubliceerde ronde terugtrekken (depubliceren)
- Meerdere rondes tegelijk publiceren (bulk-publish)
- Ronde afgelasten (bijv. bij slecht weer)
- Weersvoorspelling per speeldag inzien (neerslagkans, mm)

**Baanindeling bewerken**
- Handmatig baan en tijdstip per wedstrijd aanpassen via de rondedetailpagina
- Baan-toewijzing per wedstrijd bewerken of verwijderen
- Competitie-planning previewen voordat deze definitief wordt gemaakt
- Planning definitief maken (apply)

**Versiegeschiedenis (Snapshots)**
- Elke gepubliceerde ronde legt automatisch een snapshot vast
- Eerdere versie van een ronde terugzetten

**Ronde Planner**
- Visueel overzicht van alle wedstrijden per ronde over alle banen
- Wedstrijden handmatig naar een baan slepen

**Dagoverzicht**
- Per datum inzien welke teams wanneer thuisspelen en hoeveel banen er nodig zijn
- Conflicten en dubbele boekingen worden automatisch gesignaleerd

**PDF-export**
- Baanindeling van een ronde exporteren als PDF

**Agenda-export**
- Wedstrijdkalender exporteren als iCal-bestand (.ics) voor gebruik in agenda-apps

**Wedstrijden beheren**
- Individuele wedstrijden toevoegen, bewerken of verwijderen
- Uitslagen invoeren per wedstrijd

---

## Publieke functies (geen inlog vereist)

### Display (Narrowcasting)

Beschikbaar op `[slug].competitie-planner.nl/display` of via een publieke token-link.

- Toont de actuele baanindeling van de lopende of eerstvolgende ronde
- Automatisch verversen (elke 60 seconden)
- Volledige clubbranding (kleuren en logo)
- Geschikt voor weergave op een scherm bij de ingang of bar
- Volledigschermmodus mogelijk via de browser

### Club Kalender

Beschikbaar via de publieke kalenderlink van de club.

- Overzicht van alle geplande speelrondes in het seizoen
- Directe links naar de display-pagina per ronde

### Captain Portaal

Teamcaptains ontvangen een persoonlijke link (geen account nodig).

- Beschikbaarheid opgeven voor een ronde (beschikbaar / niet beschikbaar, met optionele notitie)
- Uitslagen invoeren na afloop van de wedstrijd (score thuisteam / uitteam)
- Overzicht van geplande thuiswedstrijden

---

## Authenticatie & beveiliging

- Inloggen via e-mail en wachtwoord
- JWT-tokens: access token (60 min geldig), refresh token (30 dagen, HttpOnly cookie)
- Bij verlopen token: automatische refresh zonder uitloggen
- Wachtwoord vergeten: reset via e-mail (link geldig 1 uur)
- Nieuwe gebruikers worden uitgenodigd via e-mail (invite geldig 48 uur)

---

## Veelgestelde vragen

**Wie kan er inloggen?**
De verenigingsbeheerder bepaalt wie een account krijgt en welke rol iemand heeft.

**Kan ik een oud rooster bekijken?**
Ja, via de historieweergave per competitie zijn alle eerdere rondes terug te vinden.

**Wat als een team niet kan spelen?**
Je kunt de competitieronde afgelasten of individuele wedstrijden aanpassen.

**Kan ik het rooster exporteren?**
Ja, een ronde kan worden geëxporteerd als PDF. Het volledige seizoensoverzicht is beschikbaar als PDF of CSV. Wedstrijddata kunnen als iCal worden geëxporteerd.

**Hoe toon ik het rooster op een scherm in de club?**
Gebruik de publieke display-link op een volledigschermsbrowser. Het scherm ververst automatisch elke minuut.

---

## Hulp nodig?

Heb je vragen over het gebruik? Neem contact op met je verenigingsbeheerder of stuur een e-mail naar support@competitie-planner.nl.
Feedback, foutmeldingen of suggesties zijn welkom via het [GitHub-issue systeem](https://github.com/rbnbrls/competitie-planner.nl/issues/new).

---

*Veel plezier met het plannen van de competitie!*

# Fase 6: Operationele Volwassenheid

CI pipeline verbeteren, monitoring, en code-kwaliteit standaarden.

---

## 6.1 GitHub Actions CI verbeteren
**Prioriteit: HOOG** | **Geschatte omvang: Middel**

De huidige CI draait alleen lint + typecheck. De backend "test" stap start alleen de server en doet een health check - er worden geen echte tests gedraaid.

**Huidige situatie:**
- `backend.yml`: ruff lint + format check + health check (geen echte tests)
- `frontend.yml`: ESLint + TypeScript typecheck (geen tests)
- Geen test coverage rapportage
- Geen build-validatie

**Taken:**
- [ ] Backend CI: voeg pytest stap toe met test-database (PostgreSQL service container)
- [ ] Backend CI: voeg test coverage rapportage toe (pytest-cov)
- [ ] Frontend CI: voeg Vitest stap toe
- [ ] Frontend CI: voeg build-stap toe (`npm run build`) om productie-builds te valideren
- [ ] Voeg concurrency group toe zodat meerdere pushes niet tegelijk draaien
- [ ] Branch protection: require CI passing voor merge naar main

**Bestanden:**
- `.github/workflows/backend.yml`
- `.github/workflows/frontend.yml`

---

## 6.2 Structured logging
**Prioriteit: MIDDEL** | **Geschatte omvang: Middel**

Geen gestructureerde logging. Moeilijk om problemen te debuggen in productie.

**Taken:**
- [ ] Voeg `structlog` toe als dependency
- [ ] Configureer JSON-formatted logging voor productie
- [ ] Voeg request-id toe aan elke log entry (middleware)
- [ ] Log alle belangrijke events: login, publicatie, payment, errors
- [ ] Correleer logs met tenant (club_id) voor multi-tenant debugging
- [ ] Development: behoud human-readable format

**Bestanden:**
- `backend/app/main.py`
- `backend/pyproject.toml`
- Nieuw: `backend/app/middleware/logging.py`

---

## 6.3 Health check uitbreiden
**Prioriteit: MIDDEL** | **Geschatte omvang: Klein**

Het huidige `/health` endpoint controleert alleen of de server draait, niet of de database bereikbaar is.

**Taken:**
- [ ] Health check uitbreiden met database connectivity check
- [ ] Response format: `{"status": "healthy", "database": "ok", "version": "x.y.z"}`
- [ ] Voeg `/ready` endpoint toe (voor Coolify readiness probe)
- [ ] Return HTTP 503 als database niet bereikbaar is

**Bestanden:**
- `backend/app/main.py` (of dedicated health router)

---

## 6.4 Kalender-integratie
**Prioriteit: LAAG** | **Geschatte omvang: Middel**

**Taken:**
- [ ] iCal (.ics) export endpoint per competitie
- [ ] iCal export per team (alleen eigen wedstrijden)
- [ ] "Toevoegen aan agenda" link in publicatie-email
- [ ] Publieke club-kalender pagina met alle speeldagen

**Bestanden:**
- Nieuw: `backend/app/routers/calendar.py`
- `backend/app/services/email.py`
- `frontend/src/pages/Display.tsx`

---

## 6.5 Database indexen optimaliseren
**Prioriteit: LAAG** | **Geschatte omvang: Klein**

Composiet-indexen missen voor veel voorkomende query-patronen.

**Taken:**
- [ ] Voeg index toe op `(club_id, actief)` voor banen
- [ ] Voeg index toe op `(club_id, actief)` voor teams
- [ ] Voeg index toe op `(competitie_id, datum)` voor speelrondes
- [ ] Alembic migratie voor nieuwe indexen

**Bestanden:**
- `backend/app/models/__init__.py`

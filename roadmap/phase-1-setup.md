---
phase: 1
naam: Project setup & infrastructuur
duur: 2 weken
status: todo
---

# Fase 1 — Project setup & infrastructuur

## Epic: Repo & project skelet

### F1-01
**Als** developer  
**wil ik** een monorepo met frontend/backend mappen  
**zodat** AI agents onafhankelijk per service kunnen werken

**AC:**
- `/frontend` map met Vite + React 18 + TypeScript scaffolding
- `/backend` map met FastAPI + SQLAlchemy 2.x async structuur
- `/docker-compose.yml` en `/docker-compose.prod.yml` aanwezig
- Elke map heeft eigen `README.md` met lokale setup instructies
- `.env.example` bestanden aanwezig in beide mappen

**Tags:** `infra`  
**Dependencies:** —

---

### F1-02
**Als** developer  
**wil ik** een Dockerfile per service en een docker-compose.yml  
**zodat** de volledige stack lokaal start met één commando

**AC:**
- `docker compose up` start: frontend op `:5173`, backend op `:8000`, postgres op `:5432`
- Hot-reload werkt in zowel frontend als backend in development mode
- PostgreSQL data persistent via named volume
- Health check endpoints: `GET /health` op backend geeft `{"status": "ok"}`

**Tags:** `infra`  
**Dependencies:** F1-01

---

### F1-03
**Als** developer  
**wil ik** Alembic migraties opgezet  
**zodat** alle tabelwijzigingen versiebeheerd zijn

**AC:**
- `alembic upgrade head` runt zonder errors vanuit container
- Baseline migratie aanwezig die alle tabellen uit `/datamodel/01-core-schema.md` aanmaakt
- `alembic downgrade -1` werkt correct
- Migratie bestanden in `/backend/alembic/versions/`

**Tags:** `backend`  
**Dependencies:** F1-02

---

## Epic: Coolify deployment pipeline

### F1-04
**Als** DevOps engineer  
**wil ik** dat Coolify automatisch deployed bij push naar main  
**zodat** er geen handmatige deployment stappen nodig zijn

**AC:**
- Coolify webhook actief voor zowel frontend als backend service
- Traefik verzorgt TLS via Let's Encrypt DNS-01 challenge voor `*.competitie-planner.nl`
- `admin.competitie-planner.nl`, `api.competitie-planner.nl` en `display.competitie-planner.nl` bereikbaar via HTTPS
- Deployment logt duidelijk succes/fout in Coolify UI

**Tags:** `infra`, `ci/cd`  
**Dependencies:** F1-02

---

### F1-05
**Als** developer  
**wil ik** een GitHub Actions CI pipeline met linting en tests  
**zodat** de codekwaliteit geborgd blijft bij elke PR

**AC:**
- Backend: `ruff check` en `ruff format --check` groen
- Backend: `pytest` runt baseline tests (health check, DB connectie)
- Frontend: `eslint` en `tsc --noEmit` groen
- Frontend: `vitest` runt baseline tests
- Alle checks verplicht groen voor merge naar main

**Tags:** `ci/cd`  
**Dependencies:** F1-01

---

## Epic: Database schema — core modellen

### F1-06
**Als** developer  
**wil ik** alle core tabellen aangemaakt via Alembic  
**zodat** het datamodel klaar is voor de applicatie

**AC:**
- Tabellen aanwezig: `clubs`, `users`, `invite_tokens`, `banen`, `competities`, `teams`, `speelrondes`, `baantoewijzingen`, `planninghistorie`
- Alle foreign keys, indexes en constraints aanwezig zoals gespecificeerd in `/datamodel/01-core-schema.md`
- SQLAlchemy models aanwezig voor alle tabellen in `/backend/app/models/`
- Pydantic schemas aanwezig voor request/response in `/backend/app/schemas/`

**Tags:** `backend`  
**Dependencies:** F1-03

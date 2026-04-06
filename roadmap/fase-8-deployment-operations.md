# Fase 8: Deployment & Operations

Productie-hardening specifiek voor de huidige deployment-setup: GitHub → Coolify → competitie-planner.nl.

**Huidige situatie:**
- **Repository**: https://github.com/rbnbrls/competitie-planner.nl/
- **CI**: GitHub Actions (lint + typecheck op PRs naar `main`)
- **CD**: Elke push naar `main` triggert automatisch een build in Coolify v4.0.0-beta.470
- **Productie**: http://competitie-planner.nl
- **Infra**: docker-compose.prod.yml met Traefik reverse proxy, PostgreSQL 16, Let's Encrypt SSL
- **Probleem**: Er is geen staging, geen database backup, geen monitoring, en elke commit naar main gaat direct live

---

## 8.1 Database backup-strategie
**Prioriteit: KRITIEK** | **Geschatte omvang: Middel**

PostgreSQL draait in Docker met een named volume (`pgdata`). Er is geen automatische backup. Bij dataverlies zijn alle clubs hun competitiedata kwijt.

**Taken:**
- [ ] Dagelijkse automatische `pg_dump` via cron in een sidecar container of Coolify scheduled task
- [ ] Backups opslaan op externe opslag (S3-compatible, bijv. Backblaze B2 of Wasabi)
- [ ] Retentiebeleid: dagelijks 7 dagen, wekelijks 4 weken, maandelijks 6 maanden
- [ ] Backup-verificatie: wekelijks automatisch een restore test draaien
- [ ] Documenteer restore-procedure in `docs/disaster-recovery.md`
- [ ] Voeg backup-script toe aan repository

**Bestanden:**
- Nieuw: `scripts/backup.sh`
- Nieuw: `docker-compose.prod.yml` (backup service)
- Nieuw: `docs/disaster-recovery.md`

---

## 8.2 Zero-downtime deployments
**Prioriteit: HOOG** | **Geschatte omvang: Middel**

Elke push naar `main` triggert Coolify die de containers herbouwt. Tijdens de build is de applicatie offline. Dit is problematisch tijdens competitiedagen.

**Taken:**
- [ ] Configureer Coolify health check op `/health` endpoint (zie fase 6.3)
- [ ] Configureer Coolify readiness probe op `/ready` endpoint
- [ ] Zorg dat Coolify pas verkeer doorstuurt naar nieuwe container als health check slaagt
- [ ] Voeg `HEALTHCHECK` instruction toe aan backend Dockerfile
- [ ] Database migraties draaien als init-container / pre-deploy stap (niet bij startup)
- [ ] Test: deploy een kapotte versie en verifieer dat Coolify niet switcht

**Bestanden:**
- `backend/Dockerfile`
- `frontend/Dockerfile`
- `docker-compose.prod.yml`
- Coolify configuratie (handmatig via Coolify UI)

---

## 8.3 Staging omgeving
**Prioriteit: HOOG** | **Geschatte omvang: Middel**

Er is geen staging omgeving. Elke commit naar main gaat direct live naar productie.

**Taken:**
- [ ] Maak een `staging` branch aan in GitHub
- [ ] Configureer een tweede Coolify resource voor staging (bijv. `staging.competitie-planner.nl`)
- [ ] Staging triggert op push naar `staging` branch
- [ ] Productie triggert alleen op push naar `main`
- [ ] Workflow: feature branch → PR naar staging → test → PR naar main → live
- [ ] Staging database met seed data (geen kopie van productie)
- [ ] Documenteer de deployment workflow

**Bestanden:**
- Nieuw: `docs/deployment.md`
- Nieuw: `scripts/seed-staging.py` (test data)
- Coolify configuratie (handmatig)

---

## 8.4 Error tracking met Sentry
**Prioriteit: HOOG** | **Geschatte omvang: Middel**

Geen error tracking. Als iets kapot gaat in productie, merk je het pas als een gebruiker klaagt.

**Taken:**
- [ ] Maak Sentry project aan (gratis tier is voldoende)
- [ ] Backend: voeg `sentry-sdk[fastapi]` toe
- [ ] Frontend: voeg `@sentry/react` toe
- [ ] Configureer via `SENTRY_DSN` env var
- [ ] Source maps uploaden bij build (Sentry Vite plugin)
- [ ] Sentry alerts instellen: email bij unhandled exceptions
- [ ] Tenant-context meesturen (club_id, user_id) voor debugging

**Bestanden:**
- `backend/app/main.py`
- `backend/pyproject.toml`
- `frontend/src/main.tsx`
- `frontend/package.json`
- `frontend/vite.config.ts`

---

## 8.5 Uptime monitoring
**Prioriteit: MIDDEL** | **Geschatte omvang: Klein**

Niemand merkt het als de site offline gaat buiten kantooruren.

**Taken:**
- [ ] Configureer externe uptime monitor (bijv. UptimeRobot gratis, of BetterStack)
- [ ] Monitor: `https://competitie-planner.nl` (frontend)
- [ ] Monitor: `https://api.competitie-planner.nl/health` (backend)
- [ ] Alert via email + optioneel Telegram/Slack bij downtime
- [ ] Status page (optioneel): publieke pagina met uptime history

---

## 8.6 HTTPS afdwingen
**Prioriteit: HOOG** | **Geschatte omvang: Klein**

De productie URL is `http://competitie-planner.nl` (HTTP). SSL is geconfigureerd via Traefik + Let's Encrypt, maar HTTP-naar-HTTPS redirect moet gegarandeerd zijn.

**Taken:**
- [ ] Verifieer dat Traefik HTTP→HTTPS redirect actief is
- [ ] Voeg `Strict-Transport-Security` header toe (HSTS)
- [ ] Backend: voeg security headers middleware toe
- [ ] Update alle hardcoded URLs naar https:// (docker-compose, config)
- [ ] Test: `curl -I http://competitie-planner.nl` moet 301 naar https geven

**Bestanden:**
- `docker-compose.prod.yml` (Traefik labels)
- `backend/app/main.py` (security headers)

---

## 8.7 Environment variabelen documenteren
**Prioriteit: MIDDEL** | **Geschatte omvang: Klein**

Er is geen overzicht van alle benodigde env vars voor productie. Nieuwe deployments missen makkelijk een variabele.

**Taken:**
- [ ] Maak `.env.example` met alle variabelen en beschrijving
- [ ] Markeer verplichte vs optionele variabelen
- [ ] Voeg Coolify-specifieke variabelen toe (als die er zijn)
- [ ] Documenteer welke secrets in Coolify moeten worden ingesteld

**Bestanden:**
- Nieuw: `backend/.env.example`
- Nieuw: `docs/deployment.md` (of uitbreiden)

---

## 8.8 Docker image optimalisatie
**Prioriteit: LAAG** | **Geschatte omvang: Klein**

Snellere builds = snellere deployments via Coolify.

**Taken:**
- [ ] Multi-stage builds voor kleinere images
- [ ] Gebruik `.dockerignore` om onnodige bestanden uit te sluiten
- [ ] Pin base image versies (niet `latest`)
- [ ] Cache pip/npm dependencies in aparte layer
- [ ] Frontend: build static assets, serve via nginx (niet node)

**Bestanden:**
- `backend/Dockerfile`
- `frontend/Dockerfile`
- Nieuw: `backend/.dockerignore`
- Nieuw: `frontend/.dockerignore`

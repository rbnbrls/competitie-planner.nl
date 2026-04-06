# Fase 1: Kritieke Fixes

Bugs, security hotfixes en het testfundament leggen. Deze fase moet eerst worden afgerond voordat aan nieuwe functionaliteit wordt gewerkt.

---

## 1.1 Dubbele `max_banen` kolom fixen
**Prioriteit: KRITIEK** | **Geschatte omvang: Klein**

In het `Club` model (`backend/app/models/__init__.py` regel 44 en 48) staat `max_banen` twee keer gedefinieerd. Dit is een bug die tot onvoorspelbaar gedrag kan leiden.

**Taken:**
- [ ] Verwijder de dubbele `max_banen` definitie op regel 48
- [ ] Controleer dat de overgebleven definitie correct is (default=8)
- [ ] Voeg ruff-regel toe die duplicate class attributes detecteert

**Bestanden:**
- `backend/app/models/__init__.py`

---

## 1.2 Mollie API key encrypteren
**Prioriteit: KRITIEK** | **Geschatte omvang: Middel**

De Mollie API key wordt als plaintext in de database opgeslagen (`MollieConfig.api_key`). Dit is een betalingssleutel die toegang geeft tot financiële transacties.

**Taken:**
- [ ] Voeg `cryptography` package toe aan dependencies
- [ ] Maak een encryptie-service met Fernet symmetric encryption
- [ ] Encrypt de API key voor opslag, decrypt bij gebruik
- [ ] API key alleen tonen als gemaskeerd in de UI (bijv. `live_****abc`)
- [ ] Voeg een `ENCRYPTION_KEY` env var toe aan config
- [ ] Migratie: bestaande plaintext keys encrypteren

**Bestanden:**
- `backend/app/models/__init__.py` (MollieConfig model)
- `backend/app/services/mollie.py`
- `backend/app/routers/payments.py`
- `backend/app/config.py`
- Nieuw: `backend/app/services/encryption.py`

---

## 1.3 Secret key validatie bij startup
**Prioriteit: HOOG** | **Geschatte omvang: Klein**

In `config.py`: `SECRET_KEY: str = "changeme"`. Als iemand vergeet deze te wijzigen, zijn alle JWT tokens voorspelbaar. Daarnaast is `SUPER_ADMIN_EMAIL: str = "ruben@rabar.nl"` hardcoded.

**Taken:**
- [ ] Voeg startup validatie toe: weiger te starten als `SECRET_KEY == "changeme"` of korter dan 64 tekens
- [ ] Valideer alle kritieke env vars bij startup (`DATABASE_URL`, `SECRET_KEY`)
- [ ] Verwijder hardcoded `SUPER_ADMIN_EMAIL` default
- [ ] Log een waarschuwing als CORS_ORIGINS een wildcard bevat

**Bestanden:**
- `backend/app/config.py`
- `backend/app/main.py` (startup event)

---

## 1.4 Database migraties opzetten
**Prioriteit: HOOG** | **Geschatte omvang: Middel**

Alembic is geconfigureerd maar er zijn geen migratie-bestanden. Het schema wordt direct vanuit models aangemaakt. Dit is onhoudbaar bij productie-deployments.

**Taken:**
- [ ] Configureer Alembic correct met async SQLAlchemy
- [ ] Genereer initiële migratie vanuit huidige models
- [ ] Documenteer migratie-workflow in README of CONTRIBUTING.md
- [ ] Voeg `alembic upgrade head` toe aan het startup-script / Dockerfile
- [ ] Test rollback van de initiële migratie

**Bestanden:**
- `alembic/` directory
- `alembic.ini`
- `backend/Dockerfile` en `backend/Dockerfile.dev`

---

## 1.5 Tests toevoegen
**Prioriteit: KRITIEK** | **Geschatte omvang: Groot**

Er zijn nul tests (backend en frontend). Dit maakt refactoring en nieuwe features risicovol.

**Taken:**
- [ ] Backend test-infrastructuur opzetten (pytest + httpx + test database)
- [ ] Unit tests voor planning-algoritme (`services/planning.py`)
- [ ] Integration tests voor auth endpoints (login, refresh, register)
- [ ] Integration tests voor tenant endpoints (CRUD competities, teams, banen)
- [ ] Integration tests voor planning endpoints (genereer, publiceer)
- [ ] Frontend test-infrastructuur opzetten (Vitest + React Testing Library)
- [ ] Component tests voor RondeDetail (drag-drop, toewijzingen)
- [ ] Update GitHub Actions workflows om tests te draaien
- [ ] Voeg test coverage rapportage toe

**Bestanden:**
- Nieuw: `backend/tests/` directory
- Nieuw: `backend/tests/conftest.py` (fixtures, test DB)
- Nieuw: `backend/tests/test_planning.py`
- Nieuw: `backend/tests/test_auth.py`
- Nieuw: `backend/tests/test_competities.py`
- Nieuw: `frontend/src/__tests__/` directory
- `.github/workflows/backend.yml`
- `.github/workflows/frontend.yml`

---

## 1.6 `datetime.utcnow` vervangen
**Prioriteit: MIDDEL** | **Geschatte omvang: Klein**

Overal in models wordt `datetime.utcnow` gebruikt als default. Dit is deprecated in Python 3.12+ en geeft naive datetimes (zonder timezone).

**Taken:**
- [ ] Vervang alle `datetime.utcnow` door `datetime.now(timezone.utc)` in models
- [ ] Controleer dat `from datetime import timezone` is geimporteerd
- [ ] Controleer of andere bestanden ook `utcnow` gebruiken

**Bestanden:**
- `backend/app/models/__init__.py` (alle modellen)

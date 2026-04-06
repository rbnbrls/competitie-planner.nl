# Fase 4: Performance & Security

Database-optimalisaties, frontend performance, en security hardening.

---

## 4.1 N+1 query probleem fixen
**Prioriteit: HOOG** | **Geschatte omvang: Middel**

In `update_planning_historie()` (`services/planning.py` regel 105-109) wordt voor elke toewijzing een aparte query gedaan om de baan op te halen. Bij 10 banen = 10 extra queries.

**Taken:**
- [ ] Batch-query alle banen in `update_planning_historie()` in plaats van per toewijzing
- [ ] Gebruik `selectinload` of `joinedload` voor relaties bij toewijzingen ophalen
- [ ] Audit alle routers op soortgelijke N+1 patronen
- [ ] Voeg SQLAlchemy query logging toe in development om N+1 te detecteren

**Bestanden:**
- `backend/app/services/planning.py`
- `backend/app/routers/planning.py`
- `backend/app/routers/competities.py`
- `backend/app/routers/teams.py`

---

## 4.2 Frontend data-laag verbeteren
**Prioriteit: HOOG** | **Geschatte omvang: Groot**

In `RondeDetail.tsx` wordt `loadData()` aangeroepen na elke toewijzing-update. TanStack Query is al een dependency maar wordt nergens gebruikt.

**Taken:**
- [ ] Implementeer TanStack Query voor alle API calls
- [ ] Optimistic updates voor toewijzing-wijzigingen
- [ ] Cache invalidatie i.p.v. volledige herlaad
- [ ] Error boundaries voor graceful error handling
- [ ] Loading skeletons i.p.v. "Laden..." tekst
- [ ] Debounce op notitie-updates (300-500ms)
- [ ] Debounce op tijdslot-wijzigingen

**Bestanden:**
- `frontend/src/pages/tenant/RondeDetail.tsx`
- `frontend/src/lib/api.ts`
- Nieuw: `frontend/src/hooks/useRondeDetail.ts`
- Nieuw: `frontend/src/hooks/useCompetities.ts`
- Alle pagina's in `frontend/src/pages/tenant/`

---

## 4.3 Rate limiting
**Prioriteit: HOOG** | **Geschatte omvang: Middel**

Geen rate limiting op login endpoints, wachtwoord-reset, of registratie. Brute-force aanvallen zijn mogelijk.

**Taken:**
- [ ] Voeg `slowapi` of soortgelijk toe als dependency
- [ ] Rate limit op `/auth/login`: max 5 pogingen per minuut per IP
- [ ] Rate limit op `/tenant/login`: max 5 pogingen per minuut per IP
- [ ] Rate limit op `/forgot-password`: max 3 per uur per email
- [ ] Rate limit op `/register-admin`: max 3 per uur per IP
- [ ] Return `429 Too Many Requests` met retry-after header
- [ ] Account lockout na 10 mislukte pogingen (15 minuten)

**Bestanden:**
- `backend/app/main.py`
- `backend/app/routers/auth.py`
- `backend/app/routers/tenant.py`
- `backend/pyproject.toml` (nieuwe dependency)

---

## 4.4 IBAN encrypteren
**Prioriteit: HOOG** | **Geschatte omvang: Klein**

`SepaMandate.iban` staat als plaintext in de database. Dit zijn financiële gegevens die onder privacy-wetgeving (AVG/GDPR) vallen.

**Taken:**
- [ ] Hergebruik encryptie-service uit fase 1.2
- [ ] Encrypt IBAN voor opslag
- [ ] Alleen laatste 4 tekens tonen in UI (bijv. `****1234`)
- [ ] Alembic migratie: bestaande IBANs encrypteren

**Bestanden:**
- `backend/app/models/__init__.py` (SepaMandate)
- `backend/app/services/mollie.py`
- `backend/app/routers/payments.py`
- `frontend/src/pages/tenant/Checkout.tsx`

---

## 4.5 CORS en CSRF hardening
**Prioriteit: MIDDEL** | **Geschatte omvang: Klein**

CORS origins worden via env var ingesteld, maar er is geen validatie.

**Taken:**
- [ ] Valideer CORS origins format bij startup (geen wildcards in productie)
- [ ] Log waarschuwing bij `*` of `localhost` origins in productie
- [ ] Controleer dat tokens via Authorization header gaan (niet cookies) - bevestig CSRF-veiligheid
- [ ] Voeg security headers toe: `X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`

**Bestanden:**
- `backend/app/main.py`
- `backend/app/config.py`

---

## 4.6 Paginering op lijsten
**Prioriteit: MIDDEL** | **Geschatte omvang: Middel**

Teams, competities en rondes worden allemaal in één keer opgehaald.

**Taken:**
- [ ] Backend: paginering-helper (offset/limit + total count)
- [ ] Paginering op team-lijsten
- [ ] Archivering van oude competities (verberg niet-actieve)
- [ ] Lazy loading van speelrondes (toon alleen huidige + komende)
- [ ] Frontend: paginering-component

**Bestanden:**
- `backend/app/routers/teams.py`
- `backend/app/routers/competities.py`
- `frontend/src/pages/tenant/Teams.tsx`
- `frontend/src/pages/tenant/Competities.tsx`

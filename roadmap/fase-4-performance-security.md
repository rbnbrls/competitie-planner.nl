# Fase 4: Performance & Security

Database-optimalisaties, frontend performance, en security hardening.



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

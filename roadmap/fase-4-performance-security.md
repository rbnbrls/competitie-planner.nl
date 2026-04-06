# Fase 4: Performance & Security

Database-optimalisaties, frontend performance, en security hardening.


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

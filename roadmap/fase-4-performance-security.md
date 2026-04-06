# Fase 4: Performance & Security

Database-optimalisaties, frontend performance, en security hardening.



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

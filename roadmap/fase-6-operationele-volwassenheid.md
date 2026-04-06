# Fase 6: Operationele Volwassenheid

CI pipeline verbeteren, monitoring, en code-kwaliteit standaarden.



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

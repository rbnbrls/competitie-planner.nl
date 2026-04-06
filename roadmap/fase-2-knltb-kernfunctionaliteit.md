# Fase 2: KNLTB-kernfunctionaliteit

De applicatie mist cruciale functionaliteit die nodig is volgens de officiële KNLTB competitieregels voor senioren. Deze fase voegt het kerndatamodel toe.

---

## 2.1 Thuis/Uit-wedstrijden model
**Prioriteit: KRITIEK** | **Geschatte omvang: Groot**

De KNLTB voorjaarscompetitie draait om thuis- en uitwedstrijden. Teams spelen afwisselend thuis en uit. Het huidige datamodel kent alleen baantoewijzingen per ronde maar geen onderscheid tussen thuiswedstrijden (teams die op de eigen club spelen) en uitwedstrijden (teams die weg zijn).

**KNLTB-context:**
- Een poule bevat meestal 8 teams van verschillende clubs
- Elk team speelt elke tegenstander eenmaal (7 speeldagen)
- Thuisteams ontvangen de tegenstander op de eigen club en hebben banen nodig
- Uitteams reizen naar de tegenstander en hebben geen banen nodig op de eigen club
- De planner hoeft alleen de thuiswedstrijden in te plannen op banen

**Taken:**
- [ ] Voeg `is_thuiswedstrijd` boolean toe aan `BaanToewijzing`
- [ ] Of beter: maak een apart `Wedstrijd` model met `thuisteam_id`, `uitteam_id`, `ronde_id`
- [ ] Frontend: visualiseer welke teams thuis/uit zijn per ronde
- [ ] Frontend: alleen thuisteams tonen in de baanplanning
- [ ] Planning-algoritme: alleen thuisteams toewijzen aan banen
- [ ] Alembic migratie voor het nieuwe model

**Bestanden:**
- `backend/app/models/__init__.py`
- `backend/app/services/planning.py`
- `backend/app/routers/planning.py`
- `frontend/src/pages/tenant/RondeDetail.tsx`
- `frontend/src/pages/tenant/Speelrondes.tsx`

---

## 2.2 Tegenstander-koppeling en speelschema
**Prioriteit: KRITIEK** | **Geschatte omvang: Groot**

De planner moet weten welk team tegen welk team speelt per ronde, conform de KNLTB-poule-indeling.

**KNLTB-context:**
- De KNLTB deelt teams in poules in op basis van niveau, leeftijd en regio
- Het speelschema (wie speelt wanneer tegen wie, thuis of uit) wordt door de KNLTB bepaald
- Begin maart ontvangen captains het schema
- Captains/TC voert dit schema in bij de club

**Taken:**
- [ ] Maak `Wedstrijd` model: `id`, `competitie_id`, `ronde_id`, `thuisteam_id`, `uitteam_id`, `status`
- [ ] API endpoint: CRUD voor wedstrijden per ronde
- [ ] Import-functie: CSV/handmatige invoer van KNLTB-speelschema
- [ ] Frontend: wedstrijdprogramma-pagina per competitie
- [ ] Frontend: per ronde tonen welke wedstrijden thuis zijn (en dus banen nodig hebben)
- [ ] Validatie: controleer dat elk team precies 1x tegen elke tegenstander speelt

**Bestanden:**
- `backend/app/models/__init__.py`
- Nieuw: `backend/app/routers/wedstrijden.py`
- `backend/app/routers/planning.py`
- Nieuw: `frontend/src/pages/tenant/Wedstrijden.tsx`
- `frontend/src/lib/api.ts`

---

## 2.3 Meerdere teams per baan per ronde (tijdslots)
**Prioriteit: HOOG** | **Geschatte omvang: Middel**

Het huidige model heeft een unique constraint op `(ronde_id, baan_id)`, waardoor slechts 1 team per baan per ronde kan. In de praktijk worden banen in tijdslots verdeeld: team A speelt 19:00-20:30, team B speelt 20:30-22:00 op dezelfde baan.

**Taken:**
- [ ] Alembic migratie: verwijder unique constraint `uq_toewijzingen_ronde_baan`
- [ ] Nieuwe unique constraint: `(ronde_id, baan_id, tijdslot_start)`
- [ ] Maak `tijdslot_start` required (niet meer nullable) bij baantoewijzing
- [ ] Backend: validatie dat tijdslots niet overlappen op dezelfde baan
- [ ] Frontend: toon meerdere teams per baan, gegroepeerd per tijdslot
- [ ] Frontend: visuele tijdlijn per baan

**Bestanden:**
- `backend/app/models/__init__.py` (BaanToewijzing)
- `backend/app/routers/planning.py`
- `frontend/src/pages/tenant/RondeDetail.tsx`

---

## 2.4 Cross-competitie baanplanning
**Prioriteit: HOOG** | **Geschatte omvang: Middel**

Veel verenigingen hebben meerdere competities op dezelfde dag (bijv. woensdag 3 teams thuis, vrijdag 2 teams thuis). Banen moeten over competities heen worden verdeeld.

**KNLTB-context:**
- Op woensdag en vrijdagavond mogen max 3 teams thuis spelen
- Er moet ook ruimte zijn voor vrije spelers en training
- De TC maakt een "flexibele baanindeling" om optimaal gebruik te maken van alle banen

**Taken:**
- [ ] Dagoverzicht-endpoint: alle competities + rondes op een specifieke datum
- [ ] Conflictdetectie: waarschuwing als meer thuisteams dan beschikbare banen
- [ ] Frontend: dagoverzicht-pagina met alle competities op die dag
- [ ] Planning-algoritme: respecteer max aantal thuisteams per dag (instelbaar per club)
- [ ] Club-instelling: `max_thuisteams_per_dag` toevoegen

**Bestanden:**
- `backend/app/models/__init__.py` (Club model)
- Nieuw: `backend/app/routers/dagoverzicht.py`
- `backend/app/services/planning.py`
- Nieuw: `frontend/src/pages/tenant/Dagoverzicht.tsx`

---

## 2.5 Tijdslotbeheer verbeteren
**Prioriteit: HOOG** | **Geschatte omvang: Middel**

Tijdslots worden nu handmatig per toewijzing ingevoerd. Dit is tijdrovend en foutgevoelig.

**Taken:**
- [ ] Standaard tijdslots per competitie instellen (bijv. vrijdagavond: 19:00, 20:30)
- [ ] Competitie model uitbreiden: `standaard_starttijden` (array van times)
- [ ] Automatisch tijdslots toewijzen bij generatie op basis van standaard-tijden
- [ ] Visueel tijdlijn-overzicht van baanbezetting per dag
- [ ] Conflictdetectie bij overlappende tijdslots op dezelfde baan

**Bestanden:**
- `backend/app/models/__init__.py` (Competitie model)
- `backend/app/services/planning.py`
- `frontend/src/pages/tenant/Competities.tsx`
- `frontend/src/pages/tenant/RondeDetail.tsx`

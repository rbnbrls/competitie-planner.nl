---
phase: 6
naam: Publicatie & narrowcasting display
duur: 2 weken
status: completed
---

# Fase 6 — Publicatie & narrowcasting display

## Epic: Publicatie flow

### F6-01
**Als** planner  
**wil ik** een speelronde publiceren  
**zodat** de banenindeling zichtbaar wordt op de publieke URL

**AC:**
- "Publiceer indeling" knop op rondedetail pagina (alleen zichtbaar bij status = concept)
- POST `/api/v1/rondes/{id}/publiceer`
- Backend: status → `gepubliceerd`, `gepubliceerd_op` = nu, `gepubliceerd_door` = current user
- `public_token` aangemaakt (UUID, uniek) indien nog niet aanwezig
- `update_planning_historie()` aangeroepen (F5-02)
- Response bevat de publieke URL
- Status badge in rondeoverzicht verandert naar "Gepubliceerd ✓"

**Tags:** `backend`, `frontend`  
**Dependencies:** F5-04

---

### F6-02
**Als** planner  
**wil ik** een gepubliceerde ronde kunnen depubliceren  
**zodat** ik fouten kan corrigeren voordat iedereen de indeling ziet

**AC:**
- "Depubliceer" knop zichtbaar bij gepubliceerde ronde
- Bevestigingsdialog met waarschuwing
- POST `/api/v1/rondes/{id}/depubliceer` → status terug naar `concept`
- Publieke display toont "Geen actieve banenindeling beschikbaar" na depublicatie
- `public_token` blijft behouden (zelfde URL bij hernieuwde publicatie)
- PlanningHistorie wordt NIET teruggedraaid (score blijft, is al gebruikt voor rotatie)

**Tags:** `backend`, `frontend`  
**Dependencies:** F6-01

---

### F6-03
**Als** planner  
**wil ik** de publieke URL eenvoudig kunnen kopiëren  
**zodat** ik die kan delen of in de narrowcasting configuratie kan plakken

**AC:**
- "Kopieer URL" knop naast de publieke URL op rondedetail pagina
- URL format: `https://display.competitie-planner.nl/[slug]/[public_token]`
- Kopieer actie geeft visuele bevestiging ("Gekopieerd!")
- QR-code generatie (optioneel, nice-to-have voor MVP)

**Tags:** `frontend`  
**Dependencies:** F6-01

---

## Epic: Publieke display pagina

### F6-04
**Als** toeschouwer of narrowcasting systeem  
**wil ik** de banenindeling zien op een groot scherm  
**zodat** teamleden weten welk team op welke baan speelt

**AC:**
- Route: `display.competitie-planner.nl/[slug]` → actuele ronde (F6-07)
- Route: `display.competitie-planner.nl/[slug]/[token]` → specifieke ronde
- Layout: zie `/architecture/04-public-display.md`
- Tabel: baan (nr + naam), team, tijdslot start, tijdslot eind, notitie
- Font-size minimaal 28px voor baan- en teamnamen
- Geen sidebar, geen nav, geen login knop — alleen de indeling

**Tags:** `frontend`, `backend`  
**Dependencies:** F6-01

---

### F6-05
**Als** display pagina  
**wil ik** de verenigingskleuren en het logo tonen  
**zodat** de pagina herkenbaar is voor leden van de vereniging

**AC:**
- Logo zichtbaar linksboven
- Header achtergrondkleur = `primary_color` van de club
- Header tekstkleur = `secondary_color` van de club
- Accentkleur gebruikt voor highlights (bijv. actieve rij)
- Volledig getest op dark en light omgevingen (achtergrond is white default)

**Tags:** `frontend`  
**Dependencies:** F6-04, F3-05

---

### F6-06
**Als** narrowcasting systeem  
**wil ik** de display pagina als iframe kunnen embedden  
**zodat** ik de bestaande Raspberry Pi kiosk setup kan hergebruiken

**AC:**
- Backend stuurt geen `X-Frame-Options` header voor display routes
- Backend stuurt `Content-Security-Policy: frame-ancestors *` voor display routes
- Backend stuurt `Cache-Control: no-cache` voor display routes
- Pagina werkt correct op 1920×1080 schermresolutie
- Iframe embed test: `<iframe src="https://display.competitie-planner.nl/[slug]" width="1920" height="1080">`

**Tags:** `backend`, `frontend`  
**Dependencies:** F6-04

---

### F6-07
**Als** display pagina  
**wil ik** automatisch de meest relevante ronde tonen  
**zodat** ik altijd de juiste informatie zie zonder dat iemand de URL hoeft bij te werken

**AC:**
- GET `/display/[slug]/actueel` → geeft eerstvolgende gepubliceerde ronde terug op basis van datum >= vandaag
- Als er geen toekomstige gepubliceerde ronde is: geeft meest recente gepubliceerde ronde terug
- Fallback states conform `/architecture/04-public-display.md`
- Pagina ververst automatisch elke 60 seconden (setInterval + refetch)
- Countdown timer in footer toont "Ververst over X seconden"

**Tags:** `backend`, `frontend`  
**Dependencies:** F6-04

---

### F6-08 (nice-to-have)

**Als** planner  
**wil ik** een voorbeeldweergave van de display kunnen bekijken vanuit het admin panel  
**zodat** ik kan controleren hoe de indeling eruit ziet op het scherm

**AC:**
- "Voorbeeld display" knop op rondedetail pagina
- Opent display pagina in nieuw tabblad
- Werkt voor zowel concept als gepubliceerde rondes (concept: zichtbaar voor admin, niet via publieke URL)

**Tags:** `frontend`  
**Dependencies:** F6-04

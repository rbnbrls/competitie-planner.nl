---
phase: 5
naam: Planningsengine & indeling UI
duur: 3 weken
status: todo
---

# Fase 5 — Planningsengine & indeling UI

## Epic: Automatische indeling (algoritme)

### F5-01
**Als** systeem  
**wil ik** per speelronde automatisch teams verdelen over beschikbare banen  
**zodat** de planner een eerlijke basisindeling krijgt die hij kan corrigeren

**AC:**
- POST `/api/v1/rondes/{id}/genereer` triggert het algoritme
- Algoritme implementatie conform `/datamodel/02-scheduling-algorithm.md`
- Resultaat opgeslagen als `BaanToewijzing` records met status `concept`
- Bestaande concept-toewijzingen voor die ronde worden overschreven
- Response: volledig ingevulde toewijzingslijst
- Algoritme runtime < 500ms voor maximaal 20 teams en 20 banen

**Tags:** `algoritme`, `backend`  
**Dependencies:** F4-04, F3-06

---

### F5-02
**Als** systeem  
**wil ik** na elke publicatie de planninghistorie bijwerken  
**zodat** het algoritme bij de volgende ronde correcte rotaties berekent

**AC:**
- `update_planning_historie()` wordt aangeroepen als onderdeel van de publiceer flow
- `PlanningHistorie` records aangemaakt of bijgewerkt voor elke gepubliceerde toewijzing
- Handmatig gewijzigde toewijzingen gebruiken de definitieve waarden (niet de auto-gegenereerde)
- Functie is idempotent: dubbele aanroep bij zelfde ronde_id heeft geen effect

**Tags:** `algoritme`, `backend`  
**Dependencies:** F5-01

---

### F5-03
**Als** planner  
**wil ik** een historieoverzicht zien van hoe vaak elk team op welke baan heeft gespeeld  
**zodat** ik kan controleren of de rotatie klopt

**AC:**
- Heatmap tabel: rijen = teams, kolommen = banen, cellen = aantal keer gespeeld
- Kleurschaal: wit = 0, donkergroen = hoog (of primaire kleur van vereniging)
- Zichtbaar via tabblad "Historie" op de competitie pagina

**Tags:** `frontend`, `backend`  
**Dependencies:** F5-02

---

## Epic: Indeling UI

### F5-04
**Als** planner  
**wil ik** de automatisch gegenereerde indeling zien in een overzichtelijke UI  
**zodat** ik snel kan beoordelen of de indeling correct is

**AC:**
- Pagina per speelronde met: datum, competitienaam, status badge
- Tabel: baan (nummer + naam + eigenschappen), toegewezen team, tijdslot start/eind, notitie
- Banen gesorteerd op prioriteit (beste baan bovenaan)
- Niet-toegewezen teams worden getoond onderaan ("Niet ingepland: Team X, Team Y")
- "Genereer indeling" knop roept F5-01 aan (met bevestiging als al toewijzingen bestaan)

**Tags:** `frontend`  
**Dependencies:** F5-01

---

### F5-05
**Als** planner  
**wil ik** de indeling handmatig kunnen aanpassen via drag & drop  
**zodat** ik uitzonderingen kan verwerken (e.g. baan 2 tijdelijk niet beschikbaar)

**AC:**
- Teams zijn draggable naar andere banen (dnd-kit)
- Teams kunnen gewisseld worden (team A naar baan 2, team B daarmee naar baan 1)
- Niet-ingeplande teams kunnen gesleept worden naar een lege baan
- Wijzigingen direct opgeslagen via PATCH `/api/v1/toewijzingen/{id}` (optimistic update)
- Validatie: één team per baan per ronde (swap automatisch)

**Tags:** `frontend`, `backend`  
**Dependencies:** F5-04

---

### F5-06
**Als** planner  
**wil ik** tijdsloten en notities per toewijzing kunnen instellen  
**zodat** teams weten hoe laat en op welke baan ze spelen

**AC:**
- Inline edit: tijdslot_start en tijdslot_eind (time picker)
- Inline edit: notitieveld (tekst, max 200 tekens)
- Standaard tijdsloten kunnen worden ingesteld op competitieniveau ("Alle rondes: 10:00-12:00")
- Tijdsloten zichtbaar op de publieke display

**Tags:** `frontend`, `backend`  
**Dependencies:** F5-04

---

### F5-07
**Als** planner  
**wil ik** met één klik een nieuwe automatische indeling laten genereren  
**zodat** ik een nieuwe poging kan doen als de indeling niet bevalt

**AC:**
- "Opnieuw indelen" knop bovenaan de rondedetail pagina
- Bevestigingsdialog: "Dit overschrijft de huidige concept indeling. Doorgaan?"
- Na bevestiging: nieuwe indeling gegenereerd, pagina direct bijgewerkt
- Gepubliceerde rondes hebben geen "Opnieuw indelen" knop (read-only)

**Tags:** `frontend`, `backend`  
**Dependencies:** F5-04

---
phase: 4
naam: Competitie & team beheer
duur: 2 weken
status: todo
---

# Fase 4 — Competitie & team beheer

## Epic: Competitie configuratie

### F4-01
**Als** planner  
**wil ik** een nieuwe competitie aanmaken met start- en einddatum  
**zodat** de speelrondes automatisch gegenereerd worden

**AC:**
- Formulier: naam, speeldag (dropdown: ma t/m zo), startdatum, einddatum
- Na aanmaken: systeem genereert automatisch alle speelrondes op de gekozen speeldag tussen start en eind datum
- Speelrondes worden aangemaakt met status `concept`
- Weeknummer wordt automatisch berekend (1, 2, 3, ...)
- Maximaal 1 actieve competitie tegelijk per vereniging in MVP

**Tags:** `backend`, `frontend`  
**Dependencies:** F3-06

---

### F4-02
**Als** planner  
**wil ik** feestdagen en inhaaldata kunnen markeren  
**zodat** de planning deze korrect verwerkt

**AC:**
- Kalenderoverzicht van alle speelrondes in de competitie
- Klik op datum → toggle: normaal / feestdag (overgeslagen) / inhaalronde
- Feestdag: speelronde verwijderd of gemarkeerd als "vervalt"
- Inhaalronde: extra speelronde toegevoegd op afwijkende datum
- Wijzigingen zichtbaar in het speelronde overzicht

**Tags:** `frontend`, `backend`  
**Dependencies:** F4-01

---

### F4-03
**Als** planner  
**wil ik** een overzicht van alle speelrondes in de competitie  
**zodat** ik de status per ronde kan volgen

**AC:**
- Tabel: week, datum, status (concept/gepubliceerd), aantal toewijzingen, gepubliceerd op
- Klik op ronde → ga naar detail/planning pagina
- Filter: alle / concept / gepubliceerd
- Gepubliceerde rondes hebben een link-icoon naast de status (kopieer publieke URL)

**Tags:** `frontend`, `backend`  
**Dependencies:** F4-01

---

## Epic: Team beheer

### F4-04
**Als** planner  
**wil ik** teams toevoegen aan een competitie  
**zodat** ze ingepland kunnen worden

**AC:**
- Formulier: teamnaam, captain naam, captain email, speelklasse (vrij tekstveld)
- Team direct zichtbaar in de teamlijst na aanmaken
- Bulk import via CSV: kolommen naam, captain_naam, captain_email, speelklasse
- CSV import toont preview + validatie errors voor bevestiging

**Tags:** `frontend`, `backend`  
**Dependencies:** F4-01

---

### F4-05
**Als** planner  
**wil ik** teams kunnen bewerken en deactiveren  
**zodat** de teamlijst actueel blijft gedurende het seizoen

**AC:**
- Inline bewerken van alle velden
- Deactiveren (soft delete): team blijft in historiedata, verschijnt niet meer in nieuwe indelingen
- Gedeactiveerd team toont "(inactief)" label in lijst
- Team kan heractiveren worden

**Tags:** `frontend`, `backend`  
**Dependencies:** F4-04

---

### F4-06
**Als** planner  
**wil ik** een overzicht van alle teams per competitie zien  
**zodat** ik snel kan zien welke teams zijn geregistreerd

**AC:**
- Tabel: teamnaam, captain, speelklasse, status
- Totaalaantal teams zichtbaar
- Sortering op teamnaam (default)
- Zoeken op naam

**Tags:** `frontend`, `backend`  
**Dependencies:** F4-04

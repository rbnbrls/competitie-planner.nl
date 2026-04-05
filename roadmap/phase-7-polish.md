---
phase: 7
naam: Polish, notificaties & uitbreidingen
duur: 3+ weken
status: todo
---

# Fase 7 — Polish, notificaties & uitbreidingen

> Fase 7 bevat verbeteringen en extra functionaliteit die het platform aantrekkelijker maken
> voor meerdere verenigingen. Geen MVP-vereiste, maar verhogen de productwaarde aanzienlijk.

## Epic: Email notificaties

### F7-01
**Als** team captain  
**wil ik** een email ontvangen zodra de banenindeling gepubliceerd is  
**zodat** ik tijdig weet op welke baan mijn team speelt

**AC:**
- Bij publicatie van een ronde: email verstuurd naar alle captain_email adressen van ingeplande teams
- Email bevat: datum, baannummer, tijdslot, eventuele notitie
- Email template in verenigingskleuren (primaire kleur als header)
- Opt-out mogelijk per captain (uitschrijf link in email)
- Emails via Resend API

**Tags:** `backend`  
**Dependencies:** F6-01

---

### F7-02
**Als** verenigingsadmin  
**wil ik** kunnen instellen of notificaties verstuurd worden  
**zodat** ik controle heb over emailverkeer vanuit de app

**AC:**
- Instelling per competitie: "Email notificaties bij publicatie" toggle
- Default: aan
- Bij uitgeschakeld: geen emails verstuurd, wel interne notificatie in admin UI

**Tags:** `frontend`, `backend`  
**Dependencies:** F7-01

---

## Epic: PDF export

### F7-03
**Als** planner  
**wil ik** de banenindeling exporteren als PDF  
**zodat** ik die kan afdrukken of emailen naar teams die geen internet hebben

**AC:**
- "Download als PDF" knop op gepubliceerde rondedetail pagina
- PDF opmaak identiek aan publieke display (logo, kleuren, tabel)
- Gegenereerd server-side via WeasyPrint
- Bestandsnaam: `banenindeling-[club-slug]-[datum].pdf`

**Tags:** `backend`, `frontend`  
**Dependencies:** F6-04

---

## Epic: KNLTB integratie

### F7-04
**Als** planner  
**wil ik** teamgegevens importeren via een KNLTB CSV export  
**zodat** ik niet alles handmatig hoef in te voeren

**AC:**
- CSV upload op team beheer pagina
- Kolom mapping UI: gebruiker koppelt CSV-kolommen aan veldnamen (naam, captain, email, klasse)
- Duplicaten detectie op teamnaam: toon preview met "nieuw / bestaand / conflict"
- Alleen nieuwe teams worden aangemaakt, bestaande niet overschreven tenzij aangevinkt

**Tags:** `frontend`, `backend`  
**Dependencies:** F4-04

---

## Epic: Onboarding wizard

### F7-05
**Als** nieuwe verenigingsadmin  
**wil ik** een stap-voor-stap onboarding doorlopen na mijn eerste login  
**zodat** ik zonder technische kennis snel kan starten

**AC:**
- Wizard getoond bij eerste login (één keer per account)
- Stappen: 1) Verenigingsgegevens 2) Branding 3) Banen instellen 4) Competitie aanmaken 5) Teams toevoegen
- Voortgangsindicator zichtbaar
- Wizard kan overgeslagen worden ("Later instellen")
- Na wizard: redirect naar dashboard met confetti of welkomstbericht

**Tags:** `frontend`, `backend`  
**Dependencies:** F3-04, F3-05, F3-06

---

## Epic: Multi-competitie ondersteuning

### F7-06
**Als** planner  
**wil ik** meerdere gelijktijdige competities kunnen beheren  
**zodat** ik zowel een herencompetitie als een damescompetitie kan plannen

**AC:**
- Geen "maximaal 1 actieve competitie" beperking meer
- Competitieselectie in de navigatie (dropdown)
- Banen kunnen per competitie anders ingesteld worden (of gedeeld)
- Publieke display toont eventueel beide indelingen op dezelfde dag

**Tags:** `backend`, `frontend`  
**Dependencies:** F4-01

---

## Epic: Statistieken & rapportages

### F7-07
**Als** verenigingsadmin  
**wil ik** statistieken zien over het seizoen  
**zodat** ik de eerlijkheid van de rotatie kan aantonen aan leden

**AC:**
- Heatmap: teams × banen, kleur = frequentie (verbetering van F5-03)
- Grafiek: cumulatieve baanscores per team over het seizoen
- Export naar CSV: alle toewijzingen van het seizoen

**Tags:** `frontend`, `backend`  
**Dependencies:** F5-03

---

## Epic: Platform facturering (future)

### F7-08
**Als** platformbeheerder  
**wil ik** een overzicht van betalende verenigingen  
**zodat** ik de SaaS inkomsten kan monitoren

**AC:**
- Notitieveld per tenant voor factureringsinfo (handmatig in MVP, geen Stripe integratie)
- Overzicht: trial expiratiedatums, actieve betalers, gesuspendeerde accounts
- Export CSV voor externe facturering

**Tags:** `frontend`, `backend`  
**Dependencies:** F2-05

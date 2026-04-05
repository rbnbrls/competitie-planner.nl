---
phase: 2
naam: Superadmin platform panel
duur: 2 weken
status: todo
---

# Fase 2 — Superadmin platform panel

> De superadmin (Ruben) beheert het gehele platform via `admin.competitie-planner.nl`.
> Dit is volledig gescheiden van de tenant portals.

## Epic: Superadmin auth

### F2-01
**Als** platformbeheerder (Ruben)  
**wil ik** kunnen inloggen op `admin.competitie-planner.nl` met mijn eigen credentials  
**zodat** ik toegang krijg tot het superadmin panel

**AC:**
- Login pagina op `admin.competitie-planner.nl/login`
- POST `/auth/login` met email + wachtwoord geeft JWT terug
- JWT payload bevat `is_superadmin: true` en `club_id: null`
- Bij verkeerde credentials: duidelijke foutmelding (geen info over of email bestaat)
- Na login redirect naar `/dashboard`
- Logout wist tokens en redirect naar login

**Tags:** `auth`, `backend`, `frontend`  
**Dependencies:** F1-06

---

### F2-02
**Als** developer  
**wil ik** een CLI commando om de initiële superadmin aan te maken  
**zodat** de platformbeheerder zonder UI kan bootstrappen

**AC:**
- `docker exec backend python -m app.cli create-superadmin --email X --password Y` werkt
- Script controleert of al een superadmin bestaat en weigert duplicaat
- Wachtwoord wordt gehashed met bcrypt (cost factor 12)
- Bevestiging geprint naar stdout na succes

**Tags:** `backend`  
**Dependencies:** F1-06

---

## Epic: Tenant beheer

### F2-03
**Als** platformbeheerder  
**wil ik** een overzicht van alle geregistreerde verenigingen  
**zodat** ik de status van het platform kan monitoren

**AC:**
- Tabel toont: verenigingsnaam, slug, status, aanmaakdatum, aantal gebruikers
- Filter op status (trial / active / suspended / inactive)
- Zoeken op naam of slug
- Sortering op aanmaakdatum (nieuwste eerst default)
- Paginering (25 per pagina)

**Tags:** `frontend`, `backend`  
**Dependencies:** F2-01

---

### F2-04
**Als** platformbeheerder  
**wil ik** een nieuwe vereniging (tenant) aanmaken  
**zodat** zij toegang krijgen tot het platform

**AC:**
- Formulier: verenigingsnaam, slug (auto-gegenereerd + aanpasbaar), contactpersoon naam, contactpersoon email
- Slug validatie: lowercase, geen spaties, uniek, niet gereserveerd (zie architectuur doc)
- Na aanmaken: Club record aangemaakt met status `trial`, trial_ends_at = nu + 14 dagen
- Automatisch invite email verstuurd naar contactpersoon email (via Resend)
- Invite email bevat link: `[slug].competitie-planner.nl/invite/[token]`

**Tags:** `frontend`, `backend`  
**Dependencies:** F2-03

---

### F2-05
**Als** platformbeheerder  
**wil ik** de status van een vereniging kunnen wijzigen  
**zodat** ik trial om kan zetten naar actief, of een vereniging kan suspenderen

**AC:**
- Detail pagina per vereniging met status dropdown: trial → active → suspended → inactive
- Statuswijziging direct opgeslagen
- Bij suspenderen: bevestigingsdialog met waarschuwing ("gebruikers krijgen toegang geweigerd")
- Status change gelogged in audit log (simple: `status_changes` tabel met timestamp + door wie)

**Tags:** `frontend`, `backend`  
**Dependencies:** F2-04

---

## Epic: Platform gebruikersbeheer

### F2-06
**Als** platformbeheerder  
**wil ik** een overzicht van alle gebruikers platform-breed  
**zodat** ik inzicht heb in wie toegang heeft

**AC:**
- Tabel: naam, email, rol, vereniging, laatste login, status (actief/inactief)
- Filter op vereniging, rol
- Zoeken op naam of email
- Gebruiker kan gedeactiveerd worden (is_active = False → kan niet meer inloggen)

**Tags:** `frontend`, `backend`  
**Dependencies:** F2-03

---

### F2-07
**Als** platformbeheerder  
**wil ik** een platformoverzicht dashboard zien bij inloggen  
**zodat** ik snel de gezondheid van het platform zie

**AC:**
- Metrics: totaal verenigingen, actieve verenigingen, trials, gesuspendeerd
- Metrics: totaal gebruikers, ingelogd afgelopen 7 dagen
- Lijst van recentste 5 aangemaakte verenigingen
- Lijst van recentste 5 logins (naam, vereniging, tijdstip)

**Tags:** `frontend`, `backend`  
**Dependencies:** F2-03

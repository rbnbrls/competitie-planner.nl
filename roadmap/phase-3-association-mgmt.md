---
phase: 3
naam: Verenigingsbeheer & branding
duur: 2 weken
status: done
---

# Fase 3 — Verenigingsbeheer, auth & branding

> Vereniging admins en planners loggen in op `[slug].competitie-planner.nl`.
> Ze kunnen de vereniging configureren, gebruikers beheren, en branding instellen.

## Epic: Tenant auth flow

### F3-01
**Als** verenigingsgebruiker  
**wil ik** kunnen inloggen op `[slug].competitie-planner.nl`  
**zodat** ik toegang krijg tot het admin portal van mijn vereniging

**AC:**
- Login pagina toont verenigingsnaam + logo (opgehaald via slug uit URL)
- POST `/auth/login` met email + wachtwoord; backend bepaalt tenant via `X-Tenant-Slug` header
- JWT bevat `club_id`, `club_slug`, `role`
- Bij schorsing (status=suspended): foutmelding "Uw verenigingsaccount is niet actief. Neem contact op met de platformbeheerder."
- Refresh token als HttpOnly cookie (30 dagen)

**Tags:** `auth`, `backend`, `frontend`  
**Dependencies:** F2-04

---

### F3-02
**Als** nieuwe gebruiker  
**wil ik** via een invite link mijn account activeren  
**zodat** ik kan inloggen zonder dat ik een account hoef aan te vragen

**AC:**
- GET `[slug].competitie-planner.nl/invite/[token]` toont "Stel wachtwoord in" formulier
- Token validatie: bestaat, niet gebruikt, niet verlopen (48u)
- Wachtwoord vereisten: minimaal 8 tekens, minimaal 1 cijfer
- Na activatie: User aangemaakt, token als gebruikt gemarkeerd, redirect naar login
- Verlopen token toont vriendelijke foutmelding met optie om nieuwe invite aan te vragen

**Tags:** `auth`, `backend`, `frontend`  
**Dependencies:** F3-01

---

### F3-03
**Als** gebruiker  
**wil ik** mijn wachtwoord kunnen resetten via email  
**zodat** ik niet buitengesloten raak als ik het vergeet

**AC:**
- "Wachtwoord vergeten" link op login pagina
- POST `/auth/forgot-password` stuurt reset email (expires 1 uur) via Resend
- Reset link: `[slug].competitie-planner.nl/reset-password/[token]`
- Na reset: alle bestaande sessies ongeldig (refresh tokens gewist)

**Tags:** `auth`, `backend`, `frontend`  
**Dependencies:** F3-01

---

## Epic: Verenigingsinstellingen

### F3-04
**Als** verenigingsadmin  
**wil ik** de basisgegevens van mijn vereniging kunnen beheren  
**zodat** deze correct weergegeven worden in de app en op de display

**AC:**
- Formulier: naam, adres, postcode, stad, telefoon, website
- Wijzigingen direct opgeslagen (geen aparte save knop nodig voor UX, maar wel expliciete submit)
- Naam zichtbaar in header van alle pagina's
- Slug is read-only (niet wijzigbaar na aanmaak)

**Tags:** `frontend`, `backend`  
**Dependencies:** F3-01

---

### F3-05
**Als** verenigingsadmin  
**wil ik** de huisstijl (kleuren en logo) van mijn vereniging instellen  
**zodat** het admin portal en de publieke display in onze kleuren verschijnen

**AC:**
- Kleurenkiezer voor: primaire kleur, secundaire kleur, accentkleur
- Live preview van kleurencombinatie (sidebar, knop, badge in de juiste kleuren)
- Logo upload: PNG of SVG, max 2MB, opgeslagen in `/uploads/[club_id]/logo.[ext]`
- Na opslaan: kleuren direct zichtbaar in de UI zonder herladen (CSS variabelen update)
- Publieke display gebruikt dezelfde kleuren (zie fase 6)

**Tags:** `frontend`, `backend`  
**Dependencies:** F3-04

---

## Epic: Baanbeheer

### F3-06
**Als** verenigingsadmin  
**wil ik** de banen van mijn vereniging beheren  
**zodat** het planningsalgoritme de juiste baaneigenschappen kent

**AC:**
- Lijst van banen met: nummer, naam (optioneel), verlichting, overdekt, prioriteit, status
- Toevoegen: nummer (auto-increment), naam, verlichting_type (dropdown: geen/TL/LED/halogeen), overdekt toggle, prioriteit_score (1-10 slider)
- Bewerken inline of via modal
- Deactiveren (soft delete): baan blijft in historie, verschijnt niet meer in planning
- Volgorde in lijst = baannummer volgorde

**Tags:** `frontend`, `backend`  
**Dependencies:** F3-04

---

## Epic: Gebruikersbeheer (per vereniging)

### F3-07
**Als** verenigingsadmin  
**wil ik** gebruikers van mijn vereniging kunnen beheren  
**zodat** ik kan bepalen wie toegang heeft tot de planning tool

**AC:**
- Lijst: naam, email, rol, laatste login, status
- Gebruiker uitnodigen: email + rol (vereinging_admin of planner) → invite email via Resend
- Rol wijzigen van bestaande gebruiker
- Gebruiker deactiveren (is_active = False)
- Maximaal aantal gebruikers per tenant: niet beperkt in MVP
- Admin kan zichzelf niet deactiveren of zijn eigen rol verlagen

**Tags:** `frontend`, `backend`  
**Dependencies:** F3-02

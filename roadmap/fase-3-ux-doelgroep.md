# Fase 3: UX voor de doelgroep (50+ vrijwilligers)

De primaire gebruikers zijn vrijwilligers bij tennisverenigingen in de leeftijdscategorie 50+. De UX moet hier volledig op afgestemd zijn: groot, duidelijk, begeleidend, en foutbestendig.

---

## 3.1 Dashboard verbeteren
**Prioriteit: HOOG** | **Geschatte omvang: Middel**

Het tenant dashboard (`Dashboard.tsx`) toont alleen naam, status en rol. Geen overzicht van aankomende speeldagen, openstaande acties, of competitiestatus.

**Taken:**
- [ ] Backend: dashboard-endpoint met samengevatte data (komende rondes, openstaande acties)
- [ ] Komende speelrondes tonen met status (concept/gepubliceerd)
- [ ] Aantal teams zonder baantoewijzing per ronde
- [ ] Quick-actions: "Genereer volgende ronde", "Publiceer concept"
- [ ] Overzicht van alle competities met voortgang (X van Y rondes gepubliceerd)
- [ ] Waarschuwingen: feestdag volgende week, onvolledige teams, verlopen trial

**Bestanden:**
- `frontend/src/pages/tenant/Dashboard.tsx`
- Nieuw: `backend/app/routers/tenant_dashboard.py`
- `frontend/src/lib/api.ts`

---

## 3.2 Onboarding-wizard
**Prioriteit: HOOG** | **Geschatte omvang: Groot**

Nieuwe gebruikers moeten zelf uitvinden hoe ze banen toevoegen, competities aanmaken, teams importeren, etc. Er is geen begeleiding.

**Taken:**
- [ ] Stapsgewijze onboarding flow na eerste login:
  - Stap 1: Club-informatie controleren/aanvullen
  - Stap 2: Banen toevoegen (met uitleg wat prioriteit_score betekent)
  - Stap 3: Eerste competitie aanmaken (met uitleg speeldag, datums)
  - Stap 4: Teams importeren of handmatig toevoegen
- [ ] Contextual help/tooltips bij complexe velden
- [ ] Checklist op dashboard wat nog moet gebeuren
- [ ] "Opnieuw doorlopen" optie in instellingen
- [ ] Markeer `onboarding_completed` in User model na voltooiing

**Bestanden:**
- Nieuw: `frontend/src/pages/tenant/Onboarding.tsx`
- `frontend/src/pages/tenant/Dashboard.tsx`
- `frontend/src/App.tsx` (routing)
- `backend/app/routers/tenant.py` (onboarding status)

---

## 3.3 Bulkacties
**Prioriteit: MIDDEL** | **Geschatte omvang: Middel**

Elke ronde moet apart worden gegenereerd en gepubliceerd. Bij 7 speeldagen x 3 competities = 21 keer handmatig klikken.

**Taken:**
- [ ] "Genereer alle rondes" knop per competitie
- [ ] "Publiceer alle concept-rondes" met bevestigingsdialoog
- [ ] Backend endpoints voor bulk-operaties
- [ ] Bulk activeren/deactiveren van teams
- [ ] "Kopieer competitie van vorig seizoen" functie (naam, banen, teams overnemen)
- [ ] Voortgangsindicator bij bulk-operaties

**Bestanden:**
- `backend/app/routers/planning.py`
- `backend/app/routers/competities.py`
- `frontend/src/pages/tenant/Speelrondes.tsx`
- `frontend/src/pages/tenant/Teams.tsx`

---

## 3.4 Mobiele bruikbaarheid
**Prioriteit: MIDDEL** | **Geschatte omvang: Middel**

Veel werk wordt op een telefoon of tablet gedaan (bijv. op de club zelf).

**Taken:**
- [ ] Responsive design audit van alle pagina's
- [ ] Tabel-layouts vervangen door card-layouts op kleine schermen
- [ ] Touch-friendly drag-and-drop (grotere touch targets, TouchSensor toevoegen aan dnd-kit)
- [ ] Grotere knoppen en invoervelden (min 44px touch targets)
- [ ] Bottom navigation op mobiel i.p.v. sidebar
- [ ] Test op iPhone Safari en Android Chrome

**Bestanden:**
- `frontend/src/pages/tenant/Layout.tsx`
- `frontend/src/pages/tenant/RondeDetail.tsx`
- `frontend/src/pages/tenant/Teams.tsx`
- `frontend/src/pages/tenant/Banen.tsx`
- `frontend/tailwind.config.js`

---

## 3.5 Betere foutmeldingen
**Prioriteit: MIDDEL** | **Geschatte omvang: Middel**

Foutmeldingen zijn generiek ("Fout bij genereren"). Geen detail over wat er mis ging.

**Taken:**
- [ ] Backend: consistente error response format met Nederlandse foutmeldingen
- [ ] Frontend: toast-notificatiesysteem (bijv. react-hot-toast) i.p.v. inline berichten
- [ ] Toast auto-dismiss na 5 seconden, maar persistent bij fouten
- [ ] Validatiefouten per veld tonen (niet alleen na submit)
- [ ] Specifieke foutmeldingen: "Geen banen beschikbaar", "Team is al ingepland", etc.

**Bestanden:**
- `backend/app/routers/*.py` (alle routers - error responses)
- Nieuw: `frontend/src/components/Toast.tsx`
- `frontend/src/pages/tenant/RondeDetail.tsx`
- `frontend/src/pages/tenant/Competities.tsx`
- `frontend/src/pages/tenant/Teams.tsx`

# Fase 3: UX voor de doelgroep (50+ vrijwilligers)

De primaire gebruikers zijn vrijwilligers bij tennisverenigingen in de leeftijdscategorie 50+. De UX moet hier volledig op afgestemd zijn: groot, duidelijk, begeleidend, en foutbestendig.

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

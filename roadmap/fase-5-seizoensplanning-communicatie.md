# Fase 5: Seizoensplanning & Communicatie

Overzicht over het hele seizoen, slim planningsalgoritme, en betere communicatie met teamcaptains.

---

## 5.2 Slim planningsalgoritme
**Prioriteit: HOOG** | **Geschatte omvang: Groot**

Het huidige algoritme is een simpel greedy-algoritme dat teams toewijst aan banen op basis van historische scores. Het houdt geen rekening met constraints.

**Taken:**
- [ ] Batch-generatie: genereer schema voor alle rondes van een competitie tegelijk
- [ ] Constraint-based planning:
  - Max aantal thuisteams per dag respecteren
  - Beschikbare banen per tijdslot
  - Teams niet twee keer op dezelfde baan achter elkaar
- [ ] Eerlijke verdeling van "goede" banen (hoge prioriteit_score) over het seizoen
- [ ] Preview: toon voorgestelde verdeling over alle rondes voordat het wordt opgeslagen
- [ ] "Herbereken" functie die bestaande toewijzingen kan heroverwegen
- [ ] Unit tests voor elk constraint

**Bestanden:**
- `backend/app/services/planning.py` (volledig herschrijven)
- `backend/app/routers/planning.py`
- `backend/tests/test_planning.py`

---

## 5.3 Communicatie met teamcaptains
**Prioriteit: HOOG** | **Geschatte omvang: Groot**

E-mailnotificaties bestaan maar zijn beperkt tot publicatie.

**Taken:**
- [ ] Herinneringsmail X dagen voor wedstrijddag (instelbaar per competitie)
- [ ] Captains-portaal: eigen pagina waar captain kan zien wat de planning is (via public token)
- [ ] Captains kunnen beschikbaarheid doorgeven per ronde (formulier via link in email)
- [ ] Captains kunnen uitslag invoeren na wedstrijd
- [ ] WhatsApp-link genereren met voorgeformateerd bericht (geen API nodig, gewoon `wa.me` link)
- [ ] Samenvatting-email naar TC na elke speeldag

**Bestanden:**
- `backend/app/services/email.py`
- `backend/app/routers/display.py` (uitbreiden met captain-functies)
- Nieuw: `frontend/src/pages/CaptainPortaal.tsx`
- `backend/app/models/__init__.py` (beschikbaarheid model)

---

## 5.4 Herbruikbare UI componenten
**Prioriteit: MIDDEL** | **Geschatte omvang: Groot**

De `frontend/src/components/` directory is leeg. Alle UI is inline in pagina-componenten.

**Taken:**
- [ ] Extracteer herbruikbare componenten uit bestaande pagina's:
  - `Button` (primary, secondary, danger, disabled states)
  - `Input` en `Select` met label en error state
  - `Modal` (bevestigingsdialogen)
  - `Table` (sorteerbaar, met paginering)
  - `Card` (dashboard kaartjes)
  - `Badge` (status indicators)
  - `LoadingSkeleton`
- [ ] Consistente styling via component props
- [ ] Formulier-componenten met ingebouwde validatie

**Bestanden:**
- Nieuw: `frontend/src/components/Button.tsx`
- Nieuw: `frontend/src/components/Input.tsx`
- Nieuw: `frontend/src/components/Modal.tsx`
- Nieuw: `frontend/src/components/Table.tsx`
- Alle pagina's in `frontend/src/pages/tenant/` (refactor)

---

## 5.5 Afdrukbaar baanoverzicht
**Prioriteit: MIDDEL** | **Geschatte omvang: Middel**

Veel clubs hangen een geprint overzicht in het clubhuis.

**Taken:**
- [ ] Print-optimized CSS layout per speeldag
- [ ] A4 formaat, grote letters (min 14pt voor leesbaarheid doelgroep)
- [ ] Club-logo prominent bovenaan
- [ ] QR-code naar digitale versie (public display URL)
- [ ] "Print" knop op ronde-detail pagina
- [ ] PDF-export als alternatief voor direct printen

**Bestanden:**
- `frontend/src/pages/tenant/RondeDetail.tsx` (print knop)
- Nieuw: `frontend/src/pages/tenant/PrintView.tsx`
- `backend/app/services/pdf.py`

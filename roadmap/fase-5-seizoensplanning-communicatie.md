# Fase 5: Seizoensplanning & Communicatie

Overzicht over het hele seizoen, slim planningsalgoritme, en betere communicatie met teamcaptains.


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

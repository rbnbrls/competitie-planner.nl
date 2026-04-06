# Fase 5: Seizoensplanning & Communicatie

Overzicht over het hele seizoen, slim planningsalgoritme, en betere communicatie met teamcaptains.


---



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

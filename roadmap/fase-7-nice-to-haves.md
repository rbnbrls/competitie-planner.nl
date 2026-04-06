# Fase 7: Nice-to-haves

Uitbreidingen die de applicatie completer maken maar niet essentieel zijn voor de kernfunctionaliteit.

---

## 7.1 KNLTB-koppeling
**Prioriteit: MIDDEL** | **Geschatte omvang: Groot**

Veel handmatige invoer kan worden voorkomen door koppeling met KNLTB-systemen.

**Taken:**
- [ ] Onderzoek of MijnKNLTB een API aanbiedt (of scraping nodig is)
- [ ] Import van poule-indeling (teams + tegenstanders + speelschema)
- [ ] Uitslagen terugrapporteren naar KNLTB
- [ ] Team- en spelersinformatie synchroniseren
- [ ] Fallback: CSV-import als API niet beschikbaar is

**Bestanden:**
- Nieuw: `backend/app/services/knltb.py`
- Nieuw: `backend/app/routers/knltb.py`
- `frontend/src/pages/tenant/Competities.tsx`

---

## 7.2 Weersvoorspelling integratie
**Prioriteit: LAAG** | **Geschatte omvang: Middel**

Bij buitenbanen is weer cruciaal. Regenachtig weer kan leiden tot afgelasting.

**Taken:**
- [ ] Integratie met open weer-API (bijv. Open-Meteo, gratis)
- [ ] Weersverwachting tonen bij komende speeldagen op dashboard
- [ ] Waarschuwings-icoon bij verwachte regen
- [ ] Snelle "afgelast"-knop die:
  - Ronde status naar "afgelast" zet
  - Email naar alle captains van thuiswedstrijden stuurt
  - Optioneel naar inhaalronde verplaatst
- [ ] Club-instelling: `heeft_buitenbanen` (alleen tonen als relevant)

**Bestanden:**
- Nieuw: `backend/app/services/weather.py`
- `frontend/src/pages/tenant/Dashboard.tsx`
- `frontend/src/pages/tenant/Speelrondes.tsx`

---

## 7.3 Invallers-beheer
**Prioriteit: LAAG** | **Geschatte omvang: Groot**

Volgens KNLTB-regels mogen spelers invallen in andere teams, maar niet meer dan eenmaal in een hoger geklasseerd team.

**Taken:**
- [ ] Speler-model: `id`, `naam`, `knltb_nummer`, `speelsterkte`, `team_id`
- [ ] Registratie van invallers per wedstrijd
- [ ] Waarschuwing bij ongeldige invallers (al gespeeld in hoger team)
- [ ] Invallerslijst per club
- [ ] Beschikbaarheid doorgeven per speler

**Bestanden:**
- `backend/app/models/__init__.py` (Speler model)
- Nieuw: `backend/app/routers/spelers.py`
- Nieuw: `frontend/src/pages/tenant/Spelers.tsx`

---

## 7.4 Undo/History
**Prioriteit: LAAG** | **Geschatte omvang: Middel**

Als een gebruiker per ongeluk een indeling overschrijft, is er geen weg terug.

**Taken:**
- [ ] Bewaar vorige concept-indeling bij "Genereer indeling" (snapshot)
- [ ] "Herstel vorige versie" knop
- [ ] Versiegeschiedenis per ronde (max 5 versies)
- [ ] Audit log: wie heeft wat wanneer gewijzigd

**Bestanden:**
- `backend/app/models/__init__.py` (ToewijzingSnapshot model)
- `backend/app/services/planning.py`
- `backend/app/routers/planning.py`
- `frontend/src/pages/tenant/RondeDetail.tsx`

---

## 7.5 Wedstrijdformat en competitie-types
**Prioriteit: LAAG** | **Geschatte omvang: Middel**

KNLTB-competities hebben vaste formats die nu niet in het systeem vastliggen.

**Taken:**
- [ ] Competitie model uitbreiden:
  - `competitie_type`: voorjaar / najaar / zomer / intern
  - `poule_grootte`: standaard 8 (6 voor najaar)
  - `aantal_speeldagen`: standaard 7 (5 voor vrijdagavond)
  - `speelvorm`: dubbel / enkel / gemengd
  - `leeftijdscategorie`: open / 35+ / 50+
- [ ] Validatie: aantal rondes moet kloppen met poule_grootte - 1
- [ ] Template-competities: "KNLTB Voorjaar Vrijdagavond" met vooringevulde waarden

**Bestanden:**
- `backend/app/models/__init__.py` (Competitie model)
- `backend/app/routers/competities.py`
- `frontend/src/pages/tenant/Competities.tsx`

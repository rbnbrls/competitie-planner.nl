# Architectuur — Publieke Display & Narrowcasting

## Doel

De publieke display pagina toont de banenindeling voor een specifieke speelronde op een groot scherm via narrowcasting. De pagina:

- Vereist **geen login**
- Is **iframe-compatible** (geen X-Frame-Options restrictie voor het display subdomain)
- **Ververst automatisch** elke 60 seconden
- Toont **verenigingskleuren en logo** van de tenant
- Werkt op de **bestaande Raspberry Pi kiosk** via iframe

## URL structuur

```
Actuele ronde (auto-detect op datum):
  display.competitie-planner.nl/[slug]

Specifieke ronde via token:
  display.competitie-planner.nl/[slug]/[public_token]

Embed als iframe (bijv. in narrowcasting HTML):
  <iframe src="https://display.competitie-planner.nl/tc-rijnvliet"
          width="1920" height="1080"
          frameborder="0">
  </iframe>
```

## Backend endpoints (geen auth)

```
GET /display/[slug]
  → Geeft de eerstvolgende gepubliceerde speelronde terug
  → Logica: ronde met datum >= vandaag, status = gepubliceerd, gesorteerd op datum ASC
  → Response: ronde + toewijzingen + club branding

GET /display/[slug]/[public_token]
  → Geeft een specifieke speelronde terug via het public_token
  → Bruikbaar voor directe links naar historische rondes

Response schema:
{
  "club": {
    "naam": "TC Rijnvliet",
    "logo_url": "https://...",
    "primary_color": "#1B5E20",
    "secondary_color": "#FFFFFF",
    "accent_color": "#FFC107"
  },
  "ronde": {
    "datum": "2025-09-14",
    "week_nummer": 5,
    "gepubliceerd_op": "2025-09-10T14:32:00Z"
  },
  "toewijzingen": [
    {
      "baan_nummer": 1,
      "baan_overdekt": false,
      "baan_verlichting": "LED",
      "team_naam": "TC Rijnvliet 1",
      "tijdslot_start": "10:00",
      "tijdslot_eind": "12:00",
      "notitie": null
    }
  ]
}
```

## HTTP headers (display subdomain)

De backend stuurt deze headers voor display.competitie-planner.nl:

```python
# Geen X-Frame-Options → iframe embedding toegestaan
# Content-Security-Policy: frame-ancestors '*'
# Cache-Control: no-cache (altijd vers laden)
# CORS: open voor display endpoints

@router.get("/display/{slug}")
async def get_display(slug: str, response: Response):
    response.headers["X-Frame-Options"] = ""          # leeg = geen restrictie
    response.headers["Content-Security-Policy"] = "frame-ancestors *"
    response.headers["Cache-Control"] = "no-cache, no-store"
    # ... rest van logica
```

## Frontend display pagina

De display pagina is een afzonderlijke React route met eigen layout (geen sidebar, geen nav):

```
display.competitie-planner.nl/[slug]
  ↓
DisplayPage component
  ↓
useQuery({ queryKey: ['display', slug], refetchInterval: 60_000 })
  ↓
Render: DisplayLayout (groot, leesbaar op TV-scherm)
```

### Display layout ontwerp

```
┌─────────────────────────────────────────────────────────┐
│  [LOGO]  TC Rijnvliet          Banenindeling zondag 14 sept │
│          Seizoen 2025/2026 · Week 5                     │
├──────────┬──────────────────────┬───────────┬───────────┤
│  BAAN 1  │  TC Rijnvliet 1     │  10:00    │  12:00    │
│  Overdekt│                     │           │           │
├──────────┼──────────────────────┼───────────┼───────────┤
│  BAAN 2  │  TC Rijnvliet 3     │  10:00    │  12:00    │
│          │                     │           │           │
├──────────┼──────────────────────┼───────────┼───────────┤
│  BAAN 3  │  TC Rijnvliet 5     │  10:00    │  12:00    │
│          │                     │           │           │
└──────────┴──────────────────────┴───────────┴───────────┘
│  Bijgewerkt: 14 sept 14:32  ·  Ververst over: 58 sec   │
└─────────────────────────────────────────────────────────┘
```

Kenmerken:
- Font-size minimaal 28px voor baan/team namen (leesbaar op afstand)
- Countdown timer in footer toont wanneer pagina ververst
- Als er geen gepubliceerde ronde is: vriendelijke melding in verenigingskleuren
- Primaire kleur = achtergrond header; secundaire kleur = tekst header

## Integratie met Raspberry Pi kiosk

In de bestaande narrowcasting HTML voor de tennis vereniging:

```html
<!-- Voeg dit toe naast het speelschema iframe of weerscherm -->
<iframe
  src="https://display.competitie-planner.nl/tc-rijnvliet"
  width="100%"
  height="100%"
  frameborder="0"
  scrolling="no"
  allowfullscreen>
</iframe>
```

Of als fullscreen display op een apart scherm:
- Open Chromium in kiosk mode: `chromium-browser --kiosk https://display.competitie-planner.nl/tc-rijnvliet`
- De pagina ververst zichzelf elke 60 seconden — geen cron of refresh script nodig

## "Geen ronde" states

| Situatie | Wat de display toont |
|----------|---------------------|
| Nog geen competitie aangemaakt | "Competitie seizoen wordt binnenkort geconfigureerd" |
| Competitie bestaat maar ronde niet gepubliceerd | "De banenindeling voor komende week is nog niet beschikbaar" |
| Seizoen afgelopen (alle rondes voorbij) | "Competitieseizoen is afgerond. Tot het volgende seizoen!" |
| Tenant gesuspendeerd | Lege pagina (geen foutmelding met clubnaam) |

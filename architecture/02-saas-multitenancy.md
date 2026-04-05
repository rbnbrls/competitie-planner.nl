# Architectuur — SaaS Multi-tenancy & Subdomain model

## Tenant model

Elke tennisvereniging is een **tenant**. Tenants delen dezelfde database en backend, maar zijn volledig geïsoleerd via `club_id` in elke query. Er is geen schema-per-tenant (te complex) — in plaats daarvan zorgt de backend middleware ervoor dat elke query automatisch gefilterd wordt op de tenant van de ingelogde gebruiker.

```
Platform (Ruben)
├── Tenant: TC Rijnvliet  → rijnvliet.competitie-planner.nl
├── Tenant: LTV Utrecht   → ltv-utrecht.competitie-planner.nl
└── Tenant: SV Overvecht  → sv-overvecht.competitie-planner.nl
```

## Subdomain registratie flow

```
1. Ruben maakt tenant aan in superadmin panel
   → invoer: verenigingsnaam, slug, contactpersoon email
   → systeem: Club record aangemaakt, invite email verzonden

2. Contactpersoon ontvangt invite email
   → klikt op link → stelt wachtwoord in → is nu "Vereniging Admin"

3. Vereniging Admin logt in op [slug].competitie-planner.nl
   → ziet onboarding wizard (naam, logo, kleuren, banen)

4. Subdomain werkt direct via Traefik wildcard routing
   → geen DNS wijziging nodig per vereniging
```

## Tenant isolatie in de backend

```python
# backend/app/middleware/tenant.py

async def get_current_tenant(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> Club:
    payload = decode_jwt(token)
    club_id = payload.get("club_id")

    if not club_id:
        # Superadmin — geen tenant context
        return None

    club = await db.get(Club, club_id)
    if not club or club.suspended:
        raise HTTPException(403, "Tenant niet actief")
    return club

# Alle tenant-scoped endpoints:
@router.get("/teams")
async def list_teams(
    club: Club = Depends(get_current_tenant),
    db: AsyncSession = Depends(get_db)
):
    # club_id filter automatisch toegepast
    result = await db.execute(
        select(Team).where(Team.club_id == club.id)
    )
    return result.scalars().all()
```

## Branding & theming per tenant

Elke vereniging kan eigen kleuren en logo instellen. Deze worden opgeslagen in de `Club` tabel en via de API teruggegeven bij het laden van de app.

### Database velden (Club tabel)

```sql
primary_color     VARCHAR(7)   -- hex kleur, bijv. #1B5E20
secondary_color   VARCHAR(7)   -- hex kleur, bijv. #FFFFFF
accent_color      VARCHAR(7)   -- hex kleur, bijv. #FFC107
logo_url          TEXT         -- opgeslagen in /uploads/ of CDN
font_choice       VARCHAR(50)  -- optioneel: keuze uit 3-4 fonts
```

### Frontend theming

Bij het laden van de app haalt de frontend de tenant-config op en injecteert CSS variabelen:

```typescript
// src/hooks/useTenantTheme.ts
const { data: club } = useQuery({
  queryKey: ['club-config'],
  queryFn: () => api.get('/api/v1/clubs/config')
});

useEffect(() => {
  if (!club) return;
  const root = document.documentElement;
  root.style.setProperty('--color-primary', club.primary_color);
  root.style.setProperty('--color-secondary', club.secondary_color);
  root.style.setProperty('--color-accent', club.accent_color);
}, [club]);
```

```css
/* src/styles/tenant.css */
:root {
  --color-primary: #1B5E20;    /* default groen (tennis) */
  --color-secondary: #FFFFFF;
  --color-accent: #FFC107;
}

.btn-primary {
  background-color: var(--color-primary);
  color: var(--color-secondary);
}

.sidebar {
  background-color: var(--color-primary);
}
```

### Kleur picker in instellingen

De branding pagina toont een live preview van de gekozen kleuren:
- Primaire kleur (sidebar, knoppen, headers)
- Secundaire kleur (tekst op primaire achtergrond)
- Accentkleur (highlights, actieve items, badges)
- Logo upload (PNG/SVG, max 2MB)

## Tenant statussen

| Status | Betekenis | Admin portal | Display |
|--------|-----------|--------------|---------|
| `active` | Normaal | Toegankelijk | Toegankelijk |
| `trial` | Proefperiode (14 dagen) | Toegankelijk | Toegankelijk |
| `suspended` | Betaling gestopt | Geblokkeerd (melding) | Geblokkeerd |
| `inactive` | Opgezegd | Geblokkeerd | Geblokkeerd |

## Slug regels

- Alleen lowercase letters, cijfers en koppeltekens
- Minimaal 3, maximaal 30 tekens
- Uniek in de gehele database
- Niet wijzigbaar na aanmaak (DNS-implicaties)
- Gereserveerde slugs: `admin`, `api`, `display`, `www`, `mail`, `app`, `static`

# Architectuur — Authenticatie & Rollenmodel

## Rolhiërarchie

```
SUPERADMIN (Ruben)
│  → beheert het hele platform
│  → kan alle tenants inzien en beheren
│  → logt in op admin.competitie-planner.nl
│
└── TENANT: TC Rijnvliet
      │
      ├── VERENIGING_ADMIN (1 of meer per tenant)
      │     → beheert de eigen vereniging
      │     → kan planners aanmaken/verwijderen
      │     → beheert banen, competities, branding
      │
      └── PLANNER (vrijwilliger)
            → maakt en publiceert banenindelingen
            → kan competities en teams inzien
            → kan geen gebruikers of instellingen wijzigen
```

## JWT payload structuur

```json
{
  "sub": "user-uuid-hier",
  "email": "vrijwilliger@tcrijnvliet.nl",
  "role": "planner",
  "club_id": "club-uuid-hier",
  "club_slug": "tc-rijnvliet",
  "is_superadmin": false,
  "exp": 1234567890,
  "iat": 1234567800
}
```

Voor superadmin:
```json
{
  "sub": "ruben-uuid",
  "email": "ruben@rabar.nl",
  "role": "superadmin",
  "club_id": null,
  "club_slug": null,
  "is_superadmin": true,
  "exp": 1234567890
}
```

## Permissie matrix

| Actie | Superadmin | Vereniging Admin | Planner |
|-------|-----------|-----------------|---------|
| Tenants aanmaken/beheren | ✅ | — | — |
| Alle tenants inzien | ✅ | — | — |
| Gebruikers platform-breed beheren | ✅ | — | — |
| Eigen vereniging instellingen | — | ✅ | — |
| Branding instellen (kleuren, logo) | — | ✅ | — |
| Gebruikers eigen vereniging beheren | — | ✅ | — |
| Banen beheren | — | ✅ | — |
| Competities aanmaken | — | ✅ | ✅ |
| Teams beheren | — | ✅ | ✅ |
| Banenindeling maken | — | ✅ | ✅ |
| Banenindeling publiceren | — | ✅ | ✅ |
| Publieke display bekijken | — | ✅ | ✅ |

## Auth flows

### 1. Superadmin login

```
POST admin.competitie-planner.nl/auth/login
  { email: "ruben@rabar.nl", password: "..." }
  
→ Backend: valideert email + bcrypt hash
→ Controleert: User.is_superadmin == True
→ Geeft JWT terug met is_superadmin: true, club_id: null
→ Frontend redirect naar /dashboard (superadmin module)
```

### 2. Vereniging user login

```
POST [slug].competitie-planner.nl/auth/login
  { email: "vrijwilliger@club.nl", password: "..." }

→ Backend: haalt Club op via slug (uit Referer of X-Tenant-Slug header)
→ Valideert user behoort tot die club
→ Geeft JWT terug met club_id, club_slug, role
→ Frontend redirect naar /dashboard (tenant module)
```

### 3. Invite flow (nieuwe gebruiker)

```
Vereniging Admin → "Gebruiker uitnodigen" → invoer email + rol

Backend:
  1. Maak InviteToken record aan (uuid, expires 48h)
  2. Stuur email via Resend: "Klik hier om je account te activeren"
  3. Link: [slug].competitie-planner.nl/invite/[token]

Gebruiker klikt link:
  1. Frontend: toont "Stel wachtwoord in" formulier
  2. POST /auth/accept-invite { token, password }
  3. Backend: maakt User aan, markeert invite als gebruikt
  4. Redirect naar login
```

### 4. Wachtwoord reset

```
POST /auth/forgot-password { email }
→ Stuurt reset link per email (expires 1 uur)

POST /auth/reset-password { token, new_password }
→ Valideert token, update wachtwoord hash
```

## Database: User model

```sql
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id         UUID REFERENCES clubs(id),  -- NULL voor superadmin
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    full_name       VARCHAR(100),
    role            VARCHAR(20) NOT NULL,        -- 'superadmin' | 'vereniging_admin' | 'planner'
    is_superadmin   BOOLEAN DEFAULT FALSE,
    is_active       BOOLEAN DEFAULT TRUE,
    last_login      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE invite_tokens (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id         UUID NOT NULL REFERENCES clubs(id),
    email           VARCHAR(255) NOT NULL,
    role            VARCHAR(20) NOT NULL,
    token           VARCHAR(64) UNIQUE NOT NULL,
    used            BOOLEAN DEFAULT FALSE,
    expires_at      TIMESTAMPTZ NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

## Superadmin bootstrap

Bij eerste deployment wordt de superadmin account aangemaakt via een CLI commando (niet via de UI):

```bash
docker exec backend python -m app.cli create-superadmin \
  --email ruben@rabar.nl \
  --password "initieel-wachtwoord-hier"
```

Dit script:
1. Controleert of er al een superadmin bestaat
2. Maakt User aan met `is_superadmin=True`, `role='superadmin'`, `club_id=NULL`
3. Print bevestiging

## Token refresh strategie

- Access token: 60 minuten geldig
- Refresh token: 30 dagen geldig, opgeslagen in HttpOnly cookie
- Bij 401 response: frontend probeert automatisch refresh
- Bij refresh mislukking: redirect naar login pagina

```typescript
// src/lib/api.ts — axios interceptor
api.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true;
      await api.post('/auth/refresh');
      return api(error.config);
    }
    return Promise.reject(error);
  }
);
```

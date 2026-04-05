# Architectuur — Systeem overzicht

## Lagen

```
┌─────────────────────────────────────────────────────────────────┐
│  FRONTEND  (React 18 + Vite + TypeScript + shadcn/ui)           │
│                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────┐ │
│  │  Superadmin UI   │  │  Vereniging UI   │  │ Public Display│ │
│  │ admin.cpnr.nl    │  │ [slug].cpnr.nl   │  │ display.cpnr  │ │
│  └──────────────────┘  └──────────────────┘  └───────────────┘ │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS REST + JSON
┌────────────────────────────▼────────────────────────────────────┐
│  BACKEND API  (FastAPI + SQLAlchemy 2.x async)                  │
│                                                                  │
│  /superadmin/*   /api/v1/*   /display/*   /auth/*              │
│                                                                  │
│  ┌────────────┐ ┌─────────────┐ ┌──────────────────────────┐   │
│  │ Tenant mgmt│ │ Planning API│ │ Scheduling Engine (Python)│   │
│  └────────────┘ └─────────────┘ └──────────────────────────┘   │
└────────────────────────────┬────────────────────────────────────┘
                             │ SQLAlchemy async
┌────────────────────────────▼────────────────────────────────────┐
│  DATA  (PostgreSQL 16)                                           │
│                                                                  │
│  Schema: public (platform-wide) + per-tenant data via club_id   │
└─────────────────────────────────────────────────────────────────┘
```

## Services en domeinen

| Service | Container | Domein | Poort intern |
|---------|-----------|--------|--------------|
| Frontend (React SPA) | `frontend` | `*.competitie-planner.nl` | 5173 |
| Backend API | `backend` | `api.competitie-planner.nl` | 8000 |
| PostgreSQL | `db` | intern | 5432 |
| Redis (optioneel) | `redis` | intern | 6379 |
| Traefik | `traefik` | — | 80/443 |

> **Wildcard TLS**: Traefik gebruikt Let's Encrypt met DNS-01 challenge voor `*.competitie-planner.nl`. Dit is vereist voor dynamische subdomains per vereniging.

## Frontend routing

De React SPA detecteert het huidige subdomain en rendert de juiste module:

```typescript
// src/router/index.tsx
const hostname = window.location.hostname;

if (hostname === 'admin.competitie-planner.nl') {
  // Render SuperAdmin module
} else if (hostname === 'display.competitie-planner.nl') {
  // Render PublicDisplay module (no auth)
} else {
  // Extract slug from subdomain, render Tenant module
  const slug = hostname.split('.')[0];
}
```

## Backend API structuur

```
/auth
  POST /login                    ← JWT token (platform + tenant users)
  POST /refresh
  POST /logout

/superadmin                      ← Superadmin only (platform beheerder)
  GET  /tenants
  POST /tenants
  GET  /tenants/{id}
  PUT  /tenants/{id}
  POST /tenants/{id}/suspend
  GET  /users
  POST /users

/api/v1                          ← Tenant-scoped (JWT + tenant context)
  /clubs
  /banen
  /competities
  /teams
  /rondes
  /toewijzingen
  /planning/generate

/display                         ← Public, no auth
  GET /[slug]/actueel
  GET /[slug]/ronde/[token]
```

## Environment variabelen

### Backend (.env)

```env
DATABASE_URL=postgresql+asyncpg://user:pass@db:5432/competitieplanner
SECRET_KEY=<random 64 chars>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=30
RESEND_API_KEY=re_...
SUPERADMIN_EMAIL=ruben@rabar.nl
CORS_ORIGINS=["https://admin.competitie-planner.nl","https://*.competitie-planner.nl"]
```

### Frontend (.env)

```env
VITE_API_URL=https://api.competitie-planner.nl
VITE_PLATFORM_DOMAIN=competitie-planner.nl
```

## Docker Compose (productie basis)

```yaml
services:
  frontend:
    build: ./frontend
    labels:
      - "traefik.http.routers.frontend.rule=HostRegexp(`{subdomain:.+}.competitie-planner.nl`)"
      - "traefik.http.routers.frontend.tls=true"
      - "traefik.http.routers.frontend.tls.certresolver=letsencrypt"

  backend:
    build: ./backend
    depends_on: [db]
    labels:
      - "traefik.http.routers.api.rule=Host(`api.competitie-planner.nl`)"
      - "traefik.http.routers.api.tls=true"
    env_file: .env

  db:
    image: postgres:16-alpine
    volumes:
      - pg_data:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: competitieplanner
      POSTGRES_USER: cpuser
      POSTGRES_PASSWORD: ${DB_PASSWORD}

volumes:
  pg_data:
```

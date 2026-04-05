# Competitie-Planner — Project Documentation

> SaaS platform voor tennisverenigingen om banenindelingen te beheren en te publiceren via narrowcasting.

---

## Repository structuur

```
/
├── README.md                          ← dit bestand
├── architecture/
│   ├── 01-system-overview.md          ← systeem architectuur & techstack
│   ├── 02-saas-multitenancy.md        ← multi-tenant & subdomain model
│   ├── 03-auth-and-roles.md           ← auth systeem & rollenmodel
│   └── 04-public-display.md           ← narrowcasting & publieke URL
├── datamodel/
│   ├── 01-core-schema.md              ← alle database tabellen
│   └── 02-scheduling-algorithm.md     ← rotatie-algoritme uitleg
└── roadmap/
    ├── 00-overview.md                 ← roadmap samenvatting
    ├── phase-1-setup.md               ← infra, CI/CD, database
    ├── phase-2-superadmin.md          ← platform admin & tenant onboarding
    ├── phase-3-association-mgmt.md    ← verenigingsbeheer & auth
    ├── phase-4-competition-teams.md   ← competitie & team beheer
    ├── phase-5-planning-engine.md     ← planningsengine & indeling UI
    ├── phase-6-publish-display.md     ← publicatie & narrowcasting
    └── phase-7-polish.md              ← notificaties, PDF, KNLTB
```

---

## Product samenvatting

**Competitie-Planner** is een multi-tenant SaaS platform waarmee tennisverenigingen hun KNLTB banenindeling kunnen beheren. Elke vereniging krijgt een eigen subdomain (bijv. `myclub.competitie-planner.nl`), eigen branding (kleuren, logo), en een publieke display-URL geschikt voor narrowcasting via iframe.

### Kernfunctionaliteiten

- **Platform admin** — Ruben beheert alle tenants, gebruikers en facturering via een superadmin panel op `admin.competitie-planner.nl`
- **Verenigingsbeheer** — per vereniging: banen, eigenschappen, kleuren, logo
- **Competitie configuratie** — start/eind datums, feestdagen, inhaalrondes
- **Team beheer** — teams, captains, KNLTB speelklassen
- **Automatische indeling** — rotatie-algoritme dat eerlijke baan-verdeling over weken garandeert
- **Handmatige correctie** — drag & drop na automatische indeling
- **Publicatie** — één klik publiceert de indeling op een publieke, iframe-compatibele URL
- **Narrowcasting display** — auto-refresh, groot lettertype, verenigingskleuren

### Domeinen

| Subdomain | Doel | Auth |
|-----------|------|------|
| `admin.competitie-planner.nl` | Platform superadmin (Ruben) | Superadmin login |
| `[slug].competitie-planner.nl` | Vereniging admin portal | Vereniging users |
| `display.competitie-planner.nl/[slug]/[token]` | Publieke banenindeling | Geen |

---

## Techstack

| Laag | Technologie | Reden |
|------|-------------|-------|
| Frontend | React 18 + Vite + TypeScript | Snelle builds, goede DX |
| UI components | shadcn/ui + Tailwind CSS | Productie-klaar, toegankelijk |
| Routing | React Router v6 | File-based routing |
| Server state | TanStack Query v5 | Caching, optimistic updates |
| Drag & drop | dnd-kit | Lichtgewicht, accessible |
| Backend | FastAPI (Python 3.12) | Async, type-safe, bekend |
| ORM | SQLAlchemy 2.x async | Type-safe queries |
| Migraties | Alembic | Versiebeheerd schema |
| Auth | JWT (python-jose) + bcrypt | Stateless, veilig |
| Database | PostgreSQL 16 | ACID, JSON columns |
| Email | Resend API | Transactionele email |
| Deployment | Coolify + Traefik | Eigen server, auto TLS |
| CI/CD | GitHub Actions | Automatisch testen & deployen |
| Containers | Docker + docker-compose | Reproduceerbaar |

---

## Deployment model

Alle services draaien als Docker containers op de eigen server van de platformbeheerder (Ruben). Coolify verzorgt orchestratie, Traefik regelt TLS en subdomain routing via wildcard certificaat (`*.competitie-planner.nl`).

```
Internet → Traefik (wildcard TLS)
               ├── admin.competitie-planner.nl      → Frontend container (superadmin)
               ├── *.competitie-planner.nl           → Frontend container (per-tenant routing)
               ├── api.competitie-planner.nl         → FastAPI backend
               └── display.competitie-planner.nl     → Frontend container (public display)
```

---

## Voor AI agents

Elke user story in de roadmap bestanden bevat:
- **Als [rol] wil ik [actie] zodat [doel]** — standaard user story format
- **AC:** — acceptance criteria als testbare condities
- **Tags** — welk type agent de story oppakt (backend / frontend / infra / algoritme)
- **Dependencies** — welke stories eerst klaar moeten zijn

Agents werken story-voor-story. Status wordt bijgehouden via YAML frontmatter in elk roadmap bestand.

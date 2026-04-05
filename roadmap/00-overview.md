# Roadmap — Overzicht

## Fases

| Fase | Naam | Duur | MVP? | Stories |
|------|------|------|------|---------|
| 1 | Project setup & infrastructuur | 2 weken | ✅ | 6 |
| 2 | Superadmin platform panel | 2 weken | ✅ | 7 |
| 3 | Verenigingsbeheer & branding | 2 weken | ✅ | 7 |
| 4 | Competitie & team beheer | 2 weken | ✅ | 6 |
| 5 | Planningsengine & indeling UI | 3 weken | ✅ | 7 |
| 6 | Publicatie & narrowcasting display | 2 weken | ✅ | 7 |
| 7 | Polish, notificaties & uitbreidingen | 3+ weken | — | 8 |

**Totaal: 48 user stories · ~16 weken voor full MVP**

---

## Werkwijze voor AI agents

Elke story heeft:
- Unieke ID (bijv. `F2-03`)
- User story in standaard format
- Acceptance criteria (AC) als testbare condities
- Tags: welk type agent de story uitvoert
- Dependencies: welke stories eerst klaar zijn

### Tags

| Tag | Agent type |
|-----|-----------|
| `infra` | DevOps / infra agent |
| `backend` | Backend (FastAPI/Python) agent |
| `frontend` | Frontend (React/TypeScript) agent |
| `algoritme` | Algorithm specialist agent |
| `auth` | Auth specialist agent |
| `ci/cd` | CI/CD / DevOps agent |

### Story statussen (YAML frontmatter in elke fase file)

```yaml
status: todo        # nog niet gestart
status: in_progress # agent is bezig
status: review      # klaar, wacht op review
status: done        # geaccepteerd
status: blocked     # geblokkeerd door dependency
```

---

## MVP scope

Fase 1 t/m 6 vormt het volledige MVP: een werkende SaaS voor meerdere verenigingen, met superadmin panel, verenigingsbeheer, planningsengine, en narrowcasting display.

## Architectuur beslissingen

Zie de `/architecture` map voor gedetailleerde uitleg van:
- Systeem overzicht en techstack
- SaaS multi-tenant model en subdomain routing
- Auth systeem en rollenmodel
- Publieke display en narrowcasting integratie

## Datamodel

Zie de `/datamodel` map voor:
- Volledig database schema (SQL)
- Rotatie-algoritme uitleg met voorbeeldberekeningen

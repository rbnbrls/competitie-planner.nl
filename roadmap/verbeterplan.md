# Verbeterplan Competitie-Planner.nl

Kritische beoordeling van de huidige codebase, gebaseerd op analyse van alle backend/frontend code en de officiële KNLTB competitieregels voor senioren.

Dit verbeterplan is opgesplitst in 8 fasen. Elke fase heeft een eigen bestand met gedetailleerde taken:

| Fase | Bestand | Omschrijving |
|------|---------|-------------|
| 1 | [fase-1-kritieke-fixes.md](fase-1-kritieke-fixes.md) | Bugs, security hotfixes en testfundament |
| 2 | [fase-2-knltb-kernfunctionaliteit.md](fase-2-knltb-kernfunctionaliteit.md) | Thuis/uit-wedstrijden, tegenstanders, baanplanning |
| 3 | [fase-3-ux-doelgroep.md](fase-3-ux-doelgroep.md) | UX verbeteringen voor 50+ vrijwilligers |
| 4 | [fase-4-performance-security.md](fase-4-performance-security.md) | N+1 queries, rate limiting, encryptie |
| 5 | [fase-5-seizoensplanning-communicatie.md](fase-5-seizoensplanning-communicatie.md) | Seizoensoverzicht, planningsalgoritme, captains |
| 6 | [fase-6-operationele-volwassenheid.md](fase-6-operationele-volwassenheid.md) | CI verbeteren, monitoring, datetime fixes |
| 7 | [fase-7-nice-to-haves.md](fase-7-nice-to-haves.md) | KNLTB-koppeling, weer, invallers, undo |
| 8 | [fase-8-deployment-operations.md](fase-8-deployment-operations.md) | Coolify, backups, zero-downtime, observability |

## Prioritering

| Fase | Taken | Focus |
|------|-------|-------|
| **1** | 6 taken | Bugs fixen, secrets beveiligen, tests + migraties opzetten |
| **2** | 5 taken | KNLTB thuis/uit, tegenstanders, tijdslots, cross-competitie |
| **3** | 5 taken | Dashboard, onboarding, bulk, mobiel, foutmeldingen |
| **4** | 6 taken | N+1 queries, TanStack Query, rate limiting, IBAN, CORS |
| **5** | 5 taken | Seizoensoverzicht, slim algoritme, captains, componenten, print |
| **6** | 5 taken | CI verbeteren, structured logging, health checks, kalender |
| **7** | 5 taken | KNLTB-koppeling, weer, invallers, undo, competitie-types |
| **8** | 8 taken | Backups, zero-downtime, staging, Sentry, HTTPS, Docker |

**Totaal: 45 taken verdeeld over 8 fasen.**

## Ontwikkelomgeving

- **IDE**: VS Code met Kilo Code AI agent
- **Repository**: https://github.com/rbnbrls/competitie-planner.nl/
- **CD**: Elke push naar `main` triggert een build in Coolify v4.0.0-beta.470
- **Productie URL**: http://competitie-planner.nl
- **CI**: GitHub Actions (lint + typecheck op PRs)

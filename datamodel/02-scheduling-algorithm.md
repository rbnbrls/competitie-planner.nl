# Datamodel — Rotatie-algoritme

## Doel

Het algoritme verdeelt teams eerlijk over de beschikbare banen per speelronde. "Eerlijk" betekent: over het hele seizoen speelt elk team ongeveer even vaak op elke baan, gewogen naar de kwaliteit (prioriteit) van die baan.

## Principe

Voor elke combinatie van (team, baan) houden we een **gecumuleerde score** bij in de `PlanningHistorie` tabel:

```
totaal_score += baan.prioriteit_score    (bij elke ronde dat team op die baan speelt)
```

Bij het genereren van een nieuwe ronde krijgen teams met de **laagste totaal_score** op een bepaalde baan **voorrang** op die baan. Dit zorgt automatisch voor rotatie: teams die vaak op goede banen (hoge score) hebben gespeeld, krijgen nu de minder goede banen, en vice versa.

## Algoritme stappen

```python
def genereer_indeling(ronde_id: UUID, db: Session) -> list[BaanToewijzing]:
    """
    Genereert een banenindeling voor een speelronde.
    Returnt een lijst van BaanToewijzing objecten (nog niet opgeslagen).
    """

    ronde = db.get(Speelronde, ronde_id)
    competitie = ronde.competitie

    # Stap 1: Haal beschikbare banen op, gesorteerd op prioriteit (beste eerst)
    banen = db.query(Baan).filter(
        Baan.club_id == competitie.club_id,
        Baan.actief == True
    ).order_by(Baan.prioriteit_score.desc()).all()

    # Stap 2: Haal actieve teams op
    teams = db.query(Team).filter(
        Team.competitie_id == competitie.id,
        Team.actief == True
    ).all()

    # Stap 3: Laad historische scores (of 0 als team nog niet op die baan speelde)
    scores = {}    # {(team_id, baan_id): totaal_score}
    for h in db.query(PlanningHistorie).filter_by(competitie_id=competitie.id):
        scores[(h.team_id, h.baan_id)] = h.totaal_score

    # Stap 4: Greedy toewijzing
    # Itereer banen van beste naar slechtste
    # Ken aan elke baan het team toe met de laagste historische score op die baan
    toewijzingen = []
    toegewezen_teams = set()

    for baan in banen:
        if not teams:
            break

        # Sorteer beschikbare teams op score voor deze baan (laagste = meeste prio)
        beschikbare_teams = [t for t in teams if t.id not in toegewezen_teams]
        if not beschikbare_teams:
            break

        gekozen_team = min(
            beschikbare_teams,
            key=lambda t: scores.get((t.id, baan.id), 0)
        )

        toewijzingen.append(BaanToewijzing(
            ronde_id=ronde.id,
            team_id=gekozen_team.id,
            baan_id=baan.id,
        ))
        toegewezen_teams.add(gekozen_team.id)

    return toewijzingen
```

## Score update na publicatie

Na het publiceren van een ronde wordt de historische score bijgewerkt:

```python
def update_planning_historie(ronde_id: UUID, db: Session):
    """
    Wordt aangeroepen na POST /rondes/{id}/publiceer
    """
    toewijzingen = db.query(BaanToewijzing).filter_by(ronde_id=ronde_id).all()

    for t in toewijzingen:
        baan = db.get(Baan, t.baan_id)

        historie = db.query(PlanningHistorie).filter_by(
            competitie_id=...,
            team_id=t.team_id,
            baan_id=t.baan_id
        ).first()

        if not historie:
            historie = PlanningHistorie(
                club_id=baan.club_id,
                competitie_id=...,
                team_id=t.team_id,
                baan_id=t.baan_id,
                aantal_keer=0,
                totaal_score=0
            )
            db.add(historie)

        historie.aantal_keer += 1
        historie.totaal_score += baan.prioriteit_score

    db.commit()
```

## Voorbeeld seizoen (5 teams, 3 banen)

| | Baan 1 (prio 9) | Baan 2 (prio 6) | Baan 3 (prio 3) |
|--|--|--|--|
| **Ronde 1** | Team A (score: 0) | Team B (score: 0) | Team C (score: 0) |
| Na ronde 1: | A=9, B=0, C=0 | A=0, B=6, C=0 | A=0, B=0, C=3 |
| **Ronde 2** | Team B (score: 0) | Team C (score: 0) | Team A (score: 0) |
| Na ronde 2: | A=9, B=9, C=0 | A=0, B=6, C=6 | A=3, B=0, C=3 |
| **Ronde 3** | Team C (score: 0) | Team A (score: 0) | Team B (score: 0) |
| Na ronde 3: | A=9, B=9, C=9 | A=6, B=6, C=6 | A=3, B=3, C=3 |

→ Na 3 rondes heeft elk team exact evenveel tijd op elke baankwaliteit doorgebracht.

## Handmatige correcties

Als de planner een toewijzing handmatig aanpast na automatische generatie, wordt die aanpassing opgeslagen als `BaanToewijzing`. Bij publicatie wordt de **daadwerkelijk gepubliceerde** toewijzing gebruikt voor de historiescore, niet de automatisch gegenereerde. Zo blijft de rotatie correct ook na handmatige ingrepen.

## Randgevallen

| Situatie | Gedrag |
|----------|--------|
| Meer teams dan banen | Laatste teams krijgen geen baan (worden genegeerd) |
| Meer banen dan teams | Laatste banen krijgen geen team (lege banen in display) |
| Gelijke score voor meerdere teams | Python `min()` kiest deterministisch (eerste in lijst, gesorteerd op team.id) |
| Eerste ronde van seizoen (geen historie) | Alle scores = 0 → volgorde op basis van team.id (consistente tiebreaker) |
| Team toegevoegd halverwege seizoen | Nieuwe team start met score 0 → krijgt automatisch de beste baan de eerste rondes |

## Toekomstige uitbreidingen (fase 7+)

- **Tijdslot-afhankelijke baan beschikbaarheid**: baan 3 alleen beschikbaar na 14:00 door schaduw
- **Team-voorkeuren**: team wil altijd overdekte baan vanwege thuisspelers met blessure
- **Multi-objectief optimalisatie**: balans rotatie + voorkeur + beschikbaarheid via scoring function weights

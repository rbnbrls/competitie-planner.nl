import io
import os
from datetime import date
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import joinedload
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    Baan,
    BaanToewijzing,
    Club,
    Competitie,
    Speelronde,
    Team,
    Wedstrijd,
)


class PDFService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def generate_banenindeling_pdf(
        self,
        ronde_id: UUID,
    ) -> bytes:
        result = await self.db.execute(select(Speelronde).where(Speelronde.id == ronde_id))
        ronde = result.scalar_one_or_none()
        if not ronde:
            raise ValueError("Ronde not found")

        result = await self.db.execute(select(Club).where(Club.id == ronde.club_id))
        club = result.scalar_one_or_none()
        if not club:
            raise ValueError("Club not found")

        result = await self.db.execute(
            select(Competitie).where(Competitie.id == ronde.competitie_id)
        )
        competitie = result.scalar_one_or_none()

        result = await self.db.execute(
            select(BaanToewijzing).where(BaanToewijzing.ronde_id == ronde_id)
        )
        toewijzingen = list(result.scalars().all())

        banen_dict = {}
        for t in toewijzingen:
            result = await self.db.execute(select(Baan).where(Baan.id == t.baan_id))
            baan = result.scalar_one_or_none()
            if baan:
                banen_dict[baan.id] = baan

        teams_dict = {}
        for t in toewijzingen:
            result = await self.db.execute(select(Team).where(Team.id == t.team_id))
            team = result.scalar_one_or_none()
            if team:
                teams_dict[team.id] = team

        html = self._build_pdf_html(
            club=club,
            competitie=competitie,
            ronde=ronde,
            toewijzingen=toewijzingen,
            banen_dict=banen_dict,
            teams_dict=teams_dict,
        )

        return await self._render_pdf(html, club)

    async def generate_seizoensoverzicht_pdf(
        self,
        competitie_id: UUID,
    ) -> bytes:
        result = await self.db.execute(
            select(Competitie).where(Competitie.id == competitie_id)
        )
        competitie = result.scalar_one_or_none()
        if not competitie:
            raise ValueError("Competitie not found")

        result = await self.db.execute(select(Club).where(Club.id == competitie.club_id))
        club = result.scalar_one_or_none()
        if not club:
            raise ValueError("Club not found")

        # Fetch rounds
        result = await self.db.execute(
            select(Speelronde)
            .where(Speelronde.competitie_id == competitie_id)
            .order_by(Speelronde.datum)
        )
        rondes = list(result.scalars().all())

        # Fetch teams
        result = await self.db.execute(
            select(Team)
            .where(Team.competitie_id == competitie_id)
            .order_by(Team.naam)
        )
        teams = list(result.scalars().all())

        # Fetch all assignments
        result = await self.db.execute(
            select(BaanToewijzing)
            .join(Speelronde)
            .where(Speelronde.competitie_id == competitie_id)
            .options(joinedload(BaanToewijzing.baan))
        )
        toewijzingen = list(result.scalars().all())

        # Fetch all matches
        result = await self.db.execute(
            select(Wedstrijd)
            .where(Wedstrijd.competitie_id == competitie_id)
        )
        wedstrijden = list(result.scalars().all())

        # Lookups
        thuis_lookup = {}
        for t in toewijzingen:
            thuis_lookup[(t.ronde_id, t.team_id)] = t

        uit_lookup = {}
        for w in wedstrijden:
            uit_lookup[(w.ronde_id, w.uitteam_id)] = w

        html = self._build_seizoensoverzicht_html(
            club=club,
            competitie=competitie,
            rondes=rondes,
            teams=teams,
            thuis_lookup=thuis_lookup,
            uit_lookup=uit_lookup,
        )

        return await self._render_pdf(html, club, landscape=True)

    def _build_pdf_html(
        self,
        club: Club,
        competitie: Competitie | None,
        ronde: Speelronde,
        toewijzingen: list[BaanToewijzing],
        banen_dict: dict[UUID, Baan],
        teams_dict: dict[UUID, Team],
    ) -> str:
        rows = []
        for t in toewijzingen:
            baan = banen_dict.get(t.baan_id)
            team = teams_dict.get(t.team_id)
            if baan and team:
                baan_naam = baan.naam or f"Baan {baan.nummer}"
                team_naam = team.naam
                tijd = ""
                if t.tijdslot_start and t.tijdslot_eind:
                    tijd = f"{t.tijdslot_start.strftime('%H:%M')} - {t.tijdslot_eind.strftime('%H:%M')}"
                elif t.tijdslot_start:
                    tijd = t.tijdslot_start.strftime("%H:%M")

                notitie = t.notitie or ""

                rows.append(f"""
                <tr>
                    <td>{baan_naam}</td>
                    <td>{team_naam}</td>
                    <td>{tijd}</td>
                    <td>{notitie}</td>
                </tr>
                """)

        competitie_naam = competitie.naam if competitie else ""

        return f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; }}
        .header {{ 
            background-color: {club.primary_color}; 
            color: {club.secondary_color}; 
            padding: 30px; 
            margin: -40px -40px 30px -40px;
        }}
        .header h1 {{ font-size: 28px; margin-bottom: 5px; }}
        .header .competitie {{ font-size: 18px; opacity: 0.9; }}
        .meta {{ margin-bottom: 30px; color: #666; }}
        table {{ width: 100%; border-collapse: collapse; }}
        th {{ 
            background-color: {club.primary_color}; 
            color: {club.secondary_color};
            padding: 15px; 
            text-align: left; 
            font-weight: 600;
        }}
        td {{ padding: 15px; border-bottom: 1px solid #eee; }}
        tr:nth-child(even) {{ background-color: #f9f9f9; }}
        .footer {{ margin-top: 30px; font-size: 12px; color: #999; text-align: center; }}
    </style>
</head>
<body>
    <div class="header">
        <h1>{club.naam}</h1>
        <div class="competitie">{competitie_naam}</div>
    </div>
    
    <div class="meta">
        <strong>Datum:</strong> {ronde.datum.strftime("%d-%m-%Y")}<br>
        <strong>Ronde:</strong> {ronde.week_nummer or "Normaal"}
    </div>
    
    <table>
        <thead>
            <tr>
                <th>Baan</th>
                <th>Team</th>
                <th>Tijdslot</th>
                <th>Notitie</th>
            </tr>
        </thead>
        <tbody>
            {"".join(rows)}
        </tbody>
    </table>
    
    <div class="footer">
        Gegenereerd door competitie-planner.nl
    </div>
</body>
</html>"""

    async def _render_pdf(self, html: str, club: Club, landscape: bool = False) -> bytes:
        weasyprint_available = os.getenv("WEASYPRINT_AVAILABLE", "false")

        if weasyprint_available.lower() == "true":
            try:
                from weasyprint import HTML, CSS

                # Handle landscape
                stylesheets = []
                if landscape:
                    stylesheets.append(CSS(string="@page { size: A4 landscape; margin: 1cm; }"))

                pdf_file = HTML(string=html).write_pdf(stylesheets=stylesheets)
                return pdf_file
            except ImportError:
                pass

        pdf_content = self._generate_fake_pdf(html, club)
        return pdf_content

    def _build_seizoensoverzicht_html(
        self,
        club: Club,
        competitie: Competitie,
        rondes: list[Speelronde],
        teams: list[Team],
        thuis_lookup: dict,
        uit_lookup: dict,
    ) -> str:
        header_cells = "".join(
            [
                f"<th>{r.datum.strftime('%d-%m')}</th>"
                for r in rondes
            ]
        )

        rows_html = []
        for team in teams:
            cells = []
            for ronde in rondes:
                label = "-"
                status_class = ""
                
                if (ronde.id, team.id) in thuis_lookup:
                    t = thuis_lookup[(ronde.id, team.id)]
                    label = f"B{t.baan.nummer}"
                    status_class = "thuis"
                elif (ronde.id, team.id) in uit_lookup:
                    label = "UIT"
                    status_class = "uit"
                
                cells.append(f'<td class="{status_class}">{label}</td>')
            
            rows_html.append(f"<tr><td><strong>{team.naam}</strong></td>{''.join(cells)}</tr>")

        return f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; font-size: 10px; }}
        .header {{ 
            background-color: {club.primary_color}; 
            color: {club.secondary_color}; 
            padding: 20px; 
            margin: -20px -20px 20px -20px;
        }}
        .header h1 {{ font-size: 20px; }}
        table {{ width: 100%; border-collapse: collapse; table-layout: fixed; }}
        th, td {{ 
            border: 1px solid #ddd; 
            padding: 8px 4px; 
            text-align: center; 
            word-wrap: break-word;
        }}
        th {{ background-color: #f2f2f2; font-weight: bold; }}
        td:first-child {{ text-align: left; width: 150px; background-color: #f9f9f9; }}
        .thuis {{ background-color: #e8f5e9; color: #2e7d32; font-weight: bold; }}
        .uit {{ background-color: #fff3e0; color: #e65100; }}
        .footer {{ margin-top: 20px; font-size: 8px; color: #999; text-align: center; }}
    </style>
</head>
<body>
    <div class="header">
        <h1>Seizoensoverzicht: {competitie.naam}</h1>
        <div>{club.naam}</div>
    </div>
    
    <table>
        <thead>
            <tr>
                <th>Team</th>
                {header_cells}
            </tr>
        </thead>
        <tbody>
            {"".join(rows_html)}
        </tbody>
    </table>
    
    <div class="footer">
        Gegenereerd door competitie-planner.nl
    </div>
</body>
</html>"""

    def _generate_fake_pdf(self, html: str, club: Club) -> bytes:
        return b"%PDF-1.4\nFake PDF for development\n" + html.encode("utf-8")

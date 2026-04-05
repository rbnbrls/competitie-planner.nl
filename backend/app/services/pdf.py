import io
import os
from datetime import date
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Baan, BaanToewijzing, Club, Competitie, Speelronde, Team


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

    async def _render_pdf(self, html: str, club: Club) -> bytes:
        weasyprint_available = os.getenv("WEASYPRINT_AVAILABLE", "false")

        if weasyprint_available.lower() == "true":
            try:
                from weasyprint import HTML

                pdf_file = HTML(string=html).write()
                return pdf_file
            except ImportError:
                pass

        pdf_content = self._generate_fake_pdf(html, club)
        return pdf_content

    def _generate_fake_pdf(self, html: str, club: Club) -> bytes:
        return b"%PDF-1.4\nFake PDF for development\n" + html.encode("utf-8")

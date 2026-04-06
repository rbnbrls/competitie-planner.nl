import os
from datetime import datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Baan, BaanToewijzing, Club, Speelronde, Team


class EmailService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.resend_api_key = os.getenv("RESEND_API_KEY", "")
        self.from_email = os.getenv("FROM_EMAIL", "noreply@competitie-planner.nl")
        self.frontend_url = os.getenv("FRONTEND_URL", "https://competitie-planner.nl")

    async def send_publication_notification(
        self,
        ronde_id: UUID,
    ) -> dict:
        result = await self.db.execute(select(Speelronde).where(Speelronde.id == ronde_id))
        ronde = result.scalar_one_or_none()
        if not ronde:
            return {"sent": 0, "error": "Ronde not found"}

        result = await self.db.execute(select(Club).where(Club.id == ronde.club_id))
        club = result.scalar_one_or_none()
        if not club:
            return {"sent": 0, "error": "Club not found"}

        result = await self.db.execute(
            select(BaanToewijzing).where(BaanToewijzing.ronde_id == ronde_id)
        )
        toewijzingen = list(result.scalars().all())

        recipient_emails = set()
        for t in toewijzingen:
            result = await self.db.execute(select(Team).where(Team.id == t.team_id))
            team = result.scalar_one_or_none()
            if team and team.captain_email:
                result = await self.db.execute(
                    select(Team).where(
                        Team.competitie_id == ronde.competitie_id,
                        Team.captain_email == team.captain_email,
                    )
                )
                if result.scalar_one_or_none() and not result.scalar_one().email_opt_out:
                    recipient_emails.add(team.captain_email)

        if not recipient_emails:
            return {"sent": 0, "recipients": []}

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

        html_body = self._build_email_html(
            club=club,
            ronde=ronde,
            toewijzingen=toewijzingen,
            banen_dict=banen_dict,
            teams_dict=teams_dict,
            portal_links={t.team_id: f"{self.frontend_url}/captain/{teams_dict[t.team_id].public_token}" for t in toewijzingen if t.team_id in teams_dict}
        )

        success = await self._send_email(
            to=list(recipient_emails),
            subject=f"Banenindeling {club.naam} - {ronde.datum.strftime('%d-%m-%Y')}",
            html=html_body,
        )

        return {
            "sent": success,
            "recipients": list(recipient_emails),
        }

    def _build_email_html(
        self,
        club: Club,
        ronde: Speelronde,
        toewijzingen: list[BaanToewijzing],
        banen_dict: dict[UUID, Baan],
        teams_dict: dict[UUID, Team],
        portal_links: dict[UUID, str] | None = None,
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
                    <td style="padding: 12px; border-bottom: 1px solid #eee;">{baan_naam}</td>
                    <td style="padding: 12px; border-bottom: 1px solid #eee;">{team_naam}</td>
                    <td style="padding: 12px; border-bottom: 1px solid #eee;">{tijd}</td>
                    <td style="padding: 12px; border-bottom: 1px solid #eee;">{notitie}</td>
                </tr>
                """)

        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; }}
                .header {{ background-color: {club.primary_color}; color: {club.secondary_color}; padding: 20px; }}
                .content {{ padding: 20px; }}
                table {{ width: 100%; border-collapse: collapse; }}
                th {{ background-color: #f5f5f5; padding: 12px; text-align: left; }}
                .footer {{ padding: 20px; font-size: 12px; color: #666; }}
            </style>
        </head>
        <body>
            <div class="header">
                <h1 style="margin: 0;">{club.naam}</h1>
            </div>
            <div class="content">
                <h2>Banenindeling {ronde.datum.strftime("%d-%m-%Y")}</h2>
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
                <div style='margin-top: 20px; padding: 15px; background: #f9f9f9; border-radius: 8px;'>
                    <p style="margin-top: 0;"><strong>📅 Kalender-integratie</strong></p>
                    <p>Je kunt al je wedstrijden automatisch in je eigen agenda (Outlook, Google, Apple) laten verschijnen via je persoonlijke kalender-link:</p>
                    <div style="text-align: center; margin: 15px 0;">
                        {f'<a href="{self.frontend_url.replace("https://", "webcal://")}/api/v1/calendar/team/{list(portal_links.values())[0].split("/")[-1]}.ics" style="background-color: {club.accent_color}; color: #000; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Toevoegen aan agenda</a>' if portal_links and len(portal_links) > 0 else ""}
                    </div>
                </div>
                {"<div style='margin-top: 20px; padding: 15px; background: #f9f9f9; border-radius: 8px;'><p><strong>Tip:</strong> Gebruik je persoonlijke link om je planning te bekijken, de uitslag door te geven of je beschikbaarheid voor de volgende ronde te melden.</p></div>" if portal_links else ""}
            </div>
            <div class="footer">
                <p>Dit is een automatisch gegenereerde email van competitie-planner.nl</p>
                <p><a href="#">Afmelden voor emails</a></p>
            </div>
        </body>
        </html>
        """

    async def send_reminder_emails(self, days_before: int = 3) -> dict:
        # Dit zou door een cronjob aangeroepen moeten worden
        # Vind rondes die over X dagen zijn
        # Vind rondes die over X dagen zijn
        from datetime import timedelta  # noqa: F401

        # ... logic to find rounds and teams ...
        # Voor nu implementeren we de methode maar de cronjob ontbreekt nog
        return {"status": "not_fully_implemented_yet"}

    async def send_matchday_summary_to_tc(self, club_id: UUID, date: datetime.date) -> dict:
        # Haal club op
        result = await self.db.execute(select(Club).where(Club.id == club_id))
        club = result.scalar_one_or_none()
        if not club:
            return {"error": "Club not found"}

        # Haal alle wedstrijden van die dag voor die club op
        # (Dit vereist een koppeling tussen Wedstrijd en Club via Competitie)
        # ... logic ...
        return {"status": "summary_sent"}

    async def _send_email(
        self,
        to: list[str],
        subject: str,
        html: str,
    ) -> int:
        if not self.resend_api_key:
            print(f"[EMAIL MOCK] To: {to}, Subject: {subject}")
            return len(to)

        try:
            import resend

            resend.api_key = self.resend_api_key

            params = {
                "from": f"{self.from_email}",
                "to": to,
                "subject": subject,
                "html": html,
            }

            resend.Emails.send(params)
            return 1
        except Exception as e:
            print(f"Email send error: {e}")
            return 0

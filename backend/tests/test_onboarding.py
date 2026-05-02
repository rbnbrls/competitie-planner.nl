"""
File: backend/tests/test_onboarding.py
Last updated: 2026-05-02
API version: 0.1.0
Author: OpenAI Codex
Changelog:
  - 2026-05-02: Add regression coverage for onboarding status resume data
"""

from datetime import date

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession


class TestOnboardingStatus:
    async def test_status_returns_competitie_id_for_existing_competition(
        self, client: AsyncClient, admin_auth_headers: dict, db_session: AsyncSession, club
    ):
        from app.models import Competitie

        competitie = Competitie(
            club_id=club.id,
            naam="Voorjaarscompetitie",
            speeldag="vrijdag",
            start_datum=date(2026, 6, 1),
            eind_datum=date(2026, 9, 1),
        )
        db_session.add(competitie)
        await db_session.commit()
        await db_session.refresh(competitie)

        response = await client.get(
            "/api/v1/tenant/onboarding/status",
            headers=admin_auth_headers,
        )

        assert response.status_code == 200
        assert response.json()["step3_completed"] is True
        assert response.json()["step4_completed"] is False
        assert response.json()["competitie_id"] == str(competitie.id)

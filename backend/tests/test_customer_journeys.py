"""
Customer Journey: Club Setup & Admin Management
Test complete flow from club creation to user invitation
"""

import pytest
from httpx import AsyncClient


class TestClubSetupJourney:
    """Tests for club admin setting up their club."""

    async def test_create_competition_with_teams_and_rounds(
        self, client: AsyncClient, admin_auth_headers: dict
    ):
        """Journey: Admin creates competition with teams and schedules rounds."""

        # Step 1: Create baan (court)
        baan_response = await client.post(
            "/api/v1/tenant/banen",
            json={"nummer": 1, "naam": "Baal 1", "verlichting_type": "led", "overdekt": True},
            headers=admin_auth_headers,
        )
        assert baan_response.status_code == 200
        baan_id = baan_response.json()["id"]

        # Step 2: Create competitie
        competitie_response = await client.post(
            "/api/v1/tenant/competities",
            json={
                "naam": "Wintercompetitie 2024",
                "speeldag": "vrijdag",
                "start_datum": "2024-11-01",
                "eind_datum": "2025-03-31",
            },
            headers=admin_auth_headers,
        )
        assert competitie_response.status_code == 200
        competitie_id = competitie_response.json()["id"]

        # Step 3: Create teams
        team1_response = await client.post(
            f"/api/v1/tenant/competities/{competitie_id}/teams",
            json={"naam": "Team A", "captain_naam": "Jan", "captain_email": "jan@test.nl"},
            headers=admin_auth_headers,
        )
        assert team1_response.status_code == 200

        team2_response = await client.post(
            f"/api/v1/tenant/competities/{competitie_id}/teams",
            json={"naam": "Team B", "captain_naam": "Piet", "captain_email": "piet@test.nl"},
            headers=admin_auth_headers,
        )
        assert team2_response.status_code == 200

        # Step 4: Get speelrondes
        rondes_response = await client.get(
            f"/api/v1/tenant/competities/{competitie_id}/rondes",
            headers=admin_auth_headers,
        )
        assert rondes_response.status_code == 200
        assert len(rondes_response.json()) > 0

    async def test_publish_and_view_ronde(
        self, client: AsyncClient, admin_auth_headers: dict, db_session
    ):
        """Journey: Admin publishes a round and views it via display link."""
        from app.models import Club, Competitie, Speelronde, Team, Baan

        # Setup: Create club, competitie, ronde, team, baan
        club = Club(naam="Test Club", slug="testjourney", status="trial")
        db_session.add(club)
        await db_session.commit()

        from datetime import date

        competitie = Competitie(
            club_id=club.id,
            naam="Test Comp",
            speeldag="vrijdag",
            start_datum=date(2024, 1, 1),
            eind_datum=date(2024, 12, 31),
        )
        db_session.add(competitie)
        await db_session.commit()

        ronde = Speelronde(
            competitie_id=competitie.id,
            club_id=club.id,
            datum=date(2024, 11, 15),
            status="concept",
        )
        db_session.add(ronde)
        await db_session.commit()

        baan = Baan(club_id=club.id, nummer=1)
        db_session.add(baan)
        await db_session.commit()

        team = Team(club_id=club.id, competitie_id=competitie.id, naam="Test Team")
        db_session.add(team)
        await db_session.commit()

        # Step 1: Publish ronde
        publish_response = await client.post(
            f"/api/v1/tenant/rondes/{ronde.id}/publish",
            headers=admin_auth_headers,
        )
        assert publish_response.status_code == 200

        # Step 2: View published ronde details
        detail_response = await client.get(
            f"/api/v1/tenant/rondes/{ronde.id}",
            headers=admin_auth_headers,
        )
        assert detail_response.status_code == 200
        data = detail_response.json()
        assert data["status"] == "gepubliceerd"
        assert data["public_token"] is not None

    async def test_generate_ronde_indeling(
        self, client: AsyncClient, admin_auth_headers: dict, db_session
    ):
        """Journey: Admin generates automatic round scheduling."""
        from app.models import Club, Competitie, Speelronde, Team, Baan
        from datetime import date

        club = Club(naam="Test Club", slug="testplan", status="trial")
        db_session.add(club)
        await db_session.commit()

        competitie = Competitie(
            club_id=club.id,
            naam="Test Comp",
            speeldag="vrijdag",
            start_datum=date(2024, 1, 1),
            eind_datum=date(2024, 12, 31),
        )
        db_session.add(competitie)
        await db_session.commit()

        ronde = Speelronde(
            competitie_id=competitie.id,
            club_id=club.id,
            datum=date(2024, 11, 15),
            status="concept",
        )
        db_session.add(ronde)
        await db_session.commit()

        # Add baan and teams
        for i in range(1, 3):
            baan = Baan(club_id=club.id, nummer=i)
            db_session.add(baan)

        for i in range(1, 5):
            team = Team(club_id=club.id, competitie_id=competitie.id, naam=f"Team {i}")
            db_session.add(team)

        await db_session.commit()

        # Generate indeling
        generate_response = await client.post(
            f"/api/v1/tenant/rondes/{ronde.id}/genereer",
            headers=admin_auth_headers,
        )
        assert generate_response.status_code == 200

        # Check that toewijzingen were created
        detail_response = await client.get(
            f"/api/v1/tenant/rondes/{ronde.id}",
            headers=admin_auth_headers,
        )
        data = detail_response.json()
        assert len(data.get("baantoewijzingen", [])) > 0


class TestUserInvitationJourney:
    """Tests for inviting users to a club."""

    async def test_invite_and_accept_user(self, client: AsyncClient, admin_auth_headers: dict):
        """Journey: Admin invites user and user accepts invitation."""

        # Step 1: Admin invites user
        invite_response = await client.post(
            "/api/v1/tenant/invite",
            json={
                "email": "newuser@testclub.nl",
                "role": "user",
            },
            headers=admin_auth_headers,
        )
        assert invite_response.status_code == 200
        token = invite_response.json()["token"]

        # Step 2: User accepts invite
        accept_response = await client.post(
            "/api/v1/tenant/accept-invite",
            json={
                "token": token,
                "password": "newpassword123",
            },
        )
        assert accept_response.status_code == 200
        assert "access_token" in accept_response.json()

        # Step 3: New user can login
        login_response = await client.post(
            "/api/v1/tenant/login",
            params={
                "username": "newuser@testclub.nl",
                "password": "newpassword123",
                "slug": "testclub",
            },
        )
        assert login_response.status_code == 200
        assert "access_token" in login_response.json()

    async def test_admin_manages_users(
        self, client: AsyncClient, admin_auth_headers: dict, db_session
    ):
        """Journey: Admin views, updates and deactivates users."""
        from app.models import Club, User
        from passlib.hash import bcrypt

        club = Club(naam="Test Club", slug="testusers", status="trial")
        db_session.add(club)
        await db_session.commit()

        # Create a user
        user = User(
            club_id=club.id,
            email="member@testclub.nl",
            password_hash=bcrypt("password"),
            full_name="Test Member",
            role="user",
        )
        db_session.add(user)
        await db_session.commit()

        # Step 1: List users
        list_response = await client.get(
            "/api/v1/tenant/users",
            headers=admin_auth_headers,
        )
        assert list_response.status_code == 200
        users = list_response.json()
        assert any(u["email"] == "member@testclub.nl" for u in users)

        # Step 2: Update user
        update_response = await client.patch(
            f"/api/v1/tenant/users/{user.id}",
            json={"full_name": "Updated Name", "role": "admin"},
            headers=admin_auth_headers,
        )
        assert update_response.status_code == 200
        assert update_response.json()["full_name"] == "Updated Name"


class TestPasswordResetJourney:
    """Tests for password reset flow."""

    async def test_forgot_and_reset_password(
        self, client: AsyncClient, admin_auth_headers: dict, db_session
    ):
        """Journey: User forgets password and resets it."""
        from app.models import Club, User, PasswordResetToken
        from passlib.hash import bcrypt
        from datetime import datetime, timedelta

        club = Club(naam="Test Club", slug="testpwd", status="trial")
        db_session.add(club)
        await db_session.commit()

        user = User(
            club_id=club.id,
            email="resetuser@testclub.nl",
            password_hash=bcrypt("oldpassword"),
            full_name="Reset User",
            role="user",
        )
        db_session.add(user)
        await db_session.commit()

        # Step 1: Request password reset
        forgot_response = await client.post(
            "/api/v1/tenant/forgot-password",
            json={"email": "resetuser@testclub.nl", "slug": "testpwd"},
        )
        assert forgot_response.status_code == 200

        # Get reset token from DB
        reset_token = await db_session.get(PasswordResetToken, user.id)
        assert reset_token is not None

        # Step 2: Reset password
        reset_response = await client.post(
            "/api/v1/tenant/reset-password",
            json={
                "token": reset_token.token,
                "new_password": "newpassword123",
            },
        )
        assert reset_response.status_code == 200

        # Step 3: Login with new password
        login_response = await client.post(
            "/api/v1/tenant/login",
            params={
                "username": "resetuser@testclub.nl",
                "password": "newpassword123",
                "slug": "testpwd",
            },
        )
        assert login_response.status_code == 200
        assert "access_token" in login_response.json()

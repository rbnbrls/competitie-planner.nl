"""
File: backend/tests/test_superadmin_journeys.py
Last updated: 2026-05-01
API version: 0.1.0
Author: Ruben Barels <ruben@rabar.nl>
Changelog:
  - 2026-05-01: Initial metadata header added
"""

"""
Customer Journey: Superadmin and Payments
Test complete flows for superadmin operations and payment setup
"""

from datetime import date

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Club, Competitie


class TestSuperadminJourney:
    """Tests for superadmin managing clubs and payments."""

    async def test_create_and_manage_club(self, client: AsyncClient, superadmin_auth_headers: dict):
        """Journey: Superadmin creates and manages a club."""

        # Step 1: Create club
        create_response = await client.post(
            "/api/v1/superadmin/clubs",
            json={
                "naam": "Nieuwe Tennisclub",
                "slug": "nieuweclub",
                "adres": "Sportweg 10",
                "stad": "Amsterdam",
            },
            headers=superadmin_auth_headers,
        )
        assert create_response.status_code == 201
        club_id = create_response.json()["id"]

        # Step 2: List clubs
        list_response = await client.get(
            "/api/v1/superadmin/clubs",
            headers=superadmin_auth_headers,
        )
        assert list_response.status_code == 200
        clubs = list_response.json()
        assert any(c["slug"] == "nieuweclub" for c in clubs)

        # Step 3: Update club
        update_response = await client.patch(
            f"/api/v1/superadmin/clubs/{club_id}",
            json={"stad": "Rotterdam"},
            headers=superadmin_auth_headers,
        )
        assert update_response.status_code == 200
        assert update_response.json()["stad"] == "Rotterdam"

    async def test_manage_club_users(
        self, client: AsyncClient, superadmin_auth_headers: dict, db_session
    ):
        """Journey: Superadmin manages users across clubs."""
        from app.models import Club, User
        from app.services.auth import get_password_hash

        club = Club(naam="Test Club", slug="testsuperadmin", status="trial")
        db_session.add(club)
        await db_session.commit()

        user = User(
            club_id=club.id,
            email="clubadmin@test.nl",
            password_hash=get_password_hash("password"),
            full_name="Club Admin",
            role="admin",
        )
        db_session.add(user)
        await db_session.commit()

        # Step 1: List users (filtered by club)
        list_response = await client.get(
            f"/api/v1/superadmin/users?club_id={club.id}",
            headers=superadmin_auth_headers,
        )
        assert list_response.status_code == 200
        users = list_response.json()
        assert any(u["email"] == "clubadmin@test.nl" for u in users)

        # Step 2: Update user
        update_response = await client.patch(
            f"/api/v1/superadmin/users/{user.id}",
            json={"is_active": False},
            headers=superadmin_auth_headers,
        )
        assert update_response.status_code == 200

    async def test_dashboard_stats(self, client: AsyncClient, superadmin_auth_headers: dict):
        """Journey: Superadmin views dashboard statistics."""

        response = await client.get(
            "/api/v1/superadmin/dashboard",
            headers=superadmin_auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert "metrics" in data
        assert "total_clubs" in data["metrics"]
        assert "total_users" in data["metrics"]


class TestPaymentSetupJourney:
    """Tests for setting up payment (Mollie) integration."""

    async def test_superadmin_configures_mollie(
        self, client: AsyncClient, superadmin_auth_headers: dict
    ):
        """Journey: Superadmin configures Mollie API key."""

        # Step 1: Save Mollie config
        config_response = await client.post(
            "/api/v1/payments/config",
            json={"api_key": "test_api_key_123"},
            headers=superadmin_auth_headers,
        )
        assert config_response.status_code == 200

        # Step 2: Get Mollie config
        get_config_response = await client.get(
            "/api/v1/payments/config",
            headers=superadmin_auth_headers,
        )
        assert get_config_response.status_code == 200

    async def test_manage_competition_prices(
        self, client: AsyncClient, superadmin_auth_headers: dict
    ):
        """Journey: Superadmin sets competition prices."""

        # Step 1: Create price
        price_response = await client.post(
            "/api/v1/payments/prices",
            json={
                "competitie_naam": "Wintercompetitie",
                "price_small_club": 15000,  # cents
                "price_large_club": 25000,
            },
            headers=superadmin_auth_headers,
        )
        assert price_response.status_code == 200

        # Step 2: List prices
        list_response = await client.get(
            "/api/v1/payments/prices",
            headers=superadmin_auth_headers,
        )
        assert list_response.status_code == 200
        data = list_response.json()
        prices = data.get("prices", [])
        assert any(p["competitie_naam"] == "Wintercompetitie" for p in prices)


class TestPaymentFailurePaths:
    """Negative-path tests for payment endpoints."""

    async def test_rejects_invalid_mollie_api_key_format(
        self, client: AsyncClient, superadmin_auth_headers: dict
    ):
        """Saving a Mollie key with an invalid prefix should fail."""
        response = await client.post(
            "/api/v1/payments/config",
            json={"api_key": "invalid_key"},
            headers=superadmin_auth_headers,
        )

        assert response.status_code == 400
        assert "Invalid API key format" in response.json()["detail"]

    async def test_create_payment_requires_active_mandate(
        self,
        client: AsyncClient,
        admin_auth_headers: dict,
        db_session: AsyncSession,
        club: Club,
    ):
        """Creating a payment should fail when no active mandate exists."""
        competitie = Competitie(
            club_id=club.id,
            naam="Lentecompetitie",
            speeldag="vrijdag",
            start_datum=date(2024, 1, 1),
            eind_datum=date(2024, 12, 31),
        )
        db_session.add(competitie)
        await db_session.commit()

        response = await client.post(
            "/api/v1/payments/payments",
            json={"competitie_naam": competitie.naam},
            params={"webhook_url": "https://example.com/webhook"},
            headers=admin_auth_headers,
        )

        assert response.status_code == 400
        assert response.json()["detail"] == "Active mandate required"

    async def test_get_club_mandate_for_other_club_forbidden(
        self,
        client: AsyncClient,
        admin_auth_headers: dict,
        db_session: AsyncSession,
    ):
        """Tenant users cannot request another club's mandate."""
        other_club = Club(
            naam="Andere Club",
            slug="andereclub",
            status="trial",
        )
        db_session.add(other_club)
        await db_session.commit()

        response = await client.get(
            f"/api/v1/payments/mandates/{other_club.id}",
            headers=admin_auth_headers,
        )

        assert response.status_code == 403
        assert response.json()["detail"] == "Access denied"

    async def test_checkout_status_without_mandate_returns_empty_payment_state(
        self,
        client: AsyncClient,
        admin_auth_headers: dict,
    ):
        """Checkout status reports no active mandate when none exists."""
        response = await client.get(
            "/api/v1/payments/checkout-status",
            headers=admin_auth_headers,
        )

        assert response.status_code == 200
        payload = response.json()
        assert payload["has_active_mandate"] is False
        assert payload["mandate_status"] is None
        assert payload["paid_competitions"] == []


class TestDisplayJourney:
    """Tests for public display functionality."""

    async def test_view_published_ronde_without_auth(self, client: AsyncClient, db_session):
        """Journey: Anyone with public token can view a published round."""
        from app.models import Club, Competitie, Speelronde

        club = Club(naam="Test Club", slug="testdisplay", status="trial")
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

        from app.services.tenant_auth import generate_public_token

        ronde = Speelronde(
            competitie_id=competitie.id,
            club_id=club.id,
            datum=date(2024, 11, 15),
            status="gepubliceerd",
            public_token=generate_public_token(),
        )
        db_session.add(ronde)
        await db_session.commit()

        # View ronde via public display endpoint
        display_response = await client.get(
            f"/api/v1/display/{club.slug}/{ronde.public_token}",
        )
        assert display_response.status_code == 200
        data = display_response.json()
        assert data["ronde"]["id"] == str(ronde.id)

    async def test_view_current_display_without_published_ronde_returns_empty_state(
        self, client: AsyncClient, db_session
    ):
        """Journey: Public current display endpoint returns 200 with empty state for new clubs."""
        from app.models import Club

        club = Club(naam="Nieuwe Club", slug="nieuwedisplay", status="trial")
        db_session.add(club)
        await db_session.commit()

        response = await client.get(f"/api/v1/display/{club.slug}/actueel")

        assert response.status_code == 200
        assert "x-frame-options" not in response.headers
        assert "frame-ancestors *" in response.headers["content-security-policy"]
        assert response.headers["cache-control"] == "no-cache"
        data = response.json()
        assert data["club"]["slug"] == club.slug
        assert data["ronde"] is None


class TestTenantSettingsJourney:
    """Tests for tenant branding and settings."""

    async def test_update_branding(self, client: AsyncClient, admin_auth_headers: dict):
        """Journey: Admin updates club branding."""

        # Step 1: Update branding
        branding_response = await client.patch(
            "/api/v1/tenant/branding",
            json={
                "primary_color": "#FF5733",
                "secondary_color": "#FFFFFF",
                "accent_color": "#FFC107",
                "font_choice": "roboto",
            },
            headers=admin_auth_headers,
        )
        assert branding_response.status_code == 200

        # Step 2: Get branding
        get_response = await client.get(
            "/api/v1/tenant/branding",
            headers=admin_auth_headers,
        )
        assert get_response.status_code == 200
        assert get_response.json()["primary_color"] == "#FF5733"

    async def test_club_admin_role_can_update_branding(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        club: Club,
    ):
        """Journey: User with club_admin role can update branding."""
        from app.models import User
        from app.services.auth import get_password_hash

        club_admin_user = User(
            club_id=club.id,
            email="clubadmin@testclub.nl",
            password_hash=get_password_hash("password123"),
            full_name="Club Admin",
            role="club_admin",
            is_active=True,
        )
        db_session.add(club_admin_user)
        await db_session.commit()

        login_response = await client.post(
            "/api/v1/tenant/login",
            data={"username": "clubadmin@testclub.nl", "password": "password123"},
            params={"slug": club.slug},
        )
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        branding_response = await client.patch(
            "/api/v1/tenant/branding",
            json={
                "primary_color": "#123456",
                "secondary_color": "#FFFFFF",
                "accent_color": "#ABCDEF",
                "font_choice": "roboto",
            },
            headers=headers,
        )
        assert branding_response.status_code == 200
        assert branding_response.json()["primary_color"] == "#123456"

    async def test_update_settings(self, client: AsyncClient, admin_auth_headers: dict):
        """Journey: Admin updates club settings."""

        # Step 1: Update settings
        settings_response = await client.patch(
            "/api/v1/tenant/settings",
            json={
                "naam": "My Tennis Club",
                "adres": "Tennisweg 1",
                "stad": "Utrecht",
                "telefoon": "06-12345678",
            },
            headers=admin_auth_headers,
        )
        assert settings_response.status_code == 200

        # Step 2: Get settings
        get_response = await client.get(
            "/api/v1/tenant/settings",
            headers=admin_auth_headers,
        )
        assert get_response.status_code == 200
        assert get_response.json()["naam"] == "My Tennis Club"

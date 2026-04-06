from app.routers.auth import router as auth
from app.routers.calendar import router as calendar
from app.routers.competities import router as competities
from app.routers.dagoverzicht import router as dagoverzicht
from app.routers.display import router as display
from app.routers.onboarding import router as onboarding
from app.routers.payments import router as payments
from app.routers.planning import router as planning
from app.routers.superadmin import router as superadmin
from app.routers.teams import router as teams
from app.routers.tenant import router as tenant
from app.routers.tenant_dashboard import router as tenant_dashboard
from app.routers.tenant_settings import router as tenant_settings
from app.routers.wedstrijden import router as wedstrijden

__all__ = [
    "auth",
    "calendar",
    "competities",
    "dagoverzicht",
    "display",
    "onboarding",
    "payments",
    "planning",
    "superadmin",
    "teams",
    "tenant",
    "tenant_dashboard",
    "tenant_settings",
    "wedstrijden",
]

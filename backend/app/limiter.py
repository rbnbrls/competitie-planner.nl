"""
File: backend/app/limiter.py
Last updated: 2026-05-01
API version: 0.1.0
Author: Ruben Barels <ruben@rabar.nl>
Changelog:
  - 2026-05-01: Initial metadata header added
"""

import os
from functools import lru_cache

from slowapi import Limiter
from slowapi.util import get_remote_address
from starlette.requests import Request


def get_real_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return get_remote_address(request)


INTERNAL_IPS = frozenset(
    [
        "127.0.0.1",
        "localhost",
        "::1",
    ]
)


def is_internal_ip(request: Request) -> bool:
    client_ip = get_real_ip(request)
    return client_ip in INTERNAL_IPS


_limiter = None


def create_limiter() -> Limiter:
    global _limiter
    if _limiter is None:
        enabled = not bool(os.getenv("TESTING"))
        _limiter = Limiter(key_func=get_real_ip, enabled=enabled)
    return _limiter


@lru_cache
def get_limiter() -> Limiter:
    return create_limiter()


limiter = get_limiter()


RATE_LIMITS = {
    "auth_login": "5/minute",
    "auth_register": "3/hour",
    "auth_password_reset": "10/hour",
    "data_read": "100/minute",
    "data_write": "30/minute",
    "data_bulk": "10/hour",
    "search": "20/minute",
    "default": "60/minute",
}


def get_rate_limit_key(request: Request) -> str:
    if is_internal_ip(request):
        return "unlimited"
    return "default"


def default_limits(request: Request) -> str:
    path = request.url.path

    if path.startswith("/api/auth/login"):
        return RATE_LIMITS["auth_login"]
    elif path.startswith("/api/auth/register"):
        return RATE_LIMITS["auth_register"]
    elif path.startswith("/api/auth/password"):
        return RATE_LIMITS["auth_password_reset"]
    elif "/search" in path:
        return RATE_LIMITS["search"]
    elif (
        path.startswith("/api/competities")
        or path.startswith("/api/wedstrijden")
        or path.startswith("/api/teams")
    ):
        if request.method in ["POST", "PUT", "DELETE", "PATCH"]:
            return RATE_LIMITS["data_write"]
        return RATE_LIMITS["data_read"]

    return RATE_LIMITS["default"]

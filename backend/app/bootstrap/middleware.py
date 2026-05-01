"""
File: backend/app/bootstrap/middleware.py
Last updated: 2026-05-01
API version: 0.1.0
Author: Ruben Barels <ruben@rabar.nl>
Changelog:
  - 2026-05-01: Initial metadata header added
  - 2026-05-01: Display endpoints get Cache-Control: no-cache instead of no-store
"""

from fastapi import Request
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.logging_config import get_logger
from app.middleware.logging import LoggingMiddleware
from app.middleware.request_size import RequestSizeMiddleware

logger = get_logger()


async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'"

    if request.url.path.startswith("/api/v1/display/"):
        if "X-Frame-Options" in response.headers:
            del response.headers["X-Frame-Options"]
        response.headers["Content-Security-Policy"] = "frame-ancestors *"

    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = (
        "accelerometer=(), camera=(), geolocation=(), gyroscope=(), "
        "magnetometer=(), microphone=(), payment=(), usb=()"
    )
    return response


async def caching_middleware(request: Request, call_next):
    response = await call_next(request)
    if request.method == "GET" and request.url.path.startswith("/api/v1"):
        if request.url.path.startswith("/api/v1/display/"):
            response.headers["Cache-Control"] = "no-cache"
        else:
            response.headers["Cache-Control"] = "no-store"
    return response


def configure_middleware(app) -> None:
    app.middleware("http")(add_security_headers)
    app.middleware("http")(caching_middleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(LoggingMiddleware)
    app.add_middleware(RequestSizeMiddleware)

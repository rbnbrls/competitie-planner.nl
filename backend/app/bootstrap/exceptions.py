"""
File: backend/app/bootstrap/exceptions.py
Last updated: 2026-05-01
API version: 0.1.0
Author: Ruben Barels <ruben@rabar.nl>
Changelog:
  - 2026-05-01: Initial metadata header added
"""

import logging
from datetime import datetime
from typing import Optional

import sentry_sdk
from fastapi import Request, status
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded

from app.config import settings
from app.exceptions import BaseAPIExceptionError, RateLimitError
from app.logging_config import get_logger

logger = get_logger()


def get_language_from_request(request: Request) -> str:
    accept_language = request.headers.get("Accept-Language", "")
    if accept_language.startswith("nl"):
        return "nl"
    return "nl"


def get_user_id_from_request(request: Request) -> Optional[str]:
    return getattr(request.state, "user_id", None)


def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded):
    retry_after = getattr(exc, "retry_after", 60)
    detail = getattr(
        exc, "detail", f"Te veel aanvragen. Probeer het over {retry_after} seconden opnieuw."
    )
    return JSONResponse(
        status_code=429,
        content={"detail": detail},
        headers={
            "Retry-After": str(retry_after),
            "X-RateLimit-Limit": "60",
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": str(int(retry_after)),
        },
    )


async def base_api_exception_handler(request: Request, exc: BaseAPIExceptionError):
    _ = get_language_from_request(request)
    user_id = get_user_id_from_request(request)
    log_level = logging.WARNING if 400 <= exc.status_code < 500 else logging.ERROR

    logger.log(
        log_level,
        "api_exception",
        exception_type=type(exc).__name__,
        error_code=exc.error_code,
        status_code=exc.status_code,
        user_id=user_id,
        path=request.url.path,
        method=request.method,
        field_info=exc.field_info if exc.field_info else None,
        context_data=exc.context_data if exc.context_data else None,
    )

    response = JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": exc.error_code,
                "message": exc.message,
                "details": exc.field_info,
                "timestamp": exc.timestamp,
            }
        },
    )
    if isinstance(exc, RateLimitError) and exc.retry_after:
        response.headers["Retry-After"] = str(exc.retry_after)

    return response


async def unexpected_exception_handler(request: Request, exc: Exception):
    _ = get_language_from_request(request)
    user_id = get_user_id_from_request(request)
    club_id = getattr(request.state, "club_id", None)

    logger.critical(
        "unexpected_exception",
        exception_type=type(exc).__name__,
        user_id=user_id,
        path=request.url.path,
        method=request.method,
        exc_info=True,
    )

    if settings.SENTRY_DSN:
        with sentry_sdk.new_scope() as scope:
            if user_id:
                scope.set_user({"id": str(user_id)})
            if club_id:
                scope.set_tag("club_id", str(club_id))
            scope.set_tag("path", request.url.path)
            sentry_sdk.capture_exception(exc)

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "Er is een interne fout opgetreden. Probeer het later opnieuw.",
                "details": {},
                "timestamp": datetime.utcnow().isoformat(),
            }
        },
    )


def register_exception_handlers(app) -> None:
    app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)
    app.add_exception_handler(BaseAPIExceptionError, base_api_exception_handler)
    app.add_exception_handler(Exception, unexpected_exception_handler)

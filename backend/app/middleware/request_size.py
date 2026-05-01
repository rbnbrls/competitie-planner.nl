"""
File: backend/app/middleware/request_size.py
Last updated: 2026-05-01
API version: 0.1.0
Author: Competitie-Planner Team
Changelog:
  - 2026-05-01: Initial implementation for BUG-8 payload size limit
"""

from fastapi import Request, status
from fastapi.responses import JSONResponse

from app.config import settings
from app.logging_config import get_logger

logger = get_logger()


class RequestSizeMiddleware:
    """Middleware that rejects requests exceeding the configured maximum body size.

    Checks the Content-Length header before the request body is read.
    Returns HTTP 413 Payload Too Large if the request exceeds MAX_REQUEST_SIZE.

    Note: This only checks Content-Length. Requests using chunked transfer
    encoding without a Content-Length header will pass through and be
    subject to body-size checks at the application/validation layer.
    """

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        request = Request(scope, receive, send)
        content_length = request.headers.get("content-length")

        if content_length is not None:
            try:
                body_size = int(content_length)
                max_size = settings.MAX_REQUEST_SIZE

                if body_size > max_size:
                    logger.warning(
                        "request_too_large",
                        content_length=body_size,
                        max_size=max_size,
                        path=request.url.path,
                        method=request.method,
                    )

                    response = JSONResponse(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        content={
                            "error": {
                                "code": "PAYLOAD_TOO_LARGE",
                                "message": f"Verzoek is te groot. Maximale grootte is {max_size / (1024 * 1024):.0f} MB.",
                                "details": {},
                            }
                        },
                    )
                    await response(scope, receive, send)
                    return

            except (ValueError, TypeError):
                # If Content-Length can't be parsed, let the request through
                # and let downstream validation handle it
                pass

        await self.app(scope, receive, send)

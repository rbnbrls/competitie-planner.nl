import time
import uuid

import structlog
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from app.logging_config import get_logger

logger = get_logger("http")


class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        structlog.contextvars.clear_contextvars()

        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        structlog.contextvars.bind_contextvars(
            request_id=request_id,
            method=request.method,
            path=request.url.path,
        )

        user_id = getattr(request.state, "user_id", None)
        club_id = getattr(request.state, "club_id", None)
        if user_id:
            structlog.contextvars.bind_contextvars(user_id=str(user_id))
        if club_id:
            structlog.contextvars.bind_contextvars(club_id=str(club_id))

        start_time = time.perf_counter()

        try:
            response: Response = await call_next(request)
            process_time = time.perf_counter() - start_time

            log_fn = logger.info
            if response.status_code >= 500:
                log_fn = logger.error
            elif response.status_code >= 400:
                log_fn = logger.warning

            log_fn(
                "http_request_finished",
                status_code=response.status_code,
                duration=round(process_time, 4),
            )

            response.headers["X-Request-ID"] = request_id
            return response

        except Exception as e:
            process_time = time.perf_counter() - start_time
            logger.error(
                "http_request_failed",
                exception=str(e),
                duration=round(process_time, 4),
            )
            raise e

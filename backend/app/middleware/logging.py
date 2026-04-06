import time
import uuid
import structlog
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from app.config import settings

logger = structlog.get_logger()

class LoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Clear/initialize context for each request
        structlog.contextvars.clear_contextvars()
        
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        structlog.contextvars.bind_contextvars(
            request_id=request_id,
            method=request.method,
            path=request.url.path,
        )

        start_time = time.perf_counter()
        
        try:
            response: Response = await call_next(request)
            process_time = time.perf_counter() - start_time
            
            # Use appropriate log level based on status code
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
            
            # Add request-id to response headers
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

import logging

import structlog
from structlog.types import EventDict

from app.config import settings


class JSONRenderer(structlog.processors.JSONRenderer):
    def __call__(
        self, wrapper: structlog.BoundLogger, method_name: str, event_dict: EventDict
    ) -> str:
        for key, value in list(event_dict.items()):
            if isinstance(value, (str, int, float, bool, type(None))):
                continue
            try:
                event_dict[key] = str(value)
            except Exception:
                event_dict[key] = f"<unrepresentable: {type(value).__name__}>"
        return super().__call__(wrapper, method_name, event_dict)


def add_app_context(
    wrapper: structlog.BoundLogger, method_name: str, event_dict: EventDict
) -> EventDict:
    event_dict.setdefault("app", "competitie-planner")
    event_dict.setdefault("version", settings.VERSION)
    event_dict.setdefault("environment", settings.ENVIRONMENT)
    return event_dict


def setup_logging() -> None:
    is_production = settings.ENVIRONMENT.lower() == "production"
    is_development = settings.ENVIRONMENT.lower() == "development"

    processors = [
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.StackInfoRenderer(),
        structlog.dev.set_exc_info,
        structlog.processors.TimeStamper(fmt="iso"),
        add_app_context,
    ]

    if is_production:
        processors.append(JSONRenderer())
    else:
        processors.append(structlog.dev.ConsoleRenderer())

    log_level = logging.INFO
    if is_development:
        log_level = logging.DEBUG

    structlog.configure(
        processors=processors,
        logger_factory=structlog.PrintLoggerFactory(),
        wrapper_class=structlog.make_filtering_bound_logger(log_level),
        cache_logger_on_first_use=True,
    )


def get_logger(name: str | None = None) -> structlog.BoundLogger:
    logger = structlog.get_logger()
    if name:
        return logger.bind(component=name)
    return logger

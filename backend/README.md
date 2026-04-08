# Backend

FastAPI backend for Competitie-Planner.

## Setup

```bash
uv sync
cp .env.example .env
# Edit .env with your values
```

## Development

```bash
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Logging

De applicatie gebruikt [structlog](https://structlog.readthedocs.io/) voor gestructureerde logging.

### Conventies

- **JSON in productie**: In `production` environment wordt JSON output geproduceerd, in `development` een leesbare console output.
- **Log levels**: DEBUG voor development, INFO voor productie.
- **Component naming**: Gebruik `get_logger("component_naam")` om logs te taggen met de component.
- **Context variabelen**: De `LoggingMiddleware` voegt automatisch toe:
  - `request_id`: Unieke identifier per request (ook via `X-Request-ID` header)
  - `method`, `path`: HTTP methode en pad
  - `user_id`, `club_id`: Indien beschikbaar in request state

### Logging in services

```python
from app.logging_config import get_logger

logger = get_logger("planning")

# In functies
logger.info("planning_started", competitie_id=str(competitie_id))
logger.debug("fetching_data", club_id=str(club_id))
logger.warning("something_unexpected", detail="...")
logger.error("operation_failed", error=str(e))
```

### Environment variabelen

- `ENVIRONMENT`: `development`, `production` of `test`. Bepaalt log level en output format.

## Migrations

```bash
# Create migration
uv run alembic revision --autogenerate -m "create initial tables"

# Run migrations
uv run alembic upgrade head

# Downgrade
uv run alembic downgrade -1
```
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

## Migrations

```bash
# Create migration
uv run alembic revision --autogenerate -m "create initial tables"

# Run migrations
uv run alembic upgrade head

# Downgrade
uv run alembic downgrade -1
```
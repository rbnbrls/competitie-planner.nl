FROM python:3.12-slim
WORKDIR /app
RUN pip install uv
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --all-extras
COPY . .

RUN uv run pytest tests/ || true

EXPOSE 8000
CMD ["sh", "-c", "alembic upgrade head && uv run uvicorn app.main:app --host 0.0.0.0 --port 8000"]
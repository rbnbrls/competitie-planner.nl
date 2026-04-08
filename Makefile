.PHONY: help build up down logs logs-backend logs-frontend logs-db restart clean ps db-reset db-migrate db-create-migration

help:
	@echo "Competitie-Planner Development Commands"
	@echo ""
	@echo "  make build          Build all containers"
	@echo "  make up             Start all services"
	@echo "  make down           Stop all services"
	@echo "  make restart        Restart all services"
	@echo "  make logs           View all logs"
	@echo "  make logs-backend   View backend logs"
	@echo "  make logs-frontend  View frontend logs"
	@echo "  make logs-db        View database logs"
	@echo "  make ps             Show running containers"
	@echo "  make clean          Stop and remove containers and volumes"
	@echo "  make db-reset       Reset database (WARNING: deletes all data)"
	@echo "  make db-migrate     Run database migrations"
	@echo "  make db-create-migration  Create new migration"

build:
	docker compose build

up:
	docker compose up -d

down:
	docker compose down

restart:
	docker compose restart

logs:
	docker compose logs -f

logs-backend:
	docker compose logs -f backend

logs-frontend:
	docker compose logs -f frontend

logs-db:
	docker compose logs -f db

ps:
	docker compose ps

clean:
	docker compose down -v

db-reset:
	@echo "WARNING: This will delete all database data!"
	docker compose down -v
	docker compose up -d
	@echo "Database reset complete"

db-migrate:
	docker compose exec backend uv run alembic upgrade head

db-create-migration:
	docker compose exec backend uv run alembic revision --autogenerate -m "$(NAME)"

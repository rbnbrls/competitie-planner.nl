#!/usr/bin/env python3
import argparse
import asyncio
import json
import os
import subprocess
import sys
import time
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
BACKEND_DIR = ROOT_DIR / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from sqlalchemy import delete, func, select  # noqa: E402
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine  # noqa: E402

from app.config import settings  # noqa: E402
from app.models import (  # noqa: E402
    Club,
    CompetitionPrice,
    MollieConfig,
    Payment,
    SepaMandate,
    User,
)


def ensure_local_environment() -> None:
    environment = (os.getenv("ENVIRONMENT") or settings.ENVIRONMENT or "").lower()
    database_url = settings.DATABASE_URL.lower()

    local_markers = ("localhost", "127.0.0.1", "@db:")
    is_local_database = any(marker in database_url for marker in local_markers)

    if environment == "production":
        raise RuntimeError("Refusing to reset database in production environment.")

    if not is_local_database:
        raise RuntimeError("Refusing to reset a non-local database URL.")


async def reset_database() -> dict[str, int]:
    engine = create_async_engine(settings.DATABASE_URL, pool_pre_ping=True)
    session_maker = async_sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )

    async with session_maker() as session:
        superadmin_count = await session.scalar(
            select(func.count(User.id)).where(User.is_superadmin.is_(True))
        )

        await session.execute(delete(Payment))
        await session.execute(delete(SepaMandate))
        await session.execute(delete(CompetitionPrice))
        await session.execute(delete(MollieConfig))

        deleted_users_result = await session.execute(
            delete(User).where(User.is_superadmin.is_(False))
        )
        deleted_clubs_result = await session.execute(delete(Club))

        await session.commit()

        deleted_users = deleted_users_result.rowcount or 0
        deleted_clubs = deleted_clubs_result.rowcount or 0

    await engine.dispose()

    return {
        "deleted_clubs": deleted_clubs,
        "deleted_non_superadmin_users": deleted_users,
        "remaining_superadmins": int(superadmin_count or 0),
    }


def run_command(command: list[str], *, timeout: int = 180) -> None:
    completed = subprocess.run(
        command,
        cwd=ROOT_DIR,
        text=True,
        capture_output=True,
        timeout=timeout,
        check=False,
    )

    if completed.returncode != 0:
        stderr = (completed.stderr or "").strip()
        stdout = (completed.stdout or "").strip()
        output = stderr or stdout or "Unknown command error"
        raise RuntimeError(f"Command failed ({' '.join(command)}): {output}")


def compose_command(*parts: str) -> list[str]:
    return ["docker", "compose", *parts]


def rebuild_docker_environment(
    *,
    build_images: bool,
    run_migrations: bool,
    migration_wait_seconds: int,
) -> dict[str, object]:
    run_command(compose_command("down", "-v", "--remove-orphans"), timeout=300)

    if build_images:
        run_command(compose_command("build"), timeout=900)

    run_command(compose_command("up", "-d"), timeout=300)

    migration_attempts = 0
    if run_migrations:
        deadline = time.time() + migration_wait_seconds
        last_error: str | None = None

        while time.time() < deadline:
            migration_attempts += 1
            try:
                run_command(
                    compose_command(
                        "exec",
                        "-T",
                        "backend",
                        "uv",
                        "run",
                        "alembic",
                        "upgrade",
                        "head",
                    ),
                    timeout=180,
                )
                last_error = None
                break
            except RuntimeError as exc:
                last_error = str(exc)
                time.sleep(3)

        if last_error:
            raise RuntimeError(
                "Docker containers were recreated but migrations failed. "
                f"Last error: {last_error}"
            )

    return {
        "docker_recreated": True,
        "images_rebuilt": build_images,
        "migrations_ran": run_migrations,
        "migration_attempts": migration_attempts,
    }


async def _run_and_print(args: argparse.Namespace) -> int:
    try:
        ensure_local_environment()

        if args.mode == "fresh-docker":
            result = rebuild_docker_environment(
                build_images=not args.skip_build,
                run_migrations=not args.skip_migrate,
                migration_wait_seconds=args.migration_wait_seconds,
            )
            payload = {
                "ok": True,
                "mode": args.mode,
                "message": (
                    "Fresh Docker environment created. All volumes were removed and "
                    "containers were rebuilt."
                ),
                **result,
            }
        else:
            result = await reset_database()
            payload = {
                "ok": True,
                "mode": args.mode,
                "message": "Local database reset completed. Ready for onboarding tests.",
                **result,
            }
    except Exception as exc:
        payload = {
            "ok": False,
            "mode": args.mode,
            "message": str(exc),
        }

    if args.json:
        print(json.dumps(payload))
    else:
        if payload["ok"]:
            print(payload["message"])
            if args.mode == "fresh-docker":
                print(f"Docker recreated: {payload['docker_recreated']}")
                print(f"Images rebuilt: {payload['images_rebuilt']}")
                print(f"Migrations ran: {payload['migrations_ran']}")
                print(f"Migration attempts: {payload['migration_attempts']}")
            else:
                print(f"Deleted clubs: {payload['deleted_clubs']}")
                print(
                    f"Deleted non-superadmin users: {payload['deleted_non_superadmin_users']}"
                )
                print(f"Remaining superadmins: {payload['remaining_superadmins']}")
        else:
            print(f"Error: {payload['message']}", file=sys.stderr)

    return 0 if payload["ok"] else 1


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Reset local Competitie Planner state for onboarding testing."
    )
    parser.add_argument(
        "--mode",
        choices=["database", "fresh-docker"],
        default="database",
        help=(
            "database: delete tenant data from existing local DB; "
            "fresh-docker: destroy volumes and recreate Docker containers."
        ),
    )
    parser.add_argument(
        "--yes",
        action="store_true",
        help="Confirm destructive reset without interactive prompt.",
    )
    parser.add_argument(
        "--skip-build",
        action="store_true",
        help="When using --mode fresh-docker: skip docker image build.",
    )
    parser.add_argument(
        "--skip-migrate",
        action="store_true",
        help="When using --mode fresh-docker: skip alembic migration command.",
    )
    parser.add_argument(
        "--migration-wait-seconds",
        type=int,
        default=90,
        help="How long to wait for backend startup before migration retries fail.",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Return machine-readable JSON output.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    if not args.yes:
        if args.mode == "fresh-docker":
            prompt = (
                "This will run 'docker compose down -v --remove-orphans' and remove all "
                "database/redis data. Continue? [y/N]: "
            )
        else:
            prompt = (
                "This will delete all clubs and non-superadmin users in the local "
                "database. Continue? [y/N]: "
            )

        response = input(prompt).strip().lower()
        if response not in {"y", "yes"}:
            print("Cancelled.")
            return 1

    return asyncio.run(_run_and_print(args))


if __name__ == "__main__":
    raise SystemExit(main())

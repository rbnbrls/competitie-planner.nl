"""
File: backend/app/cli/superadmin.py
Last updated: 2026-05-01
API version: 0.1.0
Author: Ruben Barels <ruben@rabar.nl>
Changelog:
  - 2026-05-01: Initial metadata header added
"""

import argparse
import asyncio
import sys
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.models import User
from app.services.auth import get_password_hash


async def create_superadmin(email: str, password: str, database_url: str) -> None:
    engine = create_async_engine(database_url, echo=False)
    async_session_maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session_maker() as session:
        result = await session.execute(select(User).where(User.is_superadmin))
        existing_superadmin = result.scalar_one_or_none()

        if existing_superadmin:
            print("Error: A superadmin already exists.", file=sys.stderr)
            sys.exit(1)

        user = User(
            id=uuid4(),
            email=email,
            password_hash=get_password_hash(password),
            full_name="Superadmin",
            role="superadmin",
            is_superadmin=True,
            is_active=True,
        )
        session.add(user)
        await session.commit()

        print(f"Superadmin created successfully: {email}")


async def update_password(email: str, password: str, database_url: str) -> None:
    engine = create_async_engine(database_url, echo=False)
    async_session_maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session_maker() as session:
        result = await session.execute(select(User).where(User.email == email, User.is_superadmin))
        superadmin = result.scalar_one_or_none()

        if not superadmin:
            print(f"Error: No superadmin found with email {email}", file=sys.stderr)
            sys.exit(1)

        superadmin.password_hash = get_password_hash(password)
        await session.commit()

        print(f"Password updated successfully for: {email}")


def main():
    parser = argparse.ArgumentParser(description="Superadmin management")
    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    create_parser = subparsers.add_parser("create", help="Create superadmin user")
    create_parser.add_argument("--email", required=True, help="Superadmin email")
    create_parser.add_argument("--password", required=True, help="Superadmin password")
    create_parser.add_argument(
        "--database-url",
        default="postgresql+asyncpg://user:pass@localhost:5432/competitieplanner",
        help="Database URL",
    )

    update_parser = subparsers.add_parser("update-password", help="Update superadmin password")
    update_parser.add_argument("--email", required=True, help="Superadmin email")
    update_parser.add_argument("--password", required=True, help="New password")
    update_parser.add_argument(
        "--database-url",
        default="postgresql+asyncpg://user:pass@localhost:5432/competitieplanner",
        help="Database URL",
    )

    args = parser.parse_args()

    if args.command == "create":
        asyncio.run(create_superadmin(args.email, args.password, args.database_url))
    elif args.command == "update-password":
        asyncio.run(update_password(args.email, args.password, args.database_url))
    else:
        parser.print_help()


if __name__ == "__main__":
    main()

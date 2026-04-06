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


def main():
    parser = argparse.ArgumentParser(description="Create superadmin user")
    parser.add_argument("--email", required=True, help="Superadmin email")
    parser.add_argument("--password", required=True, help="Superadmin password")
    parser.add_argument(
        "--database-url",
        default="postgresql+asyncpg://user:pass@localhost:5432/competitieplanner",
        help="Database URL",
    )
    args = parser.parse_args()

    asyncio.run(create_superadmin(args.email, args.password, args.database_url))


if __name__ == "__main__":
    main()

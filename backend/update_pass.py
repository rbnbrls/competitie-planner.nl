"""
File: backend/update_pass.py
Last updated: 2026-05-01
API version: 0.1.0
Author: Ruben Barels <ruben@rabar.nl>
Changelog:
  - 2026-05-01: Initial metadata header added
"""

import asyncio

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.models import User
from app.services.auth import get_password_hash


async def update_superadmin_password(email: str, password: str, database_url: str):
    engine = create_async_engine(database_url, echo=False)
    async_session_maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session_maker() as session:
        result = await session.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        if user:
            user.password_hash = get_password_hash(password)
            user.is_superadmin = True
            await session.commit()
            print(f"Updated password for {email} success")
        else:
            print(f"User {email} not found")

if __name__ == "__main__":
    db_url = "postgresql+asyncpg://cpuser:cpdevpass@db:5432/competitieplanner"
    asyncio.run(update_superadmin_password("user@meppers.nl", "admin", db_url))

"""
File: backend/list_users.py
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


async def list_users(database_url: str):
    engine = create_async_engine(database_url, echo=False)
    async_session_maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session_maker() as session:
        result = await session.execute(select(User))
        users = result.scalars().all()
        for u in users:
            print(f"Email: {u.email}, Superadmin: {u.is_superadmin}")

if __name__ == "__main__":
    db_url = "postgresql+asyncpg://cpuser:cpdevpass@db:5432/competitieplanner"
    asyncio.run(list_users(db_url))

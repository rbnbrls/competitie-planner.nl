"""
File: backend/list_superadmins.py
Last updated: 2026-05-01
API version: 0.1.0
Author: Ruben Barels <ruben@rabar.nl>
Changelog:
  - 2026-05-01: Initial metadata header added
"""

import asyncio

from sqlalchemy import select

from app.db import async_session_maker
from app.models import User


async def run():
    async with async_session_maker() as s:
        res = await s.execute(select(User).where(User.is_superadmin))
        users = res.scalars().all()
        for u in users:
            print(f"Email: {u.email}, Role: {u.role}, IsSuperadmin: {u.is_superadmin}")

if __name__ == "__main__":
    asyncio.run(run())

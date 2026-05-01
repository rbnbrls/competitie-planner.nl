"""
File: backend/app/cache.py
Last updated: 2026-05-01
API version: 0.1.0
Author: Ruben Barels <ruben@rabar.nl>
Changelog:
  - 2026-05-01: Initial metadata header added
"""

import hashlib
import json
from typing import Any, Optional

import redis.asyncio as redis
import structlog

from app.config import settings

logger = structlog.get_logger()


class CacheService:
    def __init__(self):
        self._client: Optional[redis.Redis] = None

    async def get_client(self) -> redis.Redis:
        if self._client is None:
            self._client = redis.from_url(
                settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=True,
            )
        return self._client

    async def close(self):
        if self._client:
            await self._client.close()
            self._client = None

    async def get(self, key: str) -> Optional[str]:
        try:
            client = await self.get_client()
            return await client.get(key)
        except Exception as e:
            logger.warning("cache_get_error", key=key, error=str(e))
            return None

    async def set(
        self,
        key: str,
        value: Any,
        ttl: Optional[int] = None,
    ) -> bool:
        try:
            client = await self.get_client()
            if ttl is None:
                ttl = settings.CACHE_TTL_SECONDS
            serialized = json.dumps(value) if not isinstance(value, str) else value
            await client.setex(key, ttl, serialized)
            return True
        except Exception as e:
            logger.warning("cache_set_error", key=key, error=str(e))
            return False

    async def delete(self, key: str) -> bool:
        try:
            client = await self.get_client()
            await client.delete(key)
            return True
        except Exception as e:
            logger.warning("cache_delete_error", key=key, error=str(e))
            return False

    async def delete_pattern(self, pattern: str) -> int:
        try:
            client = await self.get_client()
            keys = []
            async for key in client.scan_iter(match=pattern):
                keys.append(key)
            if keys:
                return await client.delete(*keys)
            return 0
        except Exception as e:
            logger.warning("cache_delete_pattern_error", pattern=pattern, error=str(e))
            return 0

    @staticmethod
    def make_key(prefix: str, *args) -> str:
        parts = [prefix]
        for arg in args:
            if isinstance(arg, dict):
                arg_str = json.dumps(arg, sort_keys=True)
                arg_hash = hashlib.md5(arg_str.encode()).hexdigest()[:8]
                parts.append(arg_hash)
            else:
                parts.append(str(arg))
        return ":".join(parts)


cache = CacheService()

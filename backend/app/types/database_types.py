from typing import Protocol, TypeVar, runtime_checkable
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

# Database session type
DatabaseSession = AsyncSession

# Generic model type for database operations
ModelType = TypeVar("ModelType")


@runtime_checkable
class HasID(Protocol):
    """Protocol for objects that have an ID field."""

    id: UUID


@runtime_checkable
class HasTimestamps(Protocol):
    """Protocol for objects that have created_at and updated_at fields."""

    created_at: str  # ISO datetime string
    updated_at: str  # ISO datetime string


# Database operation result types
class DatabaseResult(Protocol):
    """Protocol for database operation results."""

    success: bool
    data: object | None
    error: str | None


# Query filter types
class QueryFilter:
    """Base class for database query filters."""

    def apply(self, query):
        """Apply this filter to a SQLAlchemy query."""
        raise NotImplementedError


class EqualityFilter(QueryFilter):
    """Filter for equality checks."""

    def __init__(self, field: str, value: object):
        self.field = field
        self.value = value

    def apply(self, query):
        return query.where(
            getattr(query.column_descriptions[0]["entity"], self.field) == self.value
        )


class RangeFilter(QueryFilter):
    """Filter for range checks."""

    def __init__(self, field: str, min_value: object = None, max_value: object = None):
        self.field = field
        self.min_value = min_value
        self.max_value = max_value

    def apply(self, query):
        column = getattr(query.column_descriptions[0]["entity"], self.field)
        if self.min_value is not None:
            query = query.where(column >= self.min_value)
        if self.max_value is not None:
            query = query.where(column <= self.max_value)
        return query

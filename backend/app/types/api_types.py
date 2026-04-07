from typing import TypeVar, Generic, Optional, Dict, Any
from uuid import UUID

from pydantic import BaseModel

# Generic response types
T = TypeVar("T")


class APIResponse(BaseModel, Generic[T]):
    success: bool = True
    data: Optional[T] = None
    message: Optional[str] = None
    errors: Optional[list[str]] = None


class PaginatedAPIResponse(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    size: int
    pages: int


# Common filter and sort types
class FilterParams(BaseModel):
    search: Optional[str] = None
    status: Optional[str] = None
    date_from: Optional[str] = None
    date_to: Optional[str] = None


class SortParams(BaseModel):
    field: str
    direction: str = "asc"  # "asc" or "desc"


# Error response types
class ErrorDetail(BaseModel):
    field: str
    message: str
    code: Optional[str] = None


class ValidationErrorResponse(BaseModel):
    success: bool = False
    message: str = "Validation failed"
    errors: list[ErrorDetail]


class NotFoundResponse(BaseModel):
    success: bool = False
    message: str = "Resource not found"
    resource_type: str
    resource_id: Optional[str] = None

from typing import TypeVar

from pydantic import BaseModel
from pydantic.generics import GenericModel

# Generic response types
T = TypeVar("T")


class APIResponse(GenericModel[T]):
    success: bool = True
    data: T | None = None
    message: str | None = None
    errors: list[str] | None = None


class PaginatedAPIResponse(GenericModel[T]):
    items: list[T]
    total: int
    page: int
    size: int
    pages: int


# Common filter and sort types
class FilterParams(BaseModel):
    search: str | None = None
    status: str | None = None
    date_from: str | None = None
    date_to: str | None = None


class SortParams(BaseModel):
    field: str
    direction: str = "asc"  # "asc" or "desc"


# Error response types
class ErrorDetail(BaseModel):
    field: str
    message: str
    code: str | None = None


class ValidationErrorResponse(BaseModel):
    success: bool = False
    message: str = "Validation failed"
    errors: list[ErrorDetail]


class NotFoundResponse(BaseModel):
    success: bool = False
    message: str = "Resource not found"
    resource_type: str
    resource_id: str | None = None

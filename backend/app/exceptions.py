from typing import Any
from datetime import datetime
from fastapi import status

type DictOrNone = dict[str, Any] | None


class BaseAPIExceptionError(Exception):
    """Base exception class for all API errors."""

    def __init__(
        self,
        status_code: int,
        error_code: str,
        message: str,
        field_info: DictOrNone = None,
        context_data: DictOrNone = None,
    ):
        self.status_code = status_code
        self.error_code = error_code
        self.message = message
        self.field_info = field_info or {}
        self.context_data = context_data or {}
        self.timestamp = datetime.utcnow().isoformat()
        super().__init__(self.message)


class ValidationError(BaseAPIExceptionError):
    """Exception for input validation errors with field-specific information."""

    def __init__(
        self,
        message: str = "Validatie fout",
        field_info: DictOrNone = None,
        context_data: DictOrNone = None,
    ):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            error_code="VALIDATION_ERROR",
            message=message,
            field_info=field_info,
            context_data=context_data,
        )


class AuthenticationError(BaseAPIExceptionError):
    """Exception for authentication problems."""

    def __init__(
        self,
        message: str = "Authenticatie vereist",
        context_data: DictOrNone = None,
    ):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            error_code="AUTHENTICATION_ERROR",
            message=message,
            context_data=context_data,
        )


class AuthorizationError(BaseAPIExceptionError):
    """Exception for authorization/permission issues."""

    def __init__(
        self,
        message: str = "Onvoldoende rechten",
        context_data: DictOrNone = None,
    ):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            error_code="AUTHORIZATION_ERROR",
            message=message,
            context_data=context_data,
        )


class ResourceNotFoundError(BaseAPIExceptionError):
    """Exception for missing resources."""

    def __init__(
        self,
        message: str = "Resource niet gevonden",
        context_data: DictOrNone = None,
    ):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            error_code="RESOURCE_NOT_FOUND",
            message=message,
            context_data=context_data,
        )


class ConflictError(BaseAPIExceptionError):
    """Exception for duplicate entries and state conflicts."""

    def __init__(
        self,
        message: str = "Conflict met bestaande data",
        context_data: DictOrNone = None,
    ):
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            error_code="CONFLICT_ERROR",
            message=message,
            context_data=context_data,
        )


class RateLimitError(BaseAPIExceptionError):
    """Exception for rate limiting scenarios."""

    def __init__(
        self,
        message: str = "Te veel aanvragen",
        retry_after: int | None = None,
        context_data: DictOrNone = None,
    ):
        if retry_after:
            message = f"{message}. Probeer het over {retry_after} seconden opnieuw."
        super().__init__(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            error_code="RATE_LIMIT_ERROR",
            message=message,
            context_data=context_data or {},
        )
        self.retry_after = retry_after


class ExternalServiceError(BaseAPIExceptionError):
    """Exception for upstream service failures."""

    def __init__(
        self,
        message: str = "Externe service fout",
        context_data: DictOrNone = None,
    ):
        super().__init__(
            status_code=status.HTTP_502_BAD_GATEWAY,
            error_code="EXTERNAL_SERVICE_ERROR",
            message=message,
            context_data=context_data,
        )

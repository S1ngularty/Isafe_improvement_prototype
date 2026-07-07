from pydantic import BaseModel
from typing import Generic, TypeVar

T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    data: list[T]
    page: int
    limit: int
    total: int
    total_pages: int
    has_next: bool
    has_prev: bool

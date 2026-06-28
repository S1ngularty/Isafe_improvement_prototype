import re
from pydantic import BaseModel, Field, field_validator

DESC_REGEX = re.compile(r"^[a-zA-Z0-9\s\-.,!?'\"():;\nñÑ]+$")


class TcwsCreate(BaseModel):
    signal_level: int = Field(..., ge=1, le=5)
    description: str = Field(default="", max_length=1000)
    wind_speed: str = Field(..., min_length=2, max_length=100)

    @field_validator("description")
    @classmethod
    def validate_description(cls, v: str) -> str:
        if v and not DESC_REGEX.match(v):
            raise ValueError("Description contains invalid characters")
        return v.strip()


class TcwsUpdate(BaseModel):
    signal_level: int | None = Field(default=None, ge=1, le=5)
    description: str | None = Field(default=None, max_length=1000)
    wind_speed: str | None = Field(default=None, max_length=100)
    is_active: bool | None = None

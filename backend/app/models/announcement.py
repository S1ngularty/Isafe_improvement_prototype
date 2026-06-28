import re
from pydantic import BaseModel, Field, field_validator

TITLE_REGEX = re.compile(r"^[a-zA-Z0-9\s\-.,!?'\"():;ñÑ]+$")
DESC_REGEX = re.compile(r"^[a-zA-Z0-9\s\-.,!?'\"():;\nñÑ]+$")
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
ALLOWED_VIDEO_TYPES = {"video/mp4", "video/webm"}
MAX_IMAGE_BYTES = 10 * 1024 * 1024
MAX_VIDEO_BYTES = 50 * 1024 * 1024


class AnnouncementCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=100)
    short_description: str = Field(..., min_length=10, max_length=200)
    long_description: str | None = Field(default=None, max_length=2000)

    @field_validator("title")
    @classmethod
    def validate_title(cls, v: str) -> str:
        if not TITLE_REGEX.match(v):
            raise ValueError("Title contains invalid characters")
        return v.strip()

    @field_validator("short_description")
    @classmethod
    def validate_short_description(cls, v: str) -> str:
        if not DESC_REGEX.match(v):
            raise ValueError("Short description contains invalid characters")
        return v.strip()

    @field_validator("long_description")
    @classmethod
    def validate_long_description(cls, v: str | None) -> str | None:
        if v is None or v == "":
            return None
        if not DESC_REGEX.match(v):
            raise ValueError("Long description contains invalid characters")
        return v.strip()


class AnnouncementUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=3, max_length=100)
    short_description: str | None = Field(default=None, min_length=10, max_length=200)
    long_description: str | None = Field(default=None, max_length=2000)
    image_url: str | None = Field(default=None, max_length=2000)
    is_active: bool | None = None

    @field_validator("title")
    @classmethod
    def validate_title(cls, v: str | None) -> str | None:
        if v is None:
            return v
        if not TITLE_REGEX.match(v):
            raise ValueError("Title contains invalid characters")
        return v.strip()

    @field_validator("short_description")
    @classmethod
    def validate_short_description(cls, v: str | None) -> str | None:
        if v is None:
            return v
        if not DESC_REGEX.match(v):
            raise ValueError("Short description contains invalid characters")
        return v.strip()

    @field_validator("long_description")
    @classmethod
    def validate_long_description(cls, v: str | None) -> str | None:
        if v is None or v == "":
            return v
        if not DESC_REGEX.match(v):
            raise ValueError("Long description contains invalid characters")
        return v.strip()

    @field_validator("image_url")
    @classmethod
    def validate_image_url(cls, v: str | None) -> str | None:
        if v is None or v == "":
            return v
        if not v.startswith(("https://", "http://")):
            raise ValueError("Image URL must be a valid HTTP/HTTPS URL")
        return v.strip()

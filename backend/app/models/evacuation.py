from pydantic import BaseModel, Field, field_validator
from typing import Optional


class EvacuationAreaCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    capacity: Optional[int] = Field(None, ge=0)
    status: str = Field("active", pattern=r"^(active|inactive|maintenance)$")
    landmark_url: Optional[str] = Field(None, max_length=2000)

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        return v.strip()

    @field_validator("landmark_url")
    @classmethod
    def validate_landmark_url(cls, v: Optional[str]) -> Optional[str]:
        if v is None or v == "":
            return None
        if not v.startswith(("https://", "http://")):
            raise ValueError("Landmark URL must be a valid HTTP/HTTPS URL")
        return v.strip()


class EvacuationAreaUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)
    capacity: Optional[int] = Field(None, ge=0)
    status: Optional[str] = Field(None, pattern=r"^(active|inactive|maintenance)$")
    landmark_url: Optional[str] = Field(None, max_length=2000)

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        return v.strip()

    @field_validator("landmark_url")
    @classmethod
    def validate_landmark_url(cls, v: Optional[str]) -> Optional[str]:
        if v is None or v == "":
            return None
        if not v.startswith(("https://", "http://")):
            raise ValueError("Landmark URL must be a valid HTTP/HTTPS URL")
        return v.strip()

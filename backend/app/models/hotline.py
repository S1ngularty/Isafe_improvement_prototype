from pydantic import BaseModel, Field, field_validator
from typing import Optional


class PhoneNumberCreate(BaseModel):
    type: Optional[str] = None
    number: str = Field(..., min_length=1)
    sort_order: int = 0


class HotlineCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    email: Optional[str] = Field(None, max_length=320)
    website: Optional[str] = Field(None, max_length=2000)
    category: str = Field("general", pattern=r"^(general|police|fire|medical|rescue)$")
    is_active: bool = True
    sort_order: int = 0

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        return v.strip()

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: Optional[str]) -> Optional[str]:
        if v is None or v == "":
            return None
        return v.strip()

    @field_validator("website")
    @classmethod
    def validate_website(cls, v: Optional[str]) -> Optional[str]:
        if v is None or v == "":
            return None
        return v.strip()


class HotlineUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    email: Optional[str] = Field(None, max_length=320)
    website: Optional[str] = Field(None, max_length=2000)
    category: Optional[str] = Field(None, pattern=r"^(general|police|fire|medical|rescue)$")
    is_active: Optional[bool] = None
    sort_order: Optional[int] = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        return v.strip()

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: Optional[str]) -> Optional[str]:
        if v is None or v == "":
            return None
        return v.strip()

    @field_validator("website")
    @classmethod
    def validate_website(cls, v: Optional[str]) -> Optional[str]:
        if v is None or v == "":
            return None
        return v.strip()

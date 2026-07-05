from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class StatusUpdateRequest(BaseModel):
    status: str
    resolution_note: Optional[str] = None


class UserStatusItem(BaseModel):
    id: str
    full_name: Optional[str] = None
    email: Optional[str] = None
    status: str
    family_role: Optional[str] = None
    family_name: Optional[str] = None
    barangay: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    last_seen_at: Optional[datetime] = None
    avatar_url: Optional[str] = None


class StatusOverview(BaseModel):
    total: int
    safe: int
    help: int
    emergency: int


class StatusUsersResponse(BaseModel):
    users: list[UserStatusItem]
    total: int


class StatusHistoryItem(BaseModel):
    id: str
    previous_status: Optional[str] = None
    new_status: str
    lat: Optional[float] = None
    lng: Optional[float] = None
    resolution_note: Optional[str] = None
    resolved_by: Optional[str] = None
    created_at: datetime


class StatusHistoryResponse(BaseModel):
    items: list[StatusHistoryItem]
    total: int


class UserProfileDetail(BaseModel):
    id: str
    full_name: Optional[str] = None
    email: Optional[str] = None
    status: str
    family_role: Optional[str] = None
    family_name: Optional[str] = None
    barangay: Optional[str] = None
    street_address: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    last_seen_at: Optional[datetime] = None
    avatar_url: Optional[str] = None
    phone_number: Optional[str] = None
    blood_type: Optional[str] = None
    medical_notes: Optional[str] = None
    special_needs: Optional[str] = None
    special_needs_other: Optional[str] = None
    gender: Optional[str] = None
    date_of_birth: Optional[str] = None
    household_size: Optional[int] = None
    external_name: Optional[str] = None
    external_phone: Optional[str] = None
    relationship: Optional[str] = None

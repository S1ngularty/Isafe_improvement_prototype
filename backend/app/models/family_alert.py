from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class FamilyMemberStatus(BaseModel):
    id: str
    full_name: Optional[str] = None
    status: str
    family_role: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    last_seen_at: Optional[datetime] = None


class CurrentFamilyStatus(BaseModel):
    family_id: Optional[str] = None
    family_name: Optional[str] = None
    members: list[FamilyMemberStatus]


class StatusHistoryItem(BaseModel):
    id: str
    user_id: str
    full_name: Optional[str] = None
    previous_status: Optional[str] = None
    new_status: str
    lat: Optional[float] = None
    lng: Optional[float] = None
    created_at: datetime


class StatusHistoryResponse(BaseModel):
    items: list[StatusHistoryItem]
    total: int
    period: int

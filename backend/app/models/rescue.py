from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class InNeedUserItem(BaseModel):
    id: str
    full_name: Optional[str] = None
    status: str
    barangay: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    last_seen_at: Optional[datetime] = None
    blood_type: Optional[str] = None
    medical_notes: Optional[str] = None
    special_needs: Optional[str] = None
    household_size: Optional[int] = None
    distance_km: Optional[float] = None


class InNeedResponse(BaseModel):
    users: list[InNeedUserItem]
    total: int


class RescuerProfile(BaseModel):
    id: str
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone_number: Optional[str] = None
    barangay: Optional[str] = None
    avatar_url: Optional[str] = None
    organization: Optional[str] = None
    rescuer_type: str = "general"
    availability: str = "off_duty"
    certification: Optional[str] = None
    contact_number: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None


class RescuerProfileUpdate(BaseModel):
    organization: Optional[str] = None
    rescuer_type: Optional[str] = None
    availability: Optional[str] = None
    certification: Optional[str] = None
    contact_number: Optional[str] = None
    full_name: Optional[str] = None
    phone_number: Optional[str] = None
    barangay: Optional[str] = None
    avatar_url: Optional[str] = None


class ClaimAssignmentRequest(BaseModel):
    target_user_id: str
    lat: Optional[float] = None
    lng: Optional[float] = None


class UpdateAssignmentRequest(BaseModel):
    state: Optional[str] = None
    aid_type: Optional[str] = None
    notes: Optional[str] = None
    resolution_note: Optional[str] = None
    rescuer_lat: Optional[float] = None
    rescuer_lng: Optional[float] = None


class AssignmentItem(BaseModel):
    id: str
    rescuer_id: str
    target_user_id: str
    status_history_id: Optional[str] = None
    state: str
    aid_type: Optional[str] = None
    notes: Optional[str] = None
    rescuer_lat: Optional[float] = None
    rescuer_lng: Optional[float] = None
    last_position_at: Optional[datetime] = None
    eta_seconds: Optional[int] = None
    distance_meters: Optional[float] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    target_user: Optional[InNeedUserItem] = None
    rescuer: Optional[RescuerProfile] = None


class AssignmentResponse(BaseModel):
    data: list[AssignmentItem]
    total: int


class CreateAssignmentResponse(BaseModel):
    id: str
    state: str
    message: str

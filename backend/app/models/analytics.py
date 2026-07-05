from pydantic import BaseModel
from typing import Optional
from datetime import date


class KpiResponse(BaseModel):
    total_users: int
    active_users: int
    users_safe: int
    users_help: int
    users_emergency: int
    emergency_rate: float
    active_rescuers: int
    available_rescuers: int
    rescuer_to_victim_ratio: float
    today_new_incidents: int
    today_resolved: int
    today_rescues_created: int
    today_rescues_completed: int
    avg_response_seconds: Optional[float] = None
    avg_resolution_seconds: Optional[float] = None
    resolution_rate: Optional[float] = None
    vulnerable_percentage: float
    active_tcws_count: int


class DailyTrendItem(BaseModel):
    date: date
    new_incidents: int
    resolved_incidents: int
    rescue_assignments_created: int
    rescue_assignments_completed: int
    avg_response_seconds: Optional[float] = None


class TrendResponse(BaseModel):
    days: list[DailyTrendItem]


class HeatmapPoint(BaseModel):
    lat: float
    lng: float
    weight: float


class HeatmapResponse(BaseModel):
    points: list[HeatmapPoint]
    total: int


class TemporalHeatmapResponse(BaseModel):
    hours: list[int]
    days: list[str]
    values: list[list[float]]


class ResponseTimeDay(BaseModel):
    date: date
    avg_response_seconds: Optional[float] = None
    p90_response_seconds: Optional[float] = None
    avg_time_to_onscene_seconds: Optional[float] = None
    avg_total_rescue_seconds: Optional[float] = None


class ResponseTimeResponse(BaseModel):
    days: list[ResponseTimeDay]


class BarangayStatsItem(BaseModel):
    barangay: str
    total_users: int
    users_emergency: int
    users_help: int
    users_safe: int
    vulnerable_users: int
    incidents_today: int
    resolved_today: int
    emergency_rate: float


class BarangayResponse(BaseModel):
    barangays: list[BarangayStatsItem]


class RescuerPerformanceItem(BaseModel):
    rescuer_id: str
    full_name: Optional[str] = None
    rescuer_type: str
    organization: Optional[str] = None
    total_assignments: int
    helped_count: int
    cancelled_count: int
    success_rate: float


class RescuerPerformanceResponse(BaseModel):
    rescuers: list[RescuerPerformanceItem]


class DemographicResponse(BaseModel):
    total_users: int
    by_gender: dict[str, int]
    by_blood_type: dict[str, int]
    by_age_group: dict[str, int]
    vulnerable_count: int
    special_needs_breakdown: dict[str, int]


class EvacuationUtilizationItem(BaseModel):
    id: int
    name: str
    capacity: Optional[int] = None
    users_within_1km: int
    users_within_2km: int
    utilization_pct: float
    status: str


class EvacuationResponse(BaseModel):
    centers: list[EvacuationUtilizationItem]


class RecentActivityItem(BaseModel):
    id: str
    full_name: Optional[str] = None
    new_status: str
    created_at: str
    barangay: Optional[str] = None


class RecentActivityResponse(BaseModel):
    items: list[RecentActivityItem]
    total: int

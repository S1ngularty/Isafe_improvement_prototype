from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class WaterLevelReading(BaseModel):
    id: int
    sensor_id: str
    distance_mm: Optional[float] = None
    water_level_cm: float
    status: str
    samples: Optional[int] = None
    recorded_at: datetime
    created_at: datetime


class SensorStatus(BaseModel):
    sensor_id: str
    is_active: bool
    last_seen: Optional[datetime] = None
    last_reading_cm: Optional[float] = None
    last_status: Optional[str] = None
    readings_24h: int = 0
    unsafe_readings_24h: int = 0


class WaterLevelSummary(BaseModel):
    total_sensors: int
    active_sensors: int
    inactive_sensors: int
    latest_readings: list[WaterLevelReading]
    sensor_statuses: list[SensorStatus]
    unsafe_count: int
    warning_count: int
    flood_warning_count: int


class TimeSeriesPoint(BaseModel):
    timestamp: datetime
    water_level_cm: float
    status: str
    sensor_id: str


class HourlyPattern(BaseModel):
    hour: int
    avg_water_level_cm: float
    max_water_level_cm: float
    min_water_level_cm: float
    reading_count: int


class DailyAggregate(BaseModel):
    date: str
    avg_water_level_cm: float
    max_water_level_cm: float
    min_water_level_cm: float
    reading_count: int
    unsafe_count: int


class WaterLevelAnalytics(BaseModel):
    time_series: list[TimeSeriesPoint]
    hourly_patterns: list[HourlyPattern]
    daily_aggregates: list[DailyAggregate]
    total_readings: int
    period_days: int


class UnsafeReading(BaseModel):
    id: int
    sensor_id: str
    water_level_cm: float
    status: str
    recorded_at: datetime
    duration_minutes: Optional[int] = None

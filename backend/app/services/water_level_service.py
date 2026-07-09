from datetime import datetime, timedelta, timezone
from typing import Optional

from app.core.supabase import client as supabase
from app.services.flood_level_service import derive_status
from app.models.water_level import (
    WaterLevelReading,
    SensorStatus,
    WaterLevelSummary,
    TimeSeriesPoint,
    HourlyPattern,
    DailyAggregate,
    WaterLevelAnalytics,
    UnsafeReading,
)

SENSOR_ACTIVE_WINDOW_MINUTES = 5
DEFAULT_ANALYTICS_DAYS = 7


def _parse_row(row: dict) -> Optional[WaterLevelReading]:
    try:
        return WaterLevelReading(
            id=row.get("id"),
            sensor_id=row.get("sensor_id", "unknown"),
            distance_mm=row.get("distance_mm"),
            water_level_cm=row.get("water_level_cm", 0),
            status=derive_status(row.get("water_level_cm", 0)),
            samples=row.get("samples"),
            recorded_at=_parse_dt(row.get("recorded_at")),
            created_at=_parse_dt(row.get("created_at")),
        )
    except Exception:
        return None


def _parse_dt(val):
    if val is None:
        return None
    if isinstance(val, str):
        return datetime.fromisoformat(val.replace("Z", "+00:00"))
    return val


def _is_active(last_seen: Optional[datetime]) -> bool:
    if last_seen is None:
        return False
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=SENSOR_ACTIVE_WINDOW_MINUTES)
    return last_seen >= cutoff


def get_summary() -> WaterLevelSummary:
    now = datetime.now(timezone.utc)

    latest_per_sensor = supabase.table("water_level_readings") \
        .select("*") \
        .order("recorded_at", desc=True) \
        .limit(1000) \
        .execute()

    rows = latest_per_sensor.data if latest_per_sensor.data else []

    sensor_map: dict[str, dict] = {}
    for row in rows:
        sid = row.get("sensor_id", "unknown")
        if sid not in sensor_map:
            sensor_map[sid] = row

    sensor_ids = list(sensor_map.keys())

    latest_readings = list(filter(None, (_parse_row(r) for r in sensor_map.values())))
    latest_readings.sort(key=lambda r: r.recorded_at, reverse=True)

    readings_24h = []
    if sensor_ids:
        result_24h = supabase.table("water_level_readings") \
            .select("*") \
            .gte("recorded_at", (now - timedelta(hours=24)).isoformat()) \
            .execute()
        readings_24h = result_24h.data if result_24h.data else []

    unsafe_24h = [r for r in readings_24h if derive_status(r.get("water_level_cm", 0)) in ("WARNING", "FLOOD_WARNING")]

    sensor_statuses = []
    for sid in sensor_ids:
        last = sensor_map[sid]
        last_seen = _parse_dt(last.get("recorded_at"))
        readings_for_sensor = [r for r in readings_24h if r.get("sensor_id") == sid]
        unsafe_for_sensor = [r for r in readings_24h if r.get("sensor_id") == sid and derive_status(r.get("water_level_cm", 0)) in ("WARNING", "FLOOD_WARNING")]

        sensor_statuses.append(SensorStatus(
            sensor_id=sid,
            is_active=_is_active(last_seen),
            last_seen=last_seen,
            last_reading_cm=last.get("water_level_cm"),
            last_status=derive_status(last.get("water_level_cm", 0)),
            readings_24h=len(readings_for_sensor),
            unsafe_readings_24h=len(unsafe_for_sensor),
        ))

    active_count = sum(1 for s in sensor_statuses if s.is_active)
    warning_count = sum(1 for r in unsafe_24h if derive_status(r.get("water_level_cm", 0)) == "WARNING")
    flood_warning_count = sum(1 for r in unsafe_24h if derive_status(r.get("water_level_cm", 0)) == "FLOOD_WARNING")

    return WaterLevelSummary(
        total_sensors=len(sensor_ids),
        active_sensors=active_count,
        inactive_sensors=len(sensor_ids) - active_count,
        latest_readings=latest_readings,
        sensor_statuses=sensor_statuses,
        unsafe_count=len(unsafe_24h),
        warning_count=warning_count,
        flood_warning_count=flood_warning_count,
    )


def get_readings(
    sensor_id: Optional[str] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    status_filter: Optional[str] = None,
    page: int = 1,
    limit: int = 50,
) -> tuple[list[WaterLevelReading], int]:
    query = supabase.table("water_level_readings").select("*", count="exact")

    if sensor_id:
        query = query.eq("sensor_id", sensor_id)
    if from_date:
        query = query.gte("recorded_at", from_date)
    if to_date:
        query = query.lte("recorded_at", to_date)
    if status_filter:
        if status_filter == "FLOOD_WARNING":
            query = query.lt("water_level_cm", 50)
        elif status_filter == "WARNING":
            query = query.gte("water_level_cm", 50).lte("water_level_cm", 70)
        elif status_filter == "SAFE":
            query = query.gt("water_level_cm", 70)

    offset_val = (page - 1) * limit
    result = query.order("recorded_at", desc=True).range(offset_val, offset_val + limit - 1).execute()

    rows = result.data if result.data else []
    total = result.count if hasattr(result, "count") and result.count else len(rows)

    return [_parse_row(r) for r in rows], total


def get_sensor_statuses() -> list[SensorStatus]:
    summary = get_summary()
    return summary.sensor_statuses


MAX_ANALYTICS_ROWS = 5000


def get_analytics(days: int = DEFAULT_ANALYTICS_DAYS) -> WaterLevelAnalytics:
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(days=days)

    result = supabase.table("water_level_readings") \
        .select("*") \
        .gte("recorded_at", cutoff.isoformat()) \
        .order("recorded_at", desc=False) \
        .limit(MAX_ANALYTICS_ROWS) \
        .execute()

    rows = result.data if result.data else []

    parsed = list(filter(None, (_parse_row(r) for r in rows)))

    ts_points = [
        TimeSeriesPoint(
            timestamp=r.recorded_at,
            water_level_cm=r.water_level_cm,
            status=derive_status(r.water_level_cm),
            sensor_id=r.sensor_id,
        ) for r in parsed
    ]

    hourly_buckets: dict[int, list[float]] = {}
    for r in parsed:
        h = r.recorded_at.hour
        if h not in hourly_buckets:
            hourly_buckets[h] = []
        hourly_buckets[h].append(r.water_level_cm)

    hourly_patterns = []
    for hour in range(24):
        vals = hourly_buckets.get(hour, [])
        if vals:
            hourly_patterns.append(HourlyPattern(
                hour=hour,
                avg_water_level_cm=round(sum(vals) / len(vals), 2),
                max_water_level_cm=round(max(vals), 2),
                min_water_level_cm=round(min(vals), 2),
                reading_count=len(vals),
            ))
        else:
            hourly_patterns.append(HourlyPattern(
                hour=hour,
                avg_water_level_cm=0,
                max_water_level_cm=0,
                min_water_level_cm=0,
                reading_count=0,
            ))

    daily_buckets: dict[str, list[tuple[float, str]]] = {}
    for r in parsed:
        d = r.recorded_at.strftime("%Y-%m-%d")
        if d not in daily_buckets:
            daily_buckets[d] = []
        daily_buckets[d].append((r.water_level_cm, derive_status(r.water_level_cm)))

    daily_aggregates = []
    for d in sorted(daily_buckets.keys()):
        vals = [v[0] for v in daily_buckets[d]]
        unsafe = sum(1 for v in daily_buckets[d] if derive_status(v[0]) in ("WARNING", "FLOOD_WARNING"))
        daily_aggregates.append(DailyAggregate(
            date=d,
            avg_water_level_cm=round(sum(vals) / len(vals), 2),
            max_water_level_cm=round(max(vals), 2),
            min_water_level_cm=round(min(vals), 2),
            reading_count=len(vals),
            unsafe_count=unsafe,
        ))

    return WaterLevelAnalytics(
        time_series=ts_points,
        hourly_patterns=hourly_patterns,
        daily_aggregates=daily_aggregates,
        total_readings=len(rows),
        period_days=days,
    )


def get_unsafe_readings(
    sensor_id: Optional[str] = None,
    limit: int = 50,
) -> list[UnsafeReading]:
    now = datetime.now(timezone.utc)
    query = supabase.table("water_level_readings") \
        .select("*") \
        .lte("water_level_cm", 70) \
        .order("recorded_at", desc=True)

    if sensor_id:
        query = query.eq("sensor_id", sensor_id)

    result = query.limit(limit).execute()
    rows = result.data if result.data else []

    readings = []
    for r in rows:
        recorded = _parse_dt(r.get("recorded_at"))
        if recorded is None:
            continue
        duration = int((now - recorded).total_seconds() / 60)
        readings.append(UnsafeReading(
            id=r.get("id"),
            sensor_id=r.get("sensor_id", "unknown"),
            water_level_cm=r.get("water_level_cm", 0),
            status=derive_status(r.get("water_level_cm", 0)),
            recorded_at=recorded,
            duration_minutes=duration,
        ))

    return readings

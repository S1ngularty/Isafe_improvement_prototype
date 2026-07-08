from fastapi import APIRouter, Query, HTTPException
from typing import Optional

from app.core.cache import cached
from app.services import water_level_service as svc

router = APIRouter(prefix="/api/water-level", tags=["water-level"])


@router.get("/summary")
@cached(ttl=30)
async def get_summary():
    try:
        result = svc.get_summary()
        return {"data": result.model_dump(mode="json"), "error": None}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get water level summary: {e}")


@router.get("/readings")
async def get_readings(
    sensor_id: Optional[str] = Query(None),
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
):
    try:
        items, total = svc.get_readings(
            sensor_id=sensor_id,
            from_date=from_date,
            to_date=to_date,
            status_filter=status,
            page=page,
            limit=limit,
        )
        return {
            "data": [r.model_dump(mode="json") for r in items],
            "page": page,
            "limit": limit,
            "total": total,
            "total_pages": max(1, -(-total // limit)),
            "has_next": page * limit < total,
            "has_prev": page > 1,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get readings: {e}")


@router.get("/sensors")
@cached(ttl=30)
async def get_sensors():
    try:
        result = svc.get_sensor_statuses()
        return {"data": [s.model_dump(mode="json") for s in result], "error": None}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get sensor statuses: {e}")


@router.get("/analytics")
@cached(ttl=120)
async def get_analytics(days: int = Query(7, ge=1, le=90)):
    try:
        result = svc.get_analytics(days=days)
        return {"data": result.model_dump(mode="json"), "error": None}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get analytics: {e}")


@router.get("/unsafe")
@cached(ttl=30)
async def get_unsafe(
    sensor_id: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
):
    try:
        result = svc.get_unsafe_readings(sensor_id=sensor_id, limit=limit)
        return {"data": [r.model_dump(mode="json") for r in result], "error": None}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get unsafe readings: {e}")

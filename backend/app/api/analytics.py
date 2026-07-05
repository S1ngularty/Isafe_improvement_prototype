from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional

from app.services import analytics as service
from app.core.auth import require_admin_only
from app.models.analytics import (
    KpiResponse,
    TrendResponse,
    HeatmapResponse,
    TemporalHeatmapResponse,
    ResponseTimeResponse,
    BarangayResponse,
    RescuerPerformanceResponse,
    DemographicResponse,
    EvacuationResponse,
    RecentActivityResponse,
)

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/kpi", response_model=dict)
async def get_kpi(current_user: dict = Depends(require_admin_only)):
    data = await service.get_kpi()
    return {"data": data.model_dump(), "error": None}


@router.get("/trends", response_model=dict)
async def get_trends(
    days: Optional[int] = Query(30, ge=1, le=365),
    current_user: dict = Depends(require_admin_only),
):
    data = await service.get_trends(days=days)
    return {"data": data.model_dump(), "error": None}


@router.get("/heatmap", response_model=dict)
async def get_heatmap(
    hours: Optional[int] = Query(24, ge=1, le=168),
    current_user: dict = Depends(require_admin_only),
):
    data = await service.get_heatmap(hours=hours)
    return {"data": data.model_dump(), "error": None}


@router.get("/heatmap-temporal", response_model=dict)
async def get_temporal_heatmap(current_user: dict = Depends(require_admin_only)):
    data = await service.get_temporal_heatmap()
    return {"data": data.model_dump(), "error": None}


@router.get("/response-times", response_model=dict)
async def get_response_times(
    days: Optional[int] = Query(30, ge=1, le=365),
    current_user: dict = Depends(require_admin_only),
):
    data = await service.get_response_times(days=days)
    return {"data": data.model_dump(), "error": None}


@router.get("/barangay", response_model=dict)
async def get_barangay_stats(current_user: dict = Depends(require_admin_only)):
    data = await service.get_barangay_stats()
    return {"data": data.model_dump(), "error": None}


@router.get("/rescuer-performance", response_model=dict)
async def get_rescuer_performance(current_user: dict = Depends(require_admin_only)):
    data = await service.get_rescuer_performance()
    return {"data": data.model_dump(), "error": None}


@router.get("/demographics", response_model=dict)
async def get_demographics(current_user: dict = Depends(require_admin_only)):
    data = await service.get_demographics()
    return {"data": data.model_dump(), "error": None}


@router.get("/evacuation-status", response_model=dict)
async def get_evacuation_status(current_user: dict = Depends(require_admin_only)):
    data = await service.get_evacuation_status()
    return {"data": data.model_dump(), "error": None}


@router.get("/recent-activity", response_model=dict)
async def get_recent_activity(
    limit: Optional[int] = Query(20, ge=1, le=100),
    current_user: dict = Depends(require_admin_only),
):
    data = await service.get_recent_activity(limit=limit)
    return {"data": data.model_dump(), "error": None}


@router.post("/backfill", response_model=dict)
async def backfill_analytics(current_user: dict = Depends(require_admin_only)):
    try:
        result = await service.backfill_all()
        return {"data": result, "error": None}
    except Exception as e:
        return {"data": None, "error": {"code": "BACKFILL_ERROR", "message": str(e)}}

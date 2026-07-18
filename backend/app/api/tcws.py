from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from app.models.tcws import TcwsCreate, TcwsUpdate
from app.services import tcws as service
from app.core.auth import require_admin_only

router = APIRouter(prefix="/api/tcws", tags=["tcws"])


@router.get("/active", response_model=dict)
async def list_active():
    data = await service.get_active_alerts()
    return {"data": data, "error": None}


@router.get("/admin", response_model=dict)
async def list_all(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    search: Optional[str] = Query(None),
    order_by: str = Query("created_at"),
    order_dir: str = Query("DESC"),
    include_deleted: bool = Query(False),
    deleted_only: bool = Query(False),
    current_user: dict = Depends(require_admin_only),
):
    data = await service.get_all_alerts_paginated(
        page=page, limit=limit, search=search,
        order_by=order_by, order_dir=order_dir,
        include_deleted=include_deleted,
        deleted_only=deleted_only,
    )
    return {"data": data, "error": None}


@router.post("", response_model=dict)
async def create(
    body: TcwsCreate,
    current_user: dict = Depends(require_admin_only),
):
    try:
        data = await service.create_alert(
            signal_level=body.signal_level,
            description=body.description,
            wind_speed=body.wind_speed,
        )
        return {"data": data, "error": None}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{alert_id}", response_model=dict)
async def update(
    alert_id: str,
    body: TcwsUpdate,
    current_user: dict = Depends(require_admin_only),
):
    try:
        data = await service.update_alert(
            alert_id=alert_id,
            signal_level=body.signal_level,
            description=body.description,
            wind_speed=body.wind_speed,
            is_active=body.is_active,
        )
        return {"data": data, "error": None}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{alert_id}", response_model=dict)
async def delete(
    alert_id: str,
    current_user: dict = Depends(require_admin_only),
):
    try:
        await service.soft_delete_alert(alert_id)
        return {"data": None, "error": None}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{alert_id}/restore", response_model=dict)
async def restore(
    alert_id: str,
    current_user: dict = Depends(require_admin_only),
):
    try:
        await service.restore_alert(alert_id)
        return {"data": None, "error": None}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

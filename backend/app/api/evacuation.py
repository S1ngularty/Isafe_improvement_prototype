from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from typing import Optional
from app.models.evacuation import EvacuationAreaCreate, EvacuationAreaUpdate
from app.services import evacuation as service
from app.core.auth import require_admin_only

router = APIRouter(prefix="/api/evacuation-areas", tags=["evacuation"])


@router.get("/nearest")
async def nearest_evacuation_areas(
    lat: float = Query(..., ge=-90, le=90),
    lng: float = Query(..., ge=-180, le=180),
    limit: int = Query(5, ge=1, le=10),
):
    try:
        results = await service.get_nearest_evacuation_areas(lat, lng, limit)
        return {"data": results, "error": None}
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Evacuation service unavailable: {str(exc)}")


@router.get("", response_model=dict)
async def list_evacuation_areas():
    data = await service.get_active_evacuation_areas()
    return {"data": data, "error": None}


@router.get("/admin", response_model=dict)
async def list_all_evacuation_areas(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    search: Optional[str] = Query(None),
    order_by: str = Query("created_at"),
    order_dir: str = Query("DESC"),
    current_user: dict = Depends(require_admin_only),
):
    data = await service.get_all_areas_paginated(
        page=page, limit=limit, search=search,
        order_by=order_by, order_dir=order_dir,
    )
    return {"data": data, "error": None}


@router.post("", response_model=dict)
async def create_evacuation_area(
    name: str = Form(...),
    description: str | None = Form(default=None),
    latitude: float = Form(...),
    longitude: float = Form(...),
    capacity: int | None = Form(default=None),
    status: str = Form("active"),
    landmark_url: str | None = Form(default=None),
    file: UploadFile | None = File(default=None),
    current_user: dict = Depends(require_admin_only),
):
    body = EvacuationAreaCreate(
        name=name,
        description=description,
        latitude=latitude,
        longitude=longitude,
        capacity=capacity,
        status=status,
        landmark_url=landmark_url,
    )

    file_content = None
    file_name = None
    content_type = None

    if file:
        content = await file.read()
        file_content = content
        file_name = file.filename
        content_type = file.content_type

        allowed = {"image/jpeg", "image/png", "image/webp", "image/gif"}
        if content_type not in allowed:
            raise HTTPException(status_code=400, detail=f"File type {content_type} not allowed")

        if len(content) > 5 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File too large (max 5MB)")

    try:
        data = await service.create_evacuation_area(
            name=body.name,
            description=body.description,
            latitude=body.latitude,
            longitude=body.longitude,
            capacity=body.capacity,
            status=body.status,
            file_content=file_content,
            file_name=file_name,
            content_type=content_type,
            landmark_url=body.landmark_url if not file else None,
        )
        return {"data": data, "error": None}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{area_id}", response_model=dict)
async def update_evacuation_area(
    area_id: int,
    name: str | None = Form(default=None),
    description: str | None = Form(default=None),
    latitude: float | None = Form(default=None),
    longitude: float | None = Form(default=None),
    capacity: int | None = Form(default=None),
    status: str | None = Form(default=None),
    landmark_url: str | None = Form(default=None),
    file: UploadFile | None = File(default=None),
    current_user: dict = Depends(require_admin_only),
):
    file_content = None
    file_name = None
    content_type = None

    if file:
        content = await file.read()
        file_content = content
        file_name = file.filename
        content_type = file.content_type

        allowed = {"image/jpeg", "image/png", "image/webp", "image/gif"}
        if content_type not in allowed:
            raise HTTPException(status_code=400, detail=f"File type {content_type} not allowed")

        if len(content) > 5 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File too large (max 5MB)")

    try:
        data = await service.update_evacuation_area(
            area_id=area_id,
            name=name,
            description=description,
            latitude=latitude,
            longitude=longitude,
            capacity=capacity,
            status=status,
            file_content=file_content,
            file_name=file_name,
            content_type=content_type,
            landmark_url=landmark_url,
        )
        return {"data": data, "error": None}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{area_id}", response_model=dict)
async def delete_evacuation_area(
    area_id: int,
    current_user: dict = Depends(require_admin_only),
):
    try:
        await service.soft_delete_evacuation_area(area_id)
        return {"data": None, "error": None}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, Query
from typing import Optional
from app.models.announcement import AnnouncementCreate, AnnouncementUpdate
from app.services import announcements as service
from app.core.auth import require_admin_only

router = APIRouter(prefix="/api/announcements", tags=["announcements"])


@router.get("/active", response_model=dict)
async def list_active():
    data = await service.get_active_announcements()
    return {"data": data, "error": None}


@router.get("/admin", response_model=dict)
async def list_all(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    search: Optional[str] = Query(None),
    order_by: str = Query("created_at"),
    order_dir: str = Query("DESC"),
    current_user: dict = Depends(require_admin_only),
):
    data = await service.get_all_announcements_paginated(
        page=page, limit=limit, search=search,
        order_by=order_by, order_dir=order_dir,
    )
    return {"data": data, "error": None}


@router.post("", response_model=dict)
async def create(
    title: str = Form(...),
    short_description: str = Form(...),
    long_description: str | None = Form(default=None),
    image_url: str | None = Form(default=None),
    file: UploadFile | None = File(default=None),
    current_user: dict = Depends(require_admin_only),
):
    body = AnnouncementCreate(title=title, short_description=short_description, long_description=long_description)

    file_content = None
    file_name = None
    content_type = None

    if file:
        content = await file.read()
        file_content = content
        file_name = file.filename
        content_type = file.content_type

        allowed = {"image/jpeg", "image/png", "image/webp", "video/mp4", "video/webm"}
        if content_type not in allowed:
            raise HTTPException(status_code=400, detail=f"File type {content_type} not allowed")

        max_size = 50 * 1024 * 1024 if content_type.startswith("video/") else 10 * 1024 * 1024
        if len(content) > max_size:
            raise HTTPException(status_code=400, detail="File too large")

    if not file and not image_url:
        raise HTTPException(status_code=400, detail="Either file upload or image_url is required")

    try:
        data = await service.create_announcement(
            title=body.title,
            short_description=body.short_description,
            long_description=body.long_description,
            file_content=file_content,
            file_name=file_name,
            content_type=content_type,
            image_url=image_url if not file else None,
        )
        return {"data": data, "error": None}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{announcement_id}", response_model=dict)
async def update(
    announcement_id: str,
    title: str | None = Form(default=None),
    short_description: str | None = Form(default=None),
    long_description: str | None = Form(default=None),
    image_url: str | None = Form(default=None),
    is_active: bool | None = Form(default=None),
    file: UploadFile | None = File(default=None),
    current_user: dict = Depends(require_admin_only),
):
    body = AnnouncementUpdate(
        title=title,
        short_description=short_description,
        long_description=long_description,
        image_url=image_url,
        is_active=is_active,
    )

    file_content = None
    file_name = None
    content_type = None

    if file:
        content = await file.read()
        file_content = content
        file_name = file.filename
        content_type = file.content_type

        allowed = {"image/jpeg", "image/png", "image/webp", "video/mp4", "video/webm"}
        if content_type not in allowed:
            raise HTTPException(status_code=400, detail=f"File type {content_type} not allowed")

        max_size = 50 * 1024 * 1024 if content_type.startswith("video/") else 10 * 1024 * 1024
        if len(content) > max_size:
            raise HTTPException(status_code=400, detail="File too large")

    try:
        data = await service.update_announcement(
            announcement_id=announcement_id,
            title=body.title,
            short_description=body.short_description,
            long_description=body.long_description,
            image_url=body.image_url,
            is_active=body.is_active,
            file_content=file_content,
            file_name=file_name,
            content_type=content_type,
        )
        return {"data": data, "error": None}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{announcement_id}", response_model=dict)
async def delete(
    announcement_id: str,
    current_user: dict = Depends(require_admin_only),
):
    try:
        await service.soft_delete_announcement(announcement_id)
        return {"data": None, "error": None}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

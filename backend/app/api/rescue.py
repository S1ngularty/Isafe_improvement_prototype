from fastapi import APIRouter, Depends, Query
from typing import Optional
from app.core.auth import require_rescuer
from app.services import rescue as service

router = APIRouter(prefix="/api/rescue", tags=["rescue"])


@router.get("/in-need")
async def list_in_need(
    lat: Optional[float] = Query(None),
    lng: Optional[float] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    current_user: dict = Depends(require_rescuer),
):
    data = await service.list_in_need(
        current_user["id"],
        rescuer_lat=lat,
        rescuer_lng=lng,
        page=page,
        limit=limit,
    )
    return {"data": data, "error": None}


@router.post("/assignments")
async def claim_assignment(
    body: dict,
    current_user: dict = Depends(require_rescuer),
):
    target_user_id = body.get("target_user_id")
    if not target_user_id:
        return {"data": None, "error": {"code": "VALIDATION", "message": "target_user_id is required"}}

    result = await service.claim_assignment(current_user["id"], target_user_id)
    if "error" in result:
        return {"data": None, "error": {"code": "CONFLICT", "message": result["error"]}}

    return {"data": result, "error": None}


@router.put("/assignments/{assignment_id}")
async def update_assignment(
    assignment_id: str,
    body: dict,
    current_user: dict = Depends(require_rescuer),
):
    result = await service.update_assignment(assignment_id, current_user["id"], body)
    if "error" in result:
        return {"data": None, "error": {"code": "BAD_REQUEST", "message": result["error"]}}

    return {"data": result, "error": None}


@router.get("/assignments")
async def get_assignments(
    active_only: bool = Query(False),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    current_user: dict = Depends(require_rescuer),
):
    data = await service.get_my_assignments(
        current_user["id"],
        active_only=active_only,
        page=page,
        limit=limit,
    )
    return {"data": data, "error": None}


@router.get("/active-for-target/{target_user_id}")
async def active_for_target(target_user_id: str):
    """Public helper — shows victim that a rescuer is en route. No auth needed at endpoint level.
       The service layer respects RLS on the table."""
    data = await service.get_active_for_target(target_user_id)
    return {"data": data, "error": None}


@router.get("/me")
async def get_my_profile(current_user: dict = Depends(require_rescuer)):
    data = await service.get_rescuer_profile(current_user["id"])
    if not data:
        return {"data": None, "error": {"code": "NOT_FOUND", "message": "Profile not found"}}
    return {"data": data, "error": None}


@router.put("/me")
async def update_my_profile(
    body: dict,
    current_user: dict = Depends(require_rescuer),
):
    data = await service.update_rescuer_profile(current_user["id"], body)
    return {"data": data, "error": None}

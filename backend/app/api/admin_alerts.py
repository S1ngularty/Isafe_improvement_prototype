from fastapi import APIRouter, HTTPException, Depends
from typing import Optional
from app.services import admin_alerts as service
from app.core.auth import require_admin_only

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/status-overview")
async def status_overview(current_user: dict = Depends(require_admin_only)):
    data = await service.get_status_overview()
    return {"data": data, "error": None}


@router.get("/status-users")
async def status_users(
    status: Optional[str] = None,
    search: Optional[str] = None,
    current_user: dict = Depends(require_admin_only),
):
    data = await service.get_status_users(status_filter=status, search=search)
    return {"data": data, "error": None}


@router.get("/status-history/{user_id}")
async def status_history(user_id: str, current_user: dict = Depends(require_admin_only)):
    data = await service.get_status_history(user_id)
    return {"data": data, "error": None}


@router.get("/profile/{user_id}")
async def user_profile(user_id: str, current_user: dict = Depends(require_admin_only)):
    data = await service.get_user_profile(user_id)
    if not data:
        raise HTTPException(status_code=404, detail="User not found")
    return {"data": data, "error": None}


@router.put("/status/{user_id}")
async def update_status(
    user_id: str,
    body: dict,
    current_user: dict = Depends(require_admin_only),
):
    admin_id = current_user["id"]
    new_status = body.get("status")
    resolution_note = body.get("resolution_note")

    if not new_status or new_status not in ("safe", "help", "emergency"):
        raise HTTPException(status_code=400, detail="Status must be one of: safe, help, emergency")

    result = await service.update_user_status(admin_id, user_id, new_status, resolution_note)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])

    return {"data": result, "error": None}

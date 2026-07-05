from fastapi import APIRouter, HTTPException, Header
from app.services import family_alerts as service
from app.core.supabase import client

router = APIRouter(prefix="/api/family-alerts", tags=["family-alerts"])


async def _resolve_user(authorization: str = Header(...)) -> str:
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    token = authorization.removeprefix("Bearer ")
    try:
        user = client.auth.get_user(token)
        if not user or not user.user:
            raise HTTPException(status_code=401, detail="Invalid token")
        return user.user.id
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))


@router.get("/current")
async def get_current_status(user_id: str = None, authorization: str = Header(None)):
    if user_id:
        uid = user_id
    elif authorization:
        uid = await _resolve_user(authorization)
    else:
        raise HTTPException(status_code=401, detail="Authentication required")

    try:
        data = await service.get_current_status(uid)
        return {"data": data, "error": None}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history")
async def get_status_history(
    period: int = 7,
    since: str = None,
    user_id: str = None,
    authorization: str = Header(None),
):
    if period not in (7, 15, 30) and not since:
        raise HTTPException(status_code=400, detail="Period must be 7, 15, or 30")

    if user_id:
        uid = user_id
    elif authorization:
        uid = await _resolve_user(authorization)
    else:
        raise HTTPException(status_code=401, detail="Authentication required")

    try:
        data = await service.get_status_history(uid, period, since)
        return {"data": data, "error": None}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/member/{target_user_id}")
async def get_member_profile(
    target_user_id: str,
    user_id: str = None,
    authorization: str = Header(None),
):
    if user_id:
        uid = user_id
    elif authorization:
        uid = await _resolve_user(authorization)
    else:
        raise HTTPException(status_code=401, detail="Authentication required")

    try:
        data = await service.get_member_profile(uid, target_user_id)
        if not data:
            raise HTTPException(status_code=404, detail="Member not found")
        return {"data": data, "error": None}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

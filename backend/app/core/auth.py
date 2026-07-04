from fastapi import Depends, HTTPException, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.supabase import client

security = HTTPBearer(auto_error=False)

ROLES = ("admin", "user", "rescuer")


def get_current_user(
    authorization: str | None = Header(None),
) -> dict:
    if not authorization:
        raise HTTPException(status_code=401, detail="Authorization header required")
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    token = authorization.removeprefix("Bearer ")
    try:
        user = client.auth.get_user(token)
        if not user or not user.user:
            raise HTTPException(status_code=401, detail="Invalid token")
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))

    profile = (
        client.table("profiles")
        .select("id, role, is_active")
        .eq("id", user.user.id)
        .single()
        .execute()
    )
    if not profile.data:
        raise HTTPException(status_code=404, detail="Profile not found")
    if not profile.data.get("is_active", True):
        raise HTTPException(status_code=403, detail="Account is deactivated")

    return {"id": profile.data["id"], "role": profile.data["role"]}


def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


def require_rescuer(current_user: dict = Depends(get_current_user)) -> dict:
    if current_user["role"] not in ("admin", "rescuer"):
        raise HTTPException(status_code=403, detail="Rescuer access required")
    return current_user


def require_admin_only(current_user: dict = Depends(get_current_user)) -> dict:
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

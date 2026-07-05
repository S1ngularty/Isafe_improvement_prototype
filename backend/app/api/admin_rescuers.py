from fastapi import APIRouter, Depends, Query, HTTPException
from typing import Optional
from app.core.auth import require_admin_only
from app.core.supabase import client
from datetime import datetime, timezone

router = APIRouter(prefix="/api/admin", tags=["admin-rescuers"])

RESCUER_LIST_FIELDS = (
    "id, full_name, barangay, phone_number, avatar_url, last_seen_at, lat, lng, "
    "rescuers!left(id, organization, rescuer_type, availability, certification, contact_number)"
)


@router.get("/rescuers")
async def list_rescuers(
    search: Optional[str] = Query(None),
    current_user: dict = Depends(require_admin_only),
):
    query = (
        client.from_("profiles")
        .select(RESCUER_LIST_FIELDS)
        .eq("role", "rescuer")
        .order("last_seen_at", desc=True, nullsfirst=False)
    )

    if search and search.strip():
        q = search.strip().lower()
        result = query.execute()
        rows = result.data or []
        rows = [
            r for r in rows
            if q in (r.get("full_name") or "").lower() or q in (r.get("barangay") or "").lower()
        ]
    else:
        result = query.execute()
        rows = result.data or []

    enriched = []
    for r in rows:
        item = dict(r)
        rescuer_detail = item.pop("rescuers", None)
        if rescuer_detail and isinstance(rescuer_detail, list) and len(rescuer_detail) > 0:
            item.update(rescuer_detail[0])
        elif rescuer_detail and isinstance(rescuer_detail, dict):
            item.update(rescuer_detail)
        enriched.append(item)

    return {"data": {"rescuers": enriched, "total": len(enriched)}, "error": None}


@router.get("/rescue-activity")
async def rescue_activity(
    current_user: dict = Depends(require_admin_only),
):
    result = (
        client.from_("rescue_assignments")
        .select(
            "*, "
            "rescuer:rescuer_id(id, full_name, avatar_url, "
            "  rescuers!left(organization, rescuer_type, availability)), "
            "target:target_user_id(id, full_name, status, barangay, lat, lng)"
        )
        .order("created_at", desc=True)
        .limit(100)
        .execute()
    )
    rows = result.data or []

    enriched = []
    for r in rows:
        item = dict(r)
        rescuer_data = item.pop("rescuer", None)
        target_data = item.pop("target", None)

        if rescuer_data:
            rescuer_obj = dict(rescuer_data)
            rescuer_detail = rescuer_obj.pop("rescuers", None)
            if rescuer_detail and isinstance(rescuer_detail, list) and len(rescuer_detail) > 0:
                rescuer_obj.update(rescuer_detail[0])
            elif rescuer_detail and isinstance(rescuer_detail, dict):
                rescuer_obj.update(rescuer_detail)
            item["rescuer"] = rescuer_obj

        if target_data:
            item["target"] = dict(target_data)

        enriched.append(item)

    return {"data": {"assignments": enriched, "total": len(enriched)}, "error": None}


@router.put("/rescuers/{user_id}")
async def update_rescuer(
    user_id: str,
    body: dict,
    current_user: dict = Depends(require_admin_only),
):
    if "role" in body and body["role"] == "rescuer":
        client.table("profiles").update({
            "role": "rescuer",
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", user_id).execute()

    rescuer_fields = {}
    allowed = ("organization", "rescuer_type", "availability", "certification", "contact_number")
    for k, v in body.items():
        if v is not None and k in allowed:
            rescuer_fields[k] = v

    if rescuer_fields:
        rescuer_fields["updated_at"] = datetime.now(timezone.utc).isoformat()
        client.table("rescuers").upsert({
            "id": user_id,
            **rescuer_fields,
        }).execute()

    return {"data": {"id": user_id}, "error": None}

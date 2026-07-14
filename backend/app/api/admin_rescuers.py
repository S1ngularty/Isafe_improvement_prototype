from fastapi import APIRouter, Depends, Query, HTTPException
from typing import Optional
from app.core.auth import require_admin_only
from app.core.supabase import client
from datetime import datetime, timezone


def _flatten_barangay(rows: list[dict]):
    for r in rows:
        brgy_info = r.pop("barangays", None) or {}
        r["barangay"] = brgy_info.get("name")


def _matching_barangay_ids(q: str) -> list[int]:
    try:
        result = (
            client.table("barangays")
            .select("id")
            .ilike("name", f"%{q}%")
            .execute()
        )
        return [b["id"] for b in (result.data or [])]
    except Exception:
        return []

router = APIRouter(prefix="/api/admin", tags=["admin-rescuers"])

RESCUER_LIST_FIELDS = (
    "id, full_name, barangay_id, barangays(name), phone_number, avatar_url, "
    "last_seen_at, lat, lng, "
    "rescuers!left(id, organization, rescuer_type, availability, certification, contact_number)"
)

ALLOWED_RESCUER_SORT_COLUMNS = {
    "full_name": {"column": "full_name"},
    "barangay": {"column": "barangay_id"},
    "last_seen_at": {"column": "last_seen_at"},
    "rescuer_type": {"column": "rescuer_type", "foreign_table": "rescuers"},
    "availability": {"column": "availability", "foreign_table": "rescuers"},
    "organization": {"column": "organization", "foreign_table": "rescuers"},
    "certification": {"column": "certification", "foreign_table": "rescuers"},
}

ALLOWED_ACTIVITY_SORT_COLUMNS = {
    "created_at": "created_at",
    "state": "state",
    "aid_type": "aid_type",
}


@router.get("/rescuers")
async def list_rescuers(
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=500),
    order_by: str = Query("last_seen_at"),
    order_dir: str = Query("DESC"),
    current_user: dict = Depends(require_admin_only),
):
    query = (
        client.from_("profiles")
        .select(RESCUER_LIST_FIELDS, count="exact")
        .eq("role", "rescuer")
    )

    if search and search.strip():
        q = search.strip()
        brgy_ids = _matching_barangay_ids(q)
        if brgy_ids:
            id_list = ",".join(str(i) for i in brgy_ids)
            query = query.or_(f"full_name.ilike.%{q}%,barangay_id.in.({id_list})")
        else:
            query = query.or_(f"full_name.ilike.%{q}%")

    sort_config = ALLOWED_RESCUER_SORT_COLUMNS.get(order_by, {"column": "last_seen_at"})
    sort_col = sort_config["column"]
    sort_desc = order_dir.upper() == "DESC"
    foreign_table = sort_config.get("foreign_table")
    query = query.order(sort_col, desc=sort_desc, nullsfirst=False, foreign_table=foreign_table)
    offset = (page - 1) * limit
    query = query.range(offset, offset + limit - 1)
    result = query.execute()
    rows = result.data or []
    _flatten_barangay(rows)
    total = result.count if hasattr(result, "count") else len(rows)

    enriched = []
    for r in rows:
        item = dict(r)
        rescuer_detail = item.pop("rescuers", None)
        if rescuer_detail and isinstance(rescuer_detail, list) and len(rescuer_detail) > 0:
            item.update(rescuer_detail[0])
        elif rescuer_detail and isinstance(rescuer_detail, dict):
            item.update(rescuer_detail)
        enriched.append(item)

    return {"data": {"rescuers": enriched, "total": total, "page": page, "limit": limit}, "error": None}


@router.get("/rescue-activity")
async def rescue_activity(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    state: Optional[str] = Query(None),
    order_by: str = Query("created_at"),
    order_dir: str = Query("DESC"),
    current_user: dict = Depends(require_admin_only),
):
    query = (
        client.from_("rescue_assignments")
        .select(
            "*, "
            "rescuer:rescuer_id(id, full_name, avatar_url, "
            "  rescuers!left(organization, rescuer_type, availability)), "
            "target:target_user_id(id, full_name, status, barangay_id, barangays(name), lat, lng)",
            count="exact",
        )
        .is_("deleted_at", "null")
    )

    if state and state in ("helped", "en_route", "on_scene", "dispatched"):
        query = query.eq("state", state)

    sort_col = ALLOWED_ACTIVITY_SORT_COLUMNS.get(order_by, "created_at")
    sort_desc = order_dir.upper() == "DESC"
    query = query.order(sort_col, desc=sort_desc, nullsfirst=False)
    offset = (page - 1) * limit
    query = query.range(offset, offset + limit - 1)
    result = query.execute()
    rows = result.data or []
    total = result.count if hasattr(result, "count") else len(rows)

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
            target_obj = dict(target_data)
            brgy_info = target_obj.pop("barangays", None) or {}
            target_obj["barangay"] = brgy_info.get("name")
            item["target"] = target_obj

        enriched.append(item)

    return {"data": {"assignments": enriched, "total": total, "page": page, "limit": limit}, "error": None}


@router.delete("/rescue-assignments/{assignment_id}", response_model=dict)
async def soft_delete_rescue_assignment(
    assignment_id: str,
    current_user: dict = Depends(require_admin_only),
):
    try:
        client.table("rescue_assignments").update(
            {"deleted_at": "now()"}
        ).eq("id", assignment_id).execute()
        return {"data": None, "error": None}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


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

import math
import uuid
from typing import Any

from app.core.supabase import client, get_client

ALLOWED_SORT_COLUMNS = {
    "name": "name",
    "capacity": "capacity",
    "status": "status",
    "created_at": "created_at",
}


def _distance_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    radius = 6371.0
    lat1_rad = math.radians(lat1)
    lng1_rad = math.radians(lng1)
    lat2_rad = math.radians(lat2)
    lng2_rad = math.radians(lng2)
    dlat = lat2_rad - lat1_rad
    dlng = lng2_rad - lng1_rad
    a = math.sin(dlat / 2) ** 2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlng / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return radius * c


def rank_evacuation_areas(areas: list[dict[str, Any]], lat: float, lng: float) -> list[dict[str, Any]]:
    ranked: list[dict[str, Any]] = []
    for area in areas or []:
        latitude = area.get("latitude")
        longitude = area.get("longitude")
        if latitude is None or longitude is None:
            continue
        ranked.append({
            **area,
            "distance_km": round(_distance_km(float(lat), float(lng), float(latitude), float(longitude)), 2),
        })
    ranked.sort(key=lambda item: item["distance_km"])
    return ranked


async def get_nearest_evacuation_areas(lat: float, lng: float, limit: int = 5) -> list[dict[str, Any]]:
    if lat is None or lng is None:
        return []
    db = get_client()
    if not db:
        return []
    try:
        response = (
            db.table("evacuation_areas")
            .select("id,name,description,latitude,longitude,capacity,status,landmark_url")
            .eq("status", "active")
            .is_("deleted_at", "null")
            .execute()
        )
        areas = getattr(response, "data", None) or []
    except Exception:
        return []
    ranked = rank_evacuation_areas(areas, lat, lng)
    return ranked[: max(limit, 1)]


async def get_active_evacuation_areas() -> list[dict]:
    result = (
        client.table("evacuation_areas")
        .select("*")
        .eq("status", "active")
        .is_("deleted_at", "null")
        .order("name")
        .execute()
    )
    return result.data or []


async def get_all_evacuation_areas() -> list[dict]:
    result = (
        client.table("evacuation_areas")
        .select("*")
        .is_("deleted_at", "null")
        .order("name")
        .execute()
    )
    return result.data or []


async def get_all_areas_paginated(
    page: int = 1,
    limit: int = 10,
    search: str | None = None,
    order_by: str = "created_at",
    order_dir: str = "DESC",
    include_deleted: bool = False,
) -> dict:
    query = client.table("evacuation_areas").select("*", count="exact")
    if not include_deleted:
        query = query.is_("deleted_at", "null")

    if search and search.strip():
        q = search.strip()
        query = query.or_(f"name.ilike.%{q}%,description.ilike.%{q}%")

    sort_col = ALLOWED_SORT_COLUMNS.get(order_by, "created_at")
    sort_desc = order_dir.upper() == "DESC"
    query = query.order(sort_col, desc=sort_desc)

    page = max(1, page)
    limit = max(1, min(100, limit))
    offset = (page - 1) * limit
    end = offset + limit - 1
    query = query.range(offset, end)
    result = query.execute()

    rows = result.data or []
    total = result.count if hasattr(result, "count") else len(rows)

    return {
        "areas": rows,
        "total": total,
        "page": page,
        "limit": limit,
    }


def _upload_landmark(file_content: bytes, file_name: str, content_type: str) -> str:
    ext = file_name.rsplit(".", 1)[-1].lower() if "." in file_name else "jpg"
    path = f"evacuation/{uuid.uuid4()}.{ext}"
    storage = client.storage
    storage.from_("evacuation_landmarks").upload(
        path=path,
        file=file_content,
        file_options={"content-type": content_type},
    )
    bucket_url = client.storage_url
    return f"{bucket_url}/object/public/evacuation_landmarks/{path}"


async def create_evacuation_area(
    name: str,
    description: str | None = None,
    latitude: float | None = None,
    longitude: float | None = None,
    capacity: int | None = None,
    status: str = "active",
    file_content: bytes | None = None,
    file_name: str | None = None,
    content_type: str | None = None,
    landmark_url: str | None = None,
) -> dict:
    final_url = landmark_url or None

    if file_content and file_name and content_type:
        final_url = _upload_landmark(file_content, file_name, content_type)

    insert_result = (
        client.table("evacuation_areas")
        .insert({
            "name": name,
            "description": description or "",
            "latitude": latitude,
            "longitude": longitude,
            "capacity": capacity,
            "status": status,
            "landmark_url": final_url,
        })
        .execute()
    )
    if insert_result.data:
        return insert_result.data[0]

    result = (
        client.table("evacuation_areas")
        .select("*")
        .eq("name", name)
        .order("created_at", desc=True)
        .limit(1)
        .single()
        .execute()
    )
    return result.data


async def update_evacuation_area(
    area_id: int,
    name: str | None = None,
    description: str | None = None,
    latitude: float | None = None,
    longitude: float | None = None,
    capacity: int | None = None,
    status: str | None = None,
    file_content: bytes | None = None,
    file_name: str | None = None,
    content_type: str | None = None,
    landmark_url: str | None = None,
) -> dict:
    updates = {}

    if name is not None:
        updates["name"] = name
    if description is not None:
        updates["description"] = description
    if latitude is not None:
        updates["latitude"] = latitude
    if longitude is not None:
        updates["longitude"] = longitude
    if capacity is not None:
        updates["capacity"] = capacity
    if status is not None:
        updates["status"] = status
    if landmark_url is not None:
        updates["landmark_url"] = landmark_url

    if file_content and file_name and content_type:
        updates["landmark_url"] = _upload_landmark(file_content, file_name, content_type)

    if updates:
        updates["updated_at"] = "now()"
        client.table("evacuation_areas").update(updates).eq("id", area_id).is_("deleted_at", "null").execute()

    result = (
        client.table("evacuation_areas")
        .select("*")
        .eq("id", area_id)
        .single()
        .execute()
    )
    return result.data


async def soft_delete_evacuation_area(area_id: int) -> None:
    client.table("evacuation_areas").update({"deleted_at": "now()"}).eq("id", area_id).execute()


async def restore_evacuation_area(area_id: int) -> None:
    client.table("evacuation_areas").update({"deleted_at": None}).eq("id", area_id).execute()

import math
from typing import Any

from app.core.supabase import get_client


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

    client = get_client()
    if not client:
        return []

    try:
        response = client.table("evacuation_areas").select("id,name,description,latitude,longitude,capacity,status").eq("status", "active").execute()
        areas = getattr(response, "data", None) or []
    except Exception:
        return []

    ranked = rank_evacuation_areas(areas, lat, lng)
    return ranked[: max(limit, 1)]

from app.core.supabase import client
from typing import Optional
import math
from datetime import datetime, timezone
from app.services.routing import get_route

PROFILE_BASE_FIELDS = (
    "id, full_name, status, barangay, lat, lng, last_seen_at, "
    "blood_type, medical_notes, special_needs, household_size, avatar_url"
)
RESCUER_DETAIL_FIELDS = (
    "id, full_name, avatar_url, barangay, phone_number, "
    "rescuers(id, organization, rescuer_type, availability, certification, contact_number)"
)


async def list_in_need(rescuer_id: str, rescuer_lat: float | None = None, rescuer_lng: float | None = None) -> dict:
    """List all users with status 'help' or 'emergency'"""
    result = (
        client.from_("profiles")
        .select(PROFILE_BASE_FIELDS)
        .in_("status", ["help", "emergency"])
        .order("last_seen_at", desc=True, nullsfirst=False)
        .execute()
    )
    rows = result.data or []

    enriched = []
    for r in rows:
        item = dict(r)
        if rescuer_lat is not None and rescuer_lng is not None and r.get("lat") and r.get("lng"):
            item["distance_km"] = round(
                _haversine(rescuer_lat, rescuer_lng, r["lat"], r["lng"]), 2
            )
        enriched.append(item)

    enriched.sort(key=lambda x: (
        0 if x.get("status") == "emergency" else 1,
        x.get("distance_km") if x.get("distance_km") is not None else 99999
    ))

    return {"users": enriched, "total": len(enriched)}


async def claim_assignment(rescuer_id: str, target_user_id: str) -> dict:
    """Rescuer self-claims an incident"""
    profile = (
        client.table("profiles")
        .select("id, status")
        .eq("id", target_user_id)
        .limit(1)
        .execute()
    )
    if not profile.data or len(profile.data) == 0:
        return {"error": "Target user not found"}
    profile = profile.data[0]
    if profile.get("status") == "safe":
        return {"error": "Target user is already marked safe"}

    existing = (
        client.table("rescue_assignments")
        .select("id, state")
        .eq("target_user_id", target_user_id)
        .in_("state", ["en_route", "on_scene"])
        .limit(1)
        .execute()
    )
    if existing.data and len(existing.data) > 0:
        return {"error": "This user already has an active assignment"}

    latest_sh = (
        client.table("status_history")
        .select("id")
        .eq("user_id", target_user_id)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    status_history_id = latest_sh.data[0]["id"] if (latest_sh.data and len(latest_sh.data) > 0) else None

    now_utc = datetime.now(timezone.utc).isoformat()
    insert_data = {
        "rescuer_id": rescuer_id,
        "target_user_id": target_user_id,
        "status_history_id": status_history_id,
        "state": "en_route",
        "created_at": now_utc,
        "updated_at": now_utc,
    }

    result = client.table("rescue_assignments").insert(insert_data).execute()
    if not result.data:
        return {"error": "Failed to create assignment"}

    assignment = result.data[0]
    return {
        "id": assignment["id"],
        "state": "en_route",
        "message": "Assignment claimed successfully",
    }


async def update_assignment(assignment_id: str, rescuer_id: str, body: dict) -> dict:
    """Update assignment state, position, or mark as helped"""
    existing = (
        client.table("rescue_assignments")
        .select("id, rescuer_id, state, target_user_id")
        .eq("id", assignment_id)
        .limit(1)
        .execute()
    )
    if not existing.data or len(existing.data) == 0:
        return {"error": "Assignment not found"}
    existing = existing.data[0]
    if existing.get("rescuer_id") != rescuer_id:
        return {"error": "Not your assignment"}
    if existing.get("state") in ("helped", "cancelled"):
        return {"error": "Assignment is already closed"}

    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
    new_state = body.get("state")

    if new_state:
        valid_states = ("en_route", "on_scene", "helped", "cancelled")
        if new_state not in valid_states:
            return {"error": f"State must be one of: {', '.join(valid_states)}"}
        update_data["state"] = new_state
        if new_state in ("helped", "cancelled"):
            update_data["resolved_at"] = datetime.now(timezone.utc).isoformat()
            aid_type = body.get("aid_type")
            if new_state == "helped":
                valid_aid = ("first_aid", "transported_to_hospital", "evacuated",
                             "food_water", "search_rescue", "other")
                if aid_type and aid_type not in valid_aid:
                    return {"error": f"aid_type must be one of: {', '.join(valid_aid)}"}
                update_data["aid_type"] = aid_type
                client.table("profiles").update({"status": "safe"}).eq("id", existing["target_user_id"]).execute()

    if "aid_type" in body and body.get("aid_type"):
        update_data["aid_type"] = body["aid_type"]
    if "notes" in body:
        update_data["notes"] = body["notes"]
    if "resolution_note" in body:
        update_data["resolution_note"] = body["resolution_note"]

    rescuer_lat = body.get("rescuer_lat")
    rescuer_lng = body.get("rescuer_lng")
    if rescuer_lat is not None and rescuer_lng is not None:
        update_data["rescuer_lat"] = rescuer_lat
        update_data["rescuer_lng"] = rescuer_lng
        update_data["last_position_at"] = datetime.now(timezone.utc).isoformat()

        target = (
            client.table("profiles")
            .select("lat, lng")
            .eq("id", existing["target_user_id"])
            .limit(1)
            .execute()
        )
        if target.data and len(target.data) > 0 and target.data[0].get("lat") and target.data[0].get("lng"):
            try:
                route = await get_route(
                    rescuer_lat, rescuer_lng,
                    target.data[0]["lat"], target.data[0]["lng"]
                )
                if route:
                    update_data["distance_meters"] = round(route["distance_km"] * 1000)
                    update_data["eta_seconds"] = round(route["duration_min"] * 60)
            except Exception:
                pass

    result = (
        client.table("rescue_assignments")
        .update(update_data)
        .eq("id", assignment_id)
        .execute()
    )
    if not result.data:
        return {"error": "Failed to update assignment"}

    return dict(result.data[0])


async def get_my_assignments(rescuer_id: str, active_only: bool = False) -> dict:
    """Get assignments for the current rescuer"""
    query = (
        client.from_("rescue_assignments")
        .select("*, target:target_user_id(id, full_name, status, barangay, lat, lng, last_seen_at, blood_type, medical_notes, special_needs, special_needs_other, household_size, avatar_url, phone_number)")
        .eq("rescuer_id", rescuer_id)
    )
    if active_only:
        query = query.in_("state", ["en_route", "on_scene"])

    result = query.order("created_at", desc=True).limit(50).execute()
    rows = result.data or []

    return {"data": rows, "total": len(rows)}


async def get_active_for_target(target_user_id: str) -> dict | None:
    """Get active assignment for a target user (used to show 'help is on the way')"""
    result = (
        client.from_("rescue_assignments")
        .select("*, rescuer:rescuer_id(id, full_name, avatar_url, rescuers(id, organization, rescuer_type))")
        .eq("target_user_id", target_user_id)
        .in_("state", ["en_route", "on_scene"])
        .limit(1)
        .execute()
    )
    return dict(result.data[0]) if (result.data and len(result.data) > 0) else None


async def get_rescuer_profile(user_id: str) -> dict | None:
    """Get rescuer's own profile with detail"""
    result = (
        client.from_("profiles")
        .select(RESCUER_DETAIL_FIELDS)
        .eq("id", user_id)
        .limit(1)
        .execute()
    )
    if not result.data or len(result.data) == 0:
        return None

    profile = dict(result.data[0])
    rescuer_data = profile.pop("rescuers", None)
    if rescuer_data and isinstance(rescuer_data, list) and len(rescuer_data) > 0:
        profile.update(rescuer_data[0])
    elif rescuer_data and isinstance(rescuer_data, dict):
        profile.update(rescuer_data)

    try:
        auth_user = client.auth.admin.get_user_by_id(user_id)
        if auth_user and auth_user.user:
            profile["email"] = auth_user.user.email
    except Exception:
        pass

    return profile


async def update_rescuer_profile(user_id: str, body: dict) -> dict:
    """Update rescuer's own profile (both profiles and rescuers tables)"""
    profile_fields = {}
    rescuer_fields = {}

    allowed_profile = ("full_name", "phone_number", "barangay", "avatar_url")
    allowed_rescuer = ("organization", "rescuer_type", "availability", "certification", "contact_number")

    for k, v in body.items():
        if v is not None:
            if k in allowed_profile:
                profile_fields[k] = v
            elif k in allowed_rescuer:
                rescuer_fields[k] = v

    if profile_fields:
        profile_fields["updated_at"] = datetime.now(timezone.utc).isoformat() if "updated_at" not in profile_fields else profile_fields["updated_at"]
        client.table("profiles").update(profile_fields).eq("id", user_id).execute()

    if rescuer_fields:
        rescuer_fields["updated_at"] = datetime.now(timezone.utc).isoformat()
        client.table("rescuers").update(rescuer_fields).eq("id", user_id).execute()

    return await get_rescuer_profile(user_id)


def _haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2) ** 2)
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

from datetime import datetime, timedelta, timezone
from app.core.supabase import client


PROFILE_FIELDS = (
    "id, full_name, status, family_role, lat, lng, last_seen_at, "
    "phone_number, blood_type, medical_notes, special_needs, special_needs_other, "
    "barangay, street_address, gender, date_of_birth, household_size, "
    "external_name, external_phone, relationship, avatar_url"
)


def _get_user_family(user_id: str) -> dict | None:
    result = (
        client.table("profiles")
        .select("family_id")
        .eq("id", user_id)
        .single()
        .execute()
    )
    return result.data if result.data else None


async def get_current_status(user_id: str) -> dict:
    profile = _get_user_family(user_id)
    if not profile or not profile.get("family_id"):
        return {"family_id": None, "family_name": None, "members": []}

    family_id = profile["family_id"]

    family_result = (
        client.table("families")
        .select("name")
        .eq("id", family_id)
        .single()
        .execute()
    )
    family_name = family_result.data["name"] if family_result.data else None

    members_result = (
        client.table("profiles")
        .select(PROFILE_FIELDS)
        .eq("family_id", family_id)
        .order("family_role", desc=True)
        .execute()
    )

    return {
        "family_id": family_id,
        "family_name": family_name,
        "members": members_result.data or [],
    }


async def get_status_history(user_id: str, period: int, since: str | None = None) -> dict:
    profile = _get_user_family(user_id)
    if not profile or not profile.get("family_id"):
        return {"items": [], "total": 0, "period": period}

    family_id = profile["family_id"]

    query = (
        client.table("status_history")
        .select("id, user_id, previous_status, new_status, lat, lng, created_at")
        .eq("family_id", family_id)
        .order("created_at", desc=True)
    )

    if since:
        query = query.gt("created_at", since)
    else:
        cutoff = datetime.now(timezone.utc) - timedelta(days=period)
        query = query.gte("created_at", cutoff.isoformat())

    result = query.execute()
    raw = result.data or []

    if raw:
        user_ids = list({r["user_id"] for r in raw})
        user_map = {}
        for i in range(0, len(user_ids), 50):
            batch = user_ids[i : i + 50]
            users = (
                client.table("profiles")
                .select("id, full_name, avatar_url")
                .in_("id", batch)
                .execute()
            )
            for u in users.data or []:
                user_map[u["id"]] = {
                    "full_name": u.get("full_name"),
                    "avatar_url": u.get("avatar_url"),
                }

        for r in raw:
            info = user_map.get(r["user_id"], {})
            r["full_name"] = info.get("full_name")
            r["avatar_url"] = info.get("avatar_url")

    return {
        "items": raw,
        "total": len(raw),
        "period": period,
    }


async def get_member_profile(user_id: str, target_user_id: str) -> dict | None:
    profile = _get_user_family(user_id)
    if not profile or not profile.get("family_id"):
        return None

    result = (
        client.table("profiles")
        .select(PROFILE_FIELDS)
        .eq("id", target_user_id)
        .eq("family_id", profile["family_id"])
        .single()
        .execute()
    )
    return result.data if result.data else None

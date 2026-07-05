from app.core.supabase import client
from app.models.notification_model import NotifyContactUserModel
from app.services.notification import NotificationService

PROFILE_FIELDS = (
    "id, full_name, status, family_role, lat, lng, last_seen_at, "
    "avatar_url, barangay, street_address, phone_number, "
    "blood_type, medical_notes, special_needs, special_needs_other, "
    "gender, date_of_birth, household_size, "
    "external_name, external_phone, relationship"
)

USER_STATUS_FIELDS = (
    "id, full_name, status, family_role, barangay, "
    "lat, lng, last_seen_at, avatar_url"
)

STATUS_HISTORY_FIELDS = (
    "id, previous_status, new_status, lat, lng, "
    "resolution_note, resolved_by, created_at"
)


async def get_status_overview() -> dict:
    result = client.table("profiles").select("status").execute()
    rows = result.data or []
    counts = {"total": len(rows), "safe": 0, "help": 0, "emergency": 0}
    for r in rows:
        s = r.get("status", "safe")
        if s in counts:
            counts[s] += 1
    return counts


async def get_status_users(status_filter: str | None = None, search: str | None = None) -> dict:
    query = client.from_("profiles").select(USER_STATUS_FIELDS)

    if status_filter and status_filter in ("safe", "help", "emergency"):
        query = query.eq("status", status_filter)

    result = query.order("last_seen_at", desc=True, nullsfirst=False).execute()
    rows = result.data or []

    if search and search.strip():
        q = search.strip().lower()
        rows = [r for r in rows if q in (r.get("full_name") or "").lower() or q in (r.get("barangay") or "").lower()]

    user_ids = [r["id"] for r in rows]
    if user_ids:
        family_names_map = {}
        families_result = (
            client.table("profiles")
            .select("id, family_id, families(name)")
            .in_("id", user_ids)
            .execute()
        )
        for p in families_result.data or []:
            fam = p.get("families")
            if fam:
                family_names_map[p["id"]] = fam.get("name")

        emails_map = {}
        try:
            emails_result = client.rpc("get_all_profiles").execute()
            for e in emails_result.data or []:
                emails_map[e.get("id", "")] = e.get("email")
        except Exception:
            pass

        for r in rows:
            r["family_name"] = family_names_map.get(r["id"])
            r["email"] = emails_map.get(r["id"])

    return {"users": rows, "total": len(rows)}


async def get_status_history(user_id: str) -> dict:
    result = (
        client.table("status_history")
        .select(STATUS_HISTORY_FIELDS)
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(100)
        .execute()
    )
    return {"items": result.data or [], "total": len(result.data or [])}


async def get_user_profile(user_id: str) -> dict | None:
    result = (
        client.table("profiles")
        .select(PROFILE_FIELDS)
        .eq("id", user_id)
        .single()
        .execute()
    )
    if not result.data:
        return None

    profile = dict(result.data)

    fam_result = (
        client.table("profiles")
        .select("family_id, families(name)")
        .eq("id", user_id)
        .single()
        .execute()
    )
    if fam_result.data:
        fam = fam_result.data.get("families")
        if fam:
            profile["family_name"] = fam.get("name")

    try:
        auth_user = client.auth.admin.get_user_by_id(user_id)
        if auth_user and auth_user.user:
            profile["email"] = auth_user.user.email
    except Exception:
        pass

    return profile


async def update_user_status(
    admin_id: str, user_id: str, new_status: str, resolution_note: str | None = None
) -> dict:
    valid_statuses = ("safe", "help", "emergency")
    if new_status not in valid_statuses:
        return {"error": f"Invalid status. Must be one of: {', '.join(valid_statuses)}"}

    existing = (
        client.table("profiles")
        .select("id, status, full_name")
        .eq("id", user_id)
        .single()
        .execute()
    )
    if not existing.data:
        return {"error": "User not found"}

    previous_status = existing.data.get("status")
    user_name = existing.data.get("full_name", "User")

    client.table("profiles").update({"status": new_status}).eq("id", user_id).execute()

    if resolution_note:
        latest = (
            client.table("status_history")
            .select("id")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        if latest.data:
            client.table("status_history").update({
                "resolution_note": resolution_note,
                "resolved_by": admin_id,
            }).eq("id", latest.data[0]["id"]).execute()

    try:
        status_label = new_status.replace("_", " ").title()
        NotificationService.send_alert_notification(
            NotifyContactUserModel(
                user_id=user_id,
                status=new_status,
                body=f"Your status has been updated to '{status_label}' by an administrator.",
                title="Status Updated",
            )
        )
    except Exception:
        pass

    return {"id": user_id, "status": new_status, "previous_status": previous_status}

from app.core.supabase import client


async def get_active_alerts() -> list[dict]:
    try:
        result = (
            client.table("tcws_alerts")
            .select("*")
            .eq("is_active", True)
            .is_("deleted_at", "null")
            .order("signal_level", desc=True)
            .execute()
        )
        return result.data or []
    except Exception as e:
        print(f"Error fetching active alerts: {e}")
        return []


ALLOWED_TCWS_SORT_COLUMNS = {
    "signal_level": "signal_level",
    "area": "area",
    "is_active": "is_active",
    "created_at": "created_at",
}


async def get_all_alerts() -> list[dict]:
    result = (
        client.table("tcws_alerts")
        .select("*")
        .is_("deleted_at", "null")
        .order("created_at", desc=True)
        .execute()
    )
    return result.data or []


async def get_all_alerts_paginated(
    page: int = 1,
    limit: int = 10,
    search: str | None = None,
    order_by: str = "created_at",
    order_dir: str = "DESC",
    include_deleted: bool = False,
) -> dict:
    query = client.table("tcws_alerts").select("*", count="exact")
    if not include_deleted:
        query = query.is_("deleted_at", "null")

    if search and search.strip():
        q = search.strip()
        query = query.or_(f"area.ilike.%{q}%,description.ilike.%{q}%")

    sort_col = ALLOWED_TCWS_SORT_COLUMNS.get(order_by, "created_at")
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
        "alerts": rows,
        "total": total,
        "page": page,
        "limit": limit,
    }


async def create_alert(
    signal_level: int,
    description: str,
    wind_speed: str,
) -> dict:
    insert_result = (
        client.table("tcws_alerts")
        .insert({
            "signal_level": signal_level,
            "area": "Quezon, Tagkawayan",
            "description": description,
            "wind_speed": wind_speed,
        })
        .execute()
    )
    if insert_result.data:
        return insert_result.data[0]

    result = (
        client.table("tcws_alerts")
        .select("*")
        .order("created_at", desc=True)
        .limit(1)
        .single()
        .execute()
    )
    return result.data


async def update_alert(
    alert_id: str,
    signal_level: int | None = None,
    description: str | None = None,
    wind_speed: str | None = None,
    is_active: bool | None = None,
) -> dict:
    updates = {}
    if signal_level is not None:
        updates["signal_level"] = signal_level
    if description is not None:
        updates["description"] = description
    if wind_speed is not None:
        updates["wind_speed"] = wind_speed
    if is_active is not None:
        updates["is_active"] = is_active

    if updates:
        updates["updated_at"] = "now()"
        client.table("tcws_alerts").update(updates).eq("id", alert_id).execute()

    result = (
        client.table("tcws_alerts")
        .select("*")
        .eq("id", alert_id)
        .single()
        .execute()
    )
    return result.data


async def soft_delete_alert(alert_id: str) -> None:
    client.table("tcws_alerts").update(
        {"deleted_at": "now()", "is_active": False}
    ).eq("id", alert_id).execute()


async def restore_alert(alert_id: str) -> None:
    client.table("tcws_alerts").update(
        {"deleted_at": None, "is_active": True}
    ).eq("id", alert_id).execute()

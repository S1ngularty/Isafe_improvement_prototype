from app.core.supabase import client


async def get_active_alerts() -> list[dict]:
    try:
        result = (
            client.table("tcws_alerts")
            .select("*")
            .eq("is_active", True)
            .order("signal_level", desc=True)
            .execute()
        )
        return result.data or []
    except Exception as e:
        print(f"Error fetching active alerts: {e}")
        return []


async def get_all_alerts() -> list[dict]:
    result = (
        client.table("tcws_alerts")
        .select("*")
        .order("created_at", desc=True)
        .execute()
    )
    return result.data or []


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


async def delete_alert(alert_id: str) -> None:
    client.table("tcws_alerts").delete().eq("id", alert_id).execute()

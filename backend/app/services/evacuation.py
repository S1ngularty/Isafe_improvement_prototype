from app.core.supabase import client


async def get_active_evacuation_areas() -> list[dict]:
    result = (
        client.table("evacuation_areas")
        .select("*")
        .eq("status", "active")
        .order("name")
        .execute()
    )
    return result.data or []

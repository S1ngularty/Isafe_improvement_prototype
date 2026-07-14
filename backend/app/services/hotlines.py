from app.core.supabase import client

ALLOWED_SORT_COLUMNS = {
    "name": "name",
    "category": "category",
    "is_active": "is_active",
    "sort_order": "sort_order",
    "created_at": "created_at",
}

PHONE_NUMBER_FIELDS = "id, hotline_id, type, number, sort_order"


def _assemble_hotline(row: dict, phones: list[dict]) -> dict:
    return {
        **row,
        "phone_numbers": sorted(phones, key=lambda p: p.get("sort_order", 0)),
    }


def _fetch_phones(hotline_id: int) -> list[dict]:
    result = (
        client.table("hotline_phone_numbers")
        .select(PHONE_NUMBER_FIELDS)
        .eq("hotline_id", hotline_id)
        .order("sort_order")
        .execute()
    )
    return result.data or []


def _delete_phones(hotline_id: int) -> None:
    client.table("hotline_phone_numbers").delete().eq("hotline_id", hotline_id).execute()


def _insert_phones(hotline_id: int, phones: list[dict]) -> list[dict]:
    if not phones:
        return []
    rows = [
        {
            "hotline_id": hotline_id,
            "type": p.get("type"),
            "number": p["number"],
            "sort_order": p.get("sort_order", 0),
        }
        for p in phones
    ]
    result = client.table("hotline_phone_numbers").insert(rows).execute()
    return result.data or []


async def get_active_hotlines() -> list[dict]:
    result = (
        client.table("hotlines")
        .select("*")
        .eq("is_active", True)
        .is_("deleted_at", "null")
        .order("sort_order")
        .execute()
    )
    rows = result.data or []
    return [_assemble_hotline(r, _fetch_phones(r["id"])) for r in rows]


async def get_all_hotlines() -> list[dict]:
    result = (
        client.table("hotlines")
        .select("*")
        .is_("deleted_at", "null")
        .order("sort_order")
        .execute()
    )
    rows = result.data or []
    return [_assemble_hotline(r, _fetch_phones(r["id"])) for r in rows]


async def get_all_hotlines_paginated(
    page: int = 1,
    limit: int = 10,
    search: str | None = None,
    order_by: str = "sort_order",
    order_dir: str = "ASC",
    include_deleted: bool = False,
) -> dict:
    query = client.table("hotlines").select("*", count="exact")
    if not include_deleted:
        query = query.is_("deleted_at", "null")

    if search and search.strip():
        q = search.strip()
        query = query.or_(f"name.ilike.%{q}%,email.ilike.%{q}%,category.ilike.%{q}%")

    sort_col = ALLOWED_SORT_COLUMNS.get(order_by, "sort_order")
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

    hotlines = [_assemble_hotline(r, _fetch_phones(r["id"])) for r in rows]

    return {
        "hotlines": hotlines,
        "total": total,
        "page": page,
        "limit": limit,
    }


async def create_hotline(
    name: str,
    email: str | None = None,
    website: str | None = None,
    category: str = "general",
    is_active: bool = True,
    sort_order: int = 0,
    phones: list[dict] | None = None,
) -> dict:
    insert_result = (
        client.table("hotlines")
        .insert({
            "name": name,
            "email": email,
            "website": website,
            "category": category,
            "is_active": is_active,
            "sort_order": sort_order,
        })
        .execute()
    )
    if not insert_result.data:
        raise RuntimeError("Failed to create hotline")

    hotline = insert_result.data[0]
    hotline_id = hotline["id"]

    if phones:
        _insert_phones(hotline_id, phones)

    return _assemble_hotline(hotline, _fetch_phones(hotline_id))


async def update_hotline(
    hotline_id: int,
    name: str | None = None,
    email: str | None = None,
    website: str | None = None,
    category: str | None = None,
    is_active: bool | None = None,
    sort_order: int | None = None,
    phones: list[dict] | None = None,
) -> dict:
    updates = {}

    if name is not None:
        updates["name"] = name
    if email is not None:
        updates["email"] = email
    if website is not None:
        updates["website"] = website
    if category is not None:
        updates["category"] = category
    if is_active is not None:
        updates["is_active"] = is_active
    if sort_order is not None:
        updates["sort_order"] = sort_order

    if updates:
        updates["updated_at"] = "now()"
        client.table("hotlines").update(updates).eq("id", hotline_id).is_("deleted_at", "null").execute()

    if phones is not None:
        _delete_phones(hotline_id)
        if phones:
            _insert_phones(hotline_id, phones)

    result = (
        client.table("hotlines")
        .select("*")
        .eq("id", hotline_id)
        .single()
        .execute()
    )
    return _assemble_hotline(result.data, _fetch_phones(hotline_id))


async def soft_delete_hotline(hotline_id: int) -> None:
    client.table("hotlines").update({"deleted_at": "now()"}).eq("id", hotline_id).execute()


async def restore_hotline(hotline_id: int) -> None:
    client.table("hotlines").update({"deleted_at": None}).eq("id", hotline_id).execute()

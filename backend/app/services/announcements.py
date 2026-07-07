import uuid
from datetime import datetime, timezone
from app.core.supabase import client

ALLOWED_SORT_COLUMNS = {
    "title": "title",
    "type": "type",
    "is_active": "is_active",
    "created_at": "created_at",
}

VIDEO_EXTENSIONS = {".mp4", ".webm", ".mov", ".avi"}
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}


def _get_storage():
    return client.storage


def _detect_type(file_name: str | None, content_type: str | None, image_url: str | None) -> str:
    if content_type and content_type.startswith("video/"):
        return "video"
    if content_type and content_type.startswith("image/"):
        return "image"
    if file_name:
        ext = file_name.rsplit(".", 1)[-1].lower() if "." in file_name else ""
        if f".{ext}" in VIDEO_EXTENSIONS:
            return "video"
        if f".{ext}" in IMAGE_EXTENSIONS:
            return "image"
    if image_url:
        url_lower = image_url.rsplit("?", 1)[0].lower()
        for ext in VIDEO_EXTENSIONS:
            if url_lower.endswith(ext):
                return "video"
        for ext in IMAGE_EXTENSIONS:
            if url_lower.endswith(ext):
                return "image"
    return "image"


async def get_active_announcements() -> list[dict]:
    result = (
        client.table("announcements")
        .select("*")
        .eq("is_active", True)
        .is_("deleted_at", "null")
        .order("created_at", desc=True)
        .limit(10)
        .execute()
    )
    return result.data or []


async def get_all_announcements() -> list[dict]:
    result = (
        client.table("announcements")
        .select("*")
        .is_("deleted_at", "null")
        .order("created_at", desc=True)
        .execute()
    )
    return result.data or []


async def get_all_announcements_paginated(
    page: int = 1,
    limit: int = 10,
    search: str | None = None,
    order_by: str = "created_at",
    order_dir: str = "DESC",
) -> dict:
    query = client.table("announcements").select("*", count="exact").is_("deleted_at", "null")

    if search and search.strip():
        q = search.strip()
        query = query.or_(f"title.ilike.%{q}%,description.ilike.%{q}%")

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
        "announcements": rows,
        "total": total,
        "page": page,
        "limit": limit,
    }


async def create_announcement(
    title: str,
    short_description: str,
    long_description: str | None = None,
    file_content: bytes | None = None,
    file_name: str | None = None,
    content_type: str | None = None,
    image_url: str | None = None,
) -> dict:
    final_url = image_url or ""
    announcement_type = _detect_type(file_name, content_type, image_url)

    if file_content and file_name and content_type:
        ext = file_name.rsplit(".", 1)[-1].lower() if "." in file_name else ""
        unique_name = f"{uuid.uuid4()}.{ext}" if ext else f"{uuid.uuid4()}"
        path = f"announcements/{unique_name}"

        storage = _get_storage()
        storage.from_("announcement_media").upload(
            path=path,
            file=file_content,
            file_options={"content-type": content_type},
        )
        bucket_url = client.storage_url
        final_url = f"{bucket_url}/object/public/announcement_media/{path}"
        announcement_type = "video" if content_type.startswith("video/") else "image"

    insert_result = (
        client.table("announcements")
        .insert({
            "title": title,
            "description": short_description,
            "long_description": long_description or "",
            "image_url": final_url,
            "type": announcement_type,
        })
        .execute()
    )
    if insert_result.data:
        return insert_result.data[0]

    result = (
        client.table("announcements")
        .select("*")
        .eq("image_url", final_url)
        .order("created_at", desc=True)
        .limit(1)
        .single()
        .execute()
    )
    return result.data


async def update_announcement(
    announcement_id: str,
    title: str | None = None,
    short_description: str | None = None,
    long_description: str | None = None,
    image_url: str | None = None,
    is_active: bool | None = None,
    file_content: bytes | None = None,
    file_name: str | None = None,
    content_type: str | None = None,
) -> dict:
    updates = {}

    if title is not None:
        updates["title"] = title
    if short_description is not None:
        updates["description"] = short_description
    if long_description is not None:
        updates["long_description"] = long_description
    if image_url is not None:
        updates["image_url"] = image_url
    if is_active is not None:
        updates["is_active"] = is_active

    if file_content and file_name and content_type:
        ext = file_name.rsplit(".", 1)[-1].lower() if "." in file_name else ""
        unique_name = f"{uuid.uuid4()}.{ext}" if ext else f"{uuid.uuid4()}"
        path = f"announcements/{unique_name}"

        storage = _get_storage()
        storage.from_("announcement_media").upload(
            path=path,
            file=file_content,
            file_options={"content-type": content_type},
        )
        bucket_url = client.storage_url
        updates["image_url"] = f"{bucket_url}/object/public/announcement_media/{path}"
        updates["type"] = "video" if content_type.startswith("video/") else "image"

    if updates:
        updates["updated_at"] = datetime.now(timezone.utc).isoformat()
        client.table("announcements").update(updates).eq("id", announcement_id).execute()

    result = (
        client.table("announcements")
        .select("*")
        .eq("id", announcement_id)
        .single()
        .execute()
    )
    return result.data


async def soft_delete_announcement(announcement_id: str) -> None:
    client.table("announcements").update(
        {"deleted_at": datetime.now(timezone.utc).isoformat()}
    ).eq("id", announcement_id).execute()

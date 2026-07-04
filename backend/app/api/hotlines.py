import json
from fastapi import APIRouter, HTTPException, Form
from app.models.hotline import HotlineCreate, HotlineUpdate
from app.services import hotlines as service

router = APIRouter(prefix="/api/hotlines", tags=["hotlines"])


def _parse_phones(raw: str | None) -> list[dict] | None:
    if raw is None:
        return None
    if raw.strip() == "":
        return []
    try:
        parsed = json.loads(raw)
        if not isinstance(parsed, list):
            return []
        return parsed
    except (json.JSONDecodeError, TypeError):
        return []


@router.get("", response_model=dict)
async def list_active():
    data = await service.get_active_hotlines()
    return {"data": data, "error": None}


@router.get("/admin", response_model=dict)
async def list_all():
    data = await service.get_all_hotlines()
    return {"data": data, "error": None}


@router.post("", response_model=dict)
async def create(
    name: str = Form(...),
    phones: str = Form("[]"),
    email: str | None = Form(default=None),
    website: str | None = Form(default=None),
    category: str = Form("general"),
    is_active: bool = Form(True),
    sort_order: int = Form(0),
):
    body = HotlineCreate(
        name=name,
        email=email,
        website=website,
        category=category,
        is_active=is_active,
        sort_order=sort_order,
    )

    parsed_phones = _parse_phones(phones)

    try:
        data = await service.create_hotline(
            name=body.name,
            email=body.email,
            website=body.website,
            category=body.category,
            is_active=body.is_active,
            sort_order=body.sort_order,
            phones=parsed_phones,
        )
        return {"data": data, "error": None}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{hotline_id}", response_model=dict)
async def update(
    hotline_id: int,
    name: str | None = Form(default=None),
    phones: str | None = Form(default=None),
    email: str | None = Form(default=None),
    website: str | None = Form(default=None),
    category: str | None = Form(default=None),
    is_active: bool | None = Form(default=None),
    sort_order: int | None = Form(default=None),
):
    body = HotlineUpdate(
        name=name,
        email=email,
        website=website,
        category=category,
        is_active=is_active,
        sort_order=sort_order,
    )

    parsed_phones = _parse_phones(phones)

    try:
        data = await service.update_hotline(
            hotline_id=hotline_id,
            name=body.name,
            email=body.email,
            website=body.website,
            category=body.category,
            is_active=body.is_active,
            sort_order=body.sort_order,
            phones=parsed_phones,
        )
        return {"data": data, "error": None}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{hotline_id}", response_model=dict)
async def delete(hotline_id: int):
    try:
        await service.soft_delete_hotline(hotline_id)
        return {"data": None, "error": None}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

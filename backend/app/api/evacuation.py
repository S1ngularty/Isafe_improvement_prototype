from fastapi import APIRouter
from app.services.evacuation import get_active_evacuation_areas

router = APIRouter(prefix="/api/evacuation-areas", tags=["evacuation"])


@router.get("", response_model=dict)
async def list_evacuation_areas():
    data = await get_active_evacuation_areas()
    return {"data": data, "error": None}

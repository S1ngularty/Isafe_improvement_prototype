from fastapi import APIRouter, HTTPException, Query
from app.services.evacuation import get_active_evacuation_areas
from app.services.evacuation import get_nearest_evacuation_areas

router = APIRouter(prefix="/api/evacuation-areas", tags=["evacuation"])

@router.get("/nearest")
async def nearest_evacuation_areas(
    lat: float = Query(..., ge=-90, le=90),
    lng: float = Query(..., ge=-180, le=180),
    limit: int = Query(5, ge=1, le=10),
):
    try:
        results = await get_nearest_evacuation_areas(lat, lng, limit)
        return {"data": results, "error": None}
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Evacuation service unavailable: {str(exc)}")


@router.get("", response_model=dict)
async def list_evacuation_areas():
    data = await get_active_evacuation_areas()
    return {"data": data, "error": None}

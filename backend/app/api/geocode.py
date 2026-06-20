from fastapi import APIRouter, Query, HTTPException
from app.services.geocode import search_address as search_svc, reverse_geocode as reverse_svc

router = APIRouter(prefix="/api/geocode", tags=["geocode"])


@router.get("/search")
async def geocode_search(q: str = Query(..., min_length=1)):
    try:
        results = await search_svc(q)
        return {"data": results, "error": None}
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Geocoding service unavailable: {str(e)}")


@router.get("/reverse")
async def geocode_reverse(
    lat: float = Query(..., ge=-90, le=90),
    lng: float = Query(..., ge=-180, le=180),
):
    try:
        result = await reverse_svc(lat, lng)
        return {"data": result, "error": None}
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Geocoding service unavailable: {str(e)}")

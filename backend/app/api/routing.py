from fastapi import APIRouter, Query, HTTPException
from app.services.routing import get_route

router = APIRouter(prefix="/api/routing", tags=["routing"])


@router.get("/route")
async def route_between(
    from_lat: float = Query(..., ge=-90, le=90),
    from_lng: float = Query(..., ge=-180, le=180),
    to_lat: float = Query(..., ge=-90, le=90),
    to_lng: float = Query(..., ge=-180, le=180),
):
    try:
        result = await get_route(from_lat, from_lng, to_lat, to_lng)
        if not result:
            return {"data": None, "error": {"code": "NO_ROUTE", "message": "No route found."}}
        return {"data": result, "error": None}
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Routing service unavailable: {str(e)}")

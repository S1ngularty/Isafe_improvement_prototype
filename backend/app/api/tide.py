from fastapi import APIRouter, Header, HTTPException
from app.services.tide import get_tide_data, refresh_tide_data

router = APIRouter(prefix="/api/tide", tags=["tide"])


@router.get("", response_model=dict)
async def fetch_tide_data():
    try:
        data = await get_tide_data()
        if data is None:
            return {"data": None, "error": {"code": "NOT_FOUND", "message": "No tide data available yet. Trigger a refresh first."}}
        return {"data": data, "error": None}
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Tide data service unavailable: {str(e)}")


@router.post("/refresh", response_model=dict)
async def trigger_tide_refresh(x_api_key: str = Header(None)):
    try:
        data = await refresh_tide_data()
        return {"data": data, "error": None}
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Tide refresh failed: {str(e)}")

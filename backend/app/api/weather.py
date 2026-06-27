from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel, Field
from app.services.weather import fetch_weather
from app.services.rainviewer import get_radar_frames

router = APIRouter(prefix="/api/weather", tags=["weather"])


class CurrentResponse(BaseModel):
    temperature: int
    rain: float
    precipitation: float
    windSpeed: int
    windGusts: int
    pressure: int
    weatherCode: int


class HourlyPoint(BaseModel):
    time: str
    precipitation: float
    rain: float
    windSpeed: int
    windGusts: int
    pressure: int
    weatherCode: int


class WeatherResponse(BaseModel):
    temperature: int
    rain: float
    precipitation: float
    windSpeed: int
    windGusts: int
    pressure: int
    weatherCode: int
    hourly: list[HourlyPoint] = Field(default_factory=list)


@router.get("/current", response_model=dict)
async def current_weather(
    lat: float = Query(..., ge=-90, le=90),
    lng: float = Query(..., ge=-180, le=180),
):
    try:
        data = await fetch_weather(lat, lng, include_hourly=False)
        return {"data": data, "error": None}
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Weather service unavailable: {str(e)}")


@router.get("/hourly", response_model=dict)
async def hourly_weather(
    lat: float = Query(..., ge=-90, le=90),
    lng: float = Query(..., ge=-180, le=180),
):
    try:
        data = await fetch_weather(lat, lng, include_hourly=True)
        return {"data": data, "error": None}
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Weather service unavailable: {str(e)}")


@router.get("/radar", response_model=dict)
async def radar_frames():
    try:
        data = await get_radar_frames()
        return {"data": data, "error": None}
    except Exception as e:
        return {"data": None, "error": {"code": "RADAR_ERROR", "message": str(e)}}

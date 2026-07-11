import time
import httpx
from app.core.config import WEATHER_CACHE_TTL

CACHE = {}
OPEN_METEO_BASE = "https://api.open-meteo.com/v1/forecast"


async def fetch_weather(lat, lng, include_hourly=False, include_daily=False):
    key = f"{round(lat, 2)},{round(lng, 2)}:{'h' if include_hourly else ''}{'d' if include_daily else ''}"
    now = time.time()

    if key in CACHE and now - CACHE[key]["ts"] < WEATHER_CACHE_TTL:
        return CACHE[key]["data"]

    params = {
        "latitude": lat,
        "longitude": lng,
        "current": "temperature_2m,rain,precipitation,wind_speed_10m,wind_gusts_10m,surface_pressure,weather_code",
        "timezone": "Asia/Manila",
        "forecast_days": "7" if include_daily else "1",
    }

    if include_hourly:
        params["hourly"] = "precipitation,rain,wind_speed_10m,wind_gusts_10m,surface_pressure,weather_code"
    
    if include_daily:
        params["daily"] = "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max"

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(OPEN_METEO_BASE, params=params, timeout=10.0)
            resp.raise_for_status()
            data = _parse_response(resp.json(), include_hourly, include_daily)
    except Exception as e:
        print(f"Error fetching weather: {e}")
        data = _parse_response({}, include_hourly, include_daily)

    CACHE[key] = {"ts": now, "data": data}
    return data


def _parse_response(body, include_hourly, include_daily):
    current = body.get("current", {})
    result = {
        "temperature": round(current.get("temperature_2m", 0)),
        "rain": current.get("rain") or 0,
        "precipitation": current.get("precipitation") or 0,
        "windSpeed": round(current.get("wind_speed_10m", 0)),
        "windGusts": round(current.get("wind_gusts_10m", 0)),
        "pressure": round(current.get("surface_pressure", 0)),
        "weatherCode": current.get("weather_code", 0),
    }

    if include_hourly:
        hourly = body.get("hourly", {})
        times = hourly.get("time", [])
        result["hourly"] = [
            {
                "time": times[i],
                "precipitation": (hourly.get("precipitation") or [])[i] if i < len(hourly.get("precipitation") or []) else 0,
                "rain": (hourly.get("rain") or [])[i] if i < len(hourly.get("rain") or []) else 0,
                "windSpeed": round((hourly.get("wind_speed_10m") or [])[i]) if i < len(hourly.get("wind_speed_10m") or []) else 0,
                "windGusts": round((hourly.get("wind_gusts_10m") or [])[i]) if i < len(hourly.get("wind_gusts_10m") or []) else 0,
                "pressure": round((hourly.get("surface_pressure") or [])[i]) if i < len(hourly.get("surface_pressure") or []) else 0,
                "weatherCode": (hourly.get("weather_code") or [])[i] if i < len(hourly.get("weather_code") or []) else 0,
            }
            for i in range(min(24, len(times)))
        ]
        
    if include_daily:
        daily = body.get("daily", {})
        times = daily.get("time", [])
        result["daily"] = [
            {
                "time": times[i],
                "weatherCode": (daily.get("weather_code") or [])[i] if i < len(daily.get("weather_code") or []) else 0,
                "tempMax": round((daily.get("temperature_2m_max") or [])[i]) if i < len(daily.get("temperature_2m_max") or []) else 0,
                "tempMin": round((daily.get("temperature_2m_min") or [])[i]) if i < len(daily.get("temperature_2m_min") or []) else 0,
                "precipitation": (daily.get("precipitation_sum") or [])[i] if i < len(daily.get("precipitation_sum") or []) else 0,
                "windSpeedMax": round((daily.get("wind_speed_10m_max") or [])[i]) if i < len(daily.get("wind_speed_10m_max") or []) else 0,
            }
            for i in range(len(times))
        ]

    return result

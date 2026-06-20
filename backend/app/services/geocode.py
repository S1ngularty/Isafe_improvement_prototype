import time
import asyncio
from app.core.config import GEOCACHE_TTL, NOMINATIM_RATE_LIMIT, NOMINATIM_USER_AGENT

CACHE = {}
_last_call = 0.0
_lock = asyncio.Lock()
SEARCH_URL = "https://nominatim.openstreetmap.org/search"
REVERSE_URL = "https://nominatim.openstreetmap.org/reverse"


async def search_address(query):
    if not query or len(query.strip()) < 3:
        return []

    q = query.strip().lower()
    now = time.time()
    if q in CACHE and now - CACHE[q]["ts"] < GEOCACHE_TTL:
        return CACHE[q]["data"]

    await _throttle()

    import httpx

    headers = {"User-Agent": NOMINATIM_USER_AGENT}
    params = {
        "q": q,
        "format": "jsonv2",
        "limit": 5,
        "countrycodes": "ph",
        "addressdetails": "1",
    }

    async with httpx.AsyncClient() as client:
        resp = await client.get(SEARCH_URL, params=params, headers=headers, timeout=10.0)
        resp.raise_for_status()
        data = resp.json()

    result = [
        {
            "lat": float(r["lat"]),
            "lng": float(r["lon"]),
            "display_name": r["display_name"],
        }
        for r in data
    ]

    CACHE[q] = {"ts": now, "data": result}
    return result


async def reverse_geocode(lat, lng):
    coord_key = f"{round(lat, 4)},{round(lng, 4)}"
    now = time.time()
    if coord_key in CACHE and now - CACHE[coord_key]["ts"] < GEOCACHE_TTL:
        return CACHE[coord_key]["data"]

    await _throttle()

    import httpx

    headers = {"User-Agent": NOMINATIM_USER_AGENT}
    params = {"lat": lat, "lon": lng, "format": "jsonv2"}

    async with httpx.AsyncClient() as client:
        resp = await client.get(REVERSE_URL, params=params, headers=headers, timeout=10.0)
        resp.raise_for_status()
        data = resp.json()

    result = {
        "lat": float(data.get("lat", lat)),
        "lng": float(data.get("lon", lng)),
        "display_name": data.get("display_name", ""),
    }

    CACHE[coord_key] = {"ts": now, "data": result}
    return result


async def _throttle():
    global _last_call
    async with _lock:
        now = time.time()
        elapsed = now - _last_call
        if elapsed < NOMINATIM_RATE_LIMIT:
            await asyncio.sleep(NOMINATIM_RATE_LIMIT - elapsed)
        _last_call = time.time()

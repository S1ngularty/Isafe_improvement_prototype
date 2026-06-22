import time
import asyncio

CACHE = {}
_last_call = 0.0
_lock = asyncio.Lock()
OSRM_BASE = "https://router.project-osrm.org/route/v1/driving"
ROUTE_CACHE_TTL = 300


async def get_route(from_lat, from_lng, to_lat, to_lng, include_steps=False):
    key = f"{round(from_lat,4)},{round(from_lng,4)}-{round(to_lat,4)},{round(to_lng,4)}:{'s' if include_steps else 'r'}"
    now = time.time()

    if key in CACHE and now - CACHE[key]["ts"] < ROUTE_CACHE_TTL:
        return CACHE[key]["data"]

    await _throttle()

    url = f"{OSRM_BASE}/{from_lng},{from_lat};{to_lng},{to_lat}"
    params = {"geometries": "geojson", "overview": "full", "steps": "true" if include_steps else "false"}

    import httpx

    async with httpx.AsyncClient() as client:
        resp = await client.get(url, params=params, timeout=15.0)
        resp.raise_for_status()
        body = resp.json()

    if body.get("code") != "Ok" or not body.get("routes"):
        return None

    route = body["routes"][0]
    geom = route.get("geometry", {}).get("coordinates", [])
    coordinates = [[c[1], c[0]] for c in geom]
    distance_km = round(route.get("distance", 0) / 1000, 2)
    duration_min = round(route.get("duration", 0) / 60, 1)

    result = {
        "coordinates": coordinates,
        "distance_km": distance_km,
        "duration_min": duration_min,
    }

    if include_steps:
        result["steps"] = _parse_steps(route)

    CACHE[key] = {"ts": now, "data": result}
    return result


def _parse_steps(route):
    legs = route.get("legs", [])
    steps = []
    for leg in legs:
        for step in leg.get("steps", []):
            maneuver = step.get("maneuver", {})
            steps.append({
                "instruction": step.get("instruction", ""),
                "distance_m": round(step.get("distance", 0)),
                "duration_s": round(step.get("duration", 0)),
                "name": step.get("name", ""),
                "maneuver_type": maneuver.get("type", ""),
                "maneuver_modifier": maneuver.get("modifier", ""),
            })
    return steps


async def _throttle():
    global _last_call
    async with _lock:
        now = time.time()
        elapsed = now - _last_call
        if elapsed < 1.0:
            await asyncio.sleep(1.0 - elapsed)
        _last_call = time.time()

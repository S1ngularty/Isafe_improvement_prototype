import time
import httpx

RAINVIEWER_URL = "https://api.rainviewer.com/public/weather-maps.json"
CACHE_TTL = 300
_cache = {"ts": 0, "data": None}


async def get_radar_frames() -> dict:
    now = time.time()
    if _cache["data"] and now - _cache["ts"] < CACHE_TTL:
        return _cache["data"]

    async with httpx.AsyncClient() as client:
        resp = await client.get(RAINVIEWER_URL, timeout=15.0)
        resp.raise_for_status()
        body = resp.json()

    host = body.get("host", "")
    past = body.get("radar", {}).get("past", [])
    nowcast = body.get("radar", {}).get("nowcast", [])

    frames = []
    for item in past + nowcast:
        frames.append({
            "time": item["time"],
            "tile_url": f"{host}{item['path']}/256/{{z}}/{{x}}/{{y}}/2/1_1.png",
        })

    result = {
        "host": host,
        "generated": body.get("generated", 0),
        "frames": frames,
    }

    _cache["ts"] = now
    _cache["data"] = result
    return result

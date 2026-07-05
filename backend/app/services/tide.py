import time
import httpx

from app.core.config import TIDECHECK_API_KEY, TIDECHECK_API_URL, TIDECHECK_DEFAULT_PARAMS, TIDE_CACHE_TTL
from app.core.supabase import get_client

CACHE = {}

TIDECHECK_HEADERS = {
    "X-API-Key": TIDECHECK_API_KEY,
}

TIDECHECK_TIMEOUT = 15.0


async def get_tide_data():
    now = time.time()

    if CACHE and now - CACHE.get("_ts", 0) < TIDE_CACHE_TTL:
        return CACHE["data"]

    client = get_client()
    if not client:
        if CACHE:
            return CACHE["data"]
        return None

    result = client.table("tide_data").select("json_data,updated_at").eq("id", 1).execute()
    rows = result.data
    if not rows:
        if CACHE:
            return CACHE["data"]
        return None

    row = rows[0]
    payload = row["json_data"]
    payload["_updated_at"] = row["updated_at"]

    CACHE["_ts"] = now
    CACHE["data"] = payload

    return payload


async def refresh_tide_data():
    async with httpx.AsyncClient() as http:
        resp = await http.get(
            TIDECHECK_API_URL,
            params=TIDECHECK_DEFAULT_PARAMS,
            headers=TIDECHECK_HEADERS,
            timeout=TIDECHECK_TIMEOUT,
        )
        resp.raise_for_status()
        body = resp.json()

    client = get_client()
    if client:
        now_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        client.table("tide_data").upsert(
            {"id": 1, "json_data": body, "updated_at": now_iso},
            on_conflict="id",
        ).execute()

    body["_updated_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    CACHE["_ts"] = time.time()
    CACHE["data"] = body

    return body

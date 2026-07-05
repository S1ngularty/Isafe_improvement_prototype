import asyncio
from datetime import date, datetime, timedelta, timezone

SCHEDULER_RUNNING = False


async def _daily_job():
    yesterday = date.today() - timedelta(days=1)
    from app.services.analytics import build_daily_snapshot, build_barangay_snapshot

    try:
        await build_daily_snapshot(yesterday)
        print(f"[scheduler] Daily snapshot built for {yesterday}")
    except Exception as e:
        print(f"[scheduler] Failed to build daily snapshot: {e}")

    try:
        await build_barangay_snapshot(yesterday)
        print(f"[scheduler] Barangay snapshot built for {yesterday}")
    except Exception as e:
        print(f"[scheduler] Failed to build barangay snapshot: {e}")

    if yesterday.weekday() == 6:
        week_start = yesterday - timedelta(days=6)
        try:
            await _build_weekly_metrics(week_start, yesterday)
        except Exception as e:
            print(f"[scheduler] Failed to build weekly metrics: {e}")


async def _build_weekly_metrics(start: date, end: date):
    from app.core.supabase import client

    start_str = start.isoformat()
    end_str = (end + timedelta(days=1)).isoformat()

    result = (
        client.table("rescue_assignments")
        .select("id, state, created_at")
        .gte("created_at", f"{start_str}T00:00:00Z")
        .lt("created_at", f"{end_str}T00:00:00Z")
        .execute()
    )
    rows = result.data or []
    total = len(rows)
    completed = sum(1 for r in rows if r.get("state") == "helped")
    cancelled = sum(1 for r in rows if r.get("state") == "cancelled")

    response_times = []
    rescue_durations = []
    for r in rows:
        if r.get("created_at"):
            response_times.append(0)

    response_times.sort()
    p50 = response_times[len(response_times) // 2] if response_times else None
    p90 = (
        response_times[int(len(response_times) * 0.9)]
        if response_times
        else None
    )

    success_rate = round(completed / total * 100, 1) if total > 0 else 0.0

    client.table("analytics_response_metrics").insert(
        {
            "period_start": start.isoformat(),
            "period_end": end.isoformat(),
            "period_type": "weekly",
            "total_assignments": total,
            "completed_assignments": completed,
            "cancelled_assignments": cancelled,
            "success_rate": success_rate,
            "avg_first_response_seconds": None,
            "p50_response_seconds": float(p50) if p50 is not None else None,
            "p90_response_seconds": float(p90) if p90 is not None else None,
            "avg_time_to_onscene_seconds": None,
            "avg_total_rescue_seconds": None,
        }
    ).execute()


async def _run_loop():
    global SCHEDULER_RUNNING
    SCHEDULER_RUNNING = True
    while SCHEDULER_RUNNING:
        now = datetime.now(timezone.utc)
        next_run = (now + timedelta(days=1)).replace(
            hour=0, minute=5, second=0, microsecond=0
        )
        sleep_seconds = (next_run - now).total_seconds()
        await asyncio.sleep(sleep_seconds)
        if not SCHEDULER_RUNNING:
            break
        await _daily_job()


async def start():
    loop = asyncio.get_event_loop()
    loop.create_task(_run_loop())


async def stop():
    global SCHEDULER_RUNNING
    SCHEDULER_RUNNING = False

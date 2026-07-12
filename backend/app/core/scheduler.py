import asyncio
from datetime import date, datetime, timedelta, timezone

SCHEDULER_RUNNING = False

TIDE_ALERT_HOURS = [0, 4, 10]  # UTC — corresponds to 8am, 12pm, 6pm PHT


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


async def _send_tide_alerts():
    from app.services.tide import get_tide_data, get_current_tide_status
    from app.integrations.expo_push import send_expo_push
    from app.core.supabase import client

    try:
        data = await get_tide_data()
        if data is None:
            print("[scheduler] No tide data available for alert")
            return

        status = get_current_tide_status(data)
        if status is None or status["next"] is None:
            print("[scheduler] Could not compute tide status for alert")
            return

        current = status["current"]
        next_extreme = status["next"]
        direction = "Rising" if status["rising"] else "Falling"
        current_type = "High" if current["type"] == "high" else "Low"
        next_type = "high" if next_extreme["type"] == "high" else "low"
        next_time = _format_local_time(next_extreme.get("localTime", ""))

        title = "Tide update"
        body = (
            f"Current status: {current_type} tide - {direction} at "
            f"{current['height']}m. Next {next_type} tide at {next_time}"
        )

        subscribed = client.table("profiles").select("id").eq("tide_alerts_enabled", True).execute()
        subscribed_ids = [row["id"] for row in (subscribed.data or [])]
        if not subscribed_ids:
            print("[scheduler] No subscribed users for tide alert")
            return

        tokens_result = client.table("notification").select("push_token").in_("user_id", subscribed_ids).execute()
        tokens = [row["push_token"] for row in (tokens_result.data or []) if row.get("push_token")]
        if not tokens:
            print("[scheduler] No push tokens for subscribed users")
            return

        for token in tokens:
            try:
                send_expo_push(token=token, title=title, body=body)
            except Exception as e:
                print(f"[scheduler] Failed to send push to token: {e}")

        print(f"[scheduler] Tide alert sent to {len(tokens)} devices: {body}")

    except Exception as e:
        print(f"[scheduler] Failed to send tide alert: {e}")


def _format_local_time(local_time_str):
    try:
        dt = datetime.fromisoformat(local_time_str)
        return dt.strftime("%I:%M %p").lstrip("0")
    except (ValueError, TypeError):
        return local_time_str


def _next_tide_alert_delay():
    now = datetime.now(timezone.utc)
    today = now.date()
    for h in TIDE_ALERT_HOURS:
        target = datetime(today.year, today.month, today.day, h, 0, 0, tzinfo=timezone.utc)
        if target > now:
            return (target - now).total_seconds()
    tomorrow = today + timedelta(days=1)
    target = datetime(tomorrow.year, tomorrow.month, tomorrow.day, TIDE_ALERT_HOURS[0], 0, 0, tzinfo=timezone.utc)
    return (target - now).total_seconds()


async def _tide_alert_loop():
    global SCHEDULER_RUNNING
    while SCHEDULER_RUNNING:
        delay = _next_tide_alert_delay()
        await asyncio.sleep(delay)
        if not SCHEDULER_RUNNING:
            break
        await _send_tide_alerts()


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
    loop.create_task(_tide_alert_loop())


async def stop():
    global SCHEDULER_RUNNING
    SCHEDULER_RUNNING = False

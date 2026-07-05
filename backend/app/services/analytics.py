import math
from datetime import date, datetime, timedelta, timezone

from app.core.supabase import client
from app.core.cache import cached
from app.models.analytics import (
    KpiResponse,
    DailyTrendItem,
    TrendResponse,
    HeatmapPoint,
    HeatmapResponse,
    TemporalHeatmapResponse,
    ResponseTimeDay,
    ResponseTimeResponse,
    BarangayStatsItem,
    BarangayResponse,
    RescuerPerformanceItem,
    RescuerPerformanceResponse,
    DemographicResponse,
    EvacuationUtilizationItem,
    EvacuationResponse,
    RecentActivityItem,
    RecentActivityResponse,
)

PROFILE_BASE_FIELDS = (
    "id, status, is_active, barangay_id, lat, lng, "
    "special_needs, date_of_birth, gender, blood_type, "
    "medical_notes, household_size"
)


def _haversine_meters(lat1, lng1, lat2, lng2):
    R = 6371000
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(
        math.radians(lat2)
    ) * math.sin(dlng / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


def _calculate_age(dob_str):
    if not dob_str:
        return None
    try:
        dob = datetime.strptime(dob_str, "%Y-%m-%d").date()
        today = date.today()
        return today.year - dob.year - (
            (today.month, today.day) < (dob.month, dob.day)
        )
    except (ValueError, TypeError):
        return None


def _age_group(age):
    if age is None:
        return "unknown"
    if age < 18:
        return "0-17"
    if age < 35:
        return "18-34"
    if age < 50:
        return "35-49"
    if age < 65:
        return "50-64"
    return "65+"


# ---- KPI ----

@cached(ttl=120)
async def get_kpi() -> KpiResponse:
    profiles = (client.table("profiles").select(PROFILE_BASE_FIELDS).execute())
    rows = profiles.data or []
    total = len(rows)
    active = sum(1 for r in rows if r.get("is_active"))
    safe = sum(1 for r in rows if r.get("status") == "safe")
    help_ct = sum(1 for r in rows if r.get("status") == "help")
    emergency = sum(1 for r in rows if r.get("status") == "emergency")

    vulnerable = sum(
        1
        for r in rows
        if r.get("special_needs")
        or (
            r.get("date_of_birth")
            and (age := _calculate_age(r["date_of_birth"])) is not None
            and (age < 5 or age > 60)
        )
    )

    rescuers_result = client.table("rescuers").select("availability").execute()
    rescuers = rescuers_result.data or []
    active_rescuers = len(rescuers)
    available = sum(
        1 for r in rescuers if r.get("availability") in ("available", "on_duty")
    )

    today_str = date.today().isoformat()
    today_start = f"{today_str}T00:00:00Z"
    yesterday_start = (date.today() - timedelta(days=1)).isoformat() + "T00:00:00Z"

    status_today = (
        client.table("status_history")
        .select("id, new_status, created_at")
        .gte("created_at", today_start)
        .execute()
    )
    sh_rows = status_today.data or []
    new_incidents = sum(
        1 for r in sh_rows if r.get("new_status") in ("help", "emergency")
    )
    resolved = sum(
        1 for r in sh_rows if r.get("new_status") == "safe"
    )

    rescue_today = (
        client.table("rescue_assignments")
        .select("id, state")
        .gte("created_at", today_start)
        .execute()
    )
    ra_rows = rescue_today.data or []
    rescues_created = len(ra_rows)
    rescues_completed = sum(
        1 for r in ra_rows if r.get("state") == "helped"
    )

    ra_yesterday = (
        client.table("rescue_assignments")
        .select("id, created_at, target_user_id, status_history_id")
        .gte("created_at", yesterday_start)
        .lt("created_at", today_start)
        .execute()
    )
    ra_yesterday_rows = ra_yesterday.data or []

    sh_yesterday = (
        client.table("status_history")
        .select("id, created_at, user_id")
        .in_(
            "id",
            [r["status_history_id"] for r in ra_yesterday_rows if r.get("status_history_id")],
        )
        .execute()
    ) if any(r.get("status_history_id") for r in ra_yesterday_rows) else type("Empty", (), {"data": []})()

    response_times = []
    sh_map = {r["id"]: r for r in (sh_yesterday.data or [])}
    for ra in ra_yesterday_rows:
        sh_id = ra.get("status_history_id")
        if sh_id and sh_id in sh_map:
            delta = (
                datetime.fromisoformat(ra["created_at"].replace("Z", "+00:00"))
                - datetime.fromisoformat(
                    sh_map[sh_id]["created_at"].replace("Z", "+00:00")
                )
            )
            response_times.append(delta.total_seconds())

    avg_response = (
        round(sum(response_times) / len(response_times), 1)
        if response_times
        else None
    )

    tcws_result = (
        client.table("tcws_alerts")
        .select("id")
        .eq("is_active", True)
        .execute()
    )
    active_tcws = len(tcws_result.data or [])

    emergency_rate = round(emergency / total * 100, 1) if total > 0 else 0.0
    rescuer_ratio = round(available / emergency, 2) if emergency > 0 else float("inf")
    vulnerable_pct = round(vulnerable / total * 100, 1) if total > 0 else 0.0
    resolution_rate = (
        round(resolved / (new_incidents + resolved) * 100, 1)
        if (new_incidents + resolved) > 0
        else None
    )

    return KpiResponse(
        total_users=total,
        active_users=active,
        users_safe=safe,
        users_help=help_ct,
        users_emergency=emergency,
        emergency_rate=emergency_rate,
        active_rescuers=active_rescuers,
        available_rescuers=available,
        rescuer_to_victim_ratio=rescuer_ratio,
        today_new_incidents=new_incidents,
        today_resolved=resolved,
        today_rescues_created=rescues_created,
        today_rescues_completed=rescues_completed,
        avg_response_seconds=avg_response,
        avg_resolution_seconds=None,
        resolution_rate=resolution_rate,
        vulnerable_percentage=vulnerable_pct,
        active_tcws_count=active_tcws,
    )


# ---- TRENDS ----

@cached(ttl=300)
async def get_trends(days: int = 30) -> TrendResponse:
    start_date = date.today() - timedelta(days=days - 1)
    start_str = start_date.isoformat()
    result = (
        client.table("analytics_daily_snapshot")
        .select("*")
        .gte("date", start_str)
        .order("date", desc=False)
        .execute()
    )
    snapshot_map = {r["date"]: r for r in (result.data or [])}

    today_live = await _get_today_live()
    items = []
    current = start_date
    while current <= date.today():
        row = snapshot_map.get(current.isoformat()) or {}
        if current == date.today() and today_live:
            items.append(
                DailyTrendItem(
                    date=current,
                    new_incidents=today_live["new_incidents"],
                    resolved_incidents=today_live["resolved"],
                    rescue_assignments_created=today_live["rescues_created"],
                    rescue_assignments_completed=today_live["rescues_completed"],
                    avg_response_seconds=today_live.get("avg_response"),
                )
            )
        else:
            items.append(
                DailyTrendItem(
                    date=current,
                    new_incidents=row.get("new_incidents", 0),
                    resolved_incidents=row.get("resolved_incidents", 0),
                    rescue_assignments_created=row.get(
                        "rescue_assignments_created", 0
                    ),
                    rescue_assignments_completed=row.get(
                        "rescue_assignments_completed", 0
                    ),
                    avg_response_seconds=row.get("avg_first_response_seconds"),
                )
            )
        current += timedelta(days=1)

    return TrendResponse(days=items)


async def _get_today_live():
    today_str = date.today().isoformat()
    today_start = f"{today_str}T00:00:00Z"

    sh = (
        client.table("status_history")
        .select("id, new_status")
        .gte("created_at", today_start)
        .execute()
    )
    sh_rows = sh.data or []
    new_incidents = sum(1 for r in sh_rows if r.get("new_status") in ("help", "emergency"))
    resolved = sum(1 for r in sh_rows if r.get("new_status") == "safe")

    ra = (
        client.table("rescue_assignments")
        .select("id, state")
        .gte("created_at", today_start)
        .execute()
    )
    ra_rows = ra.data or []
    rescues_created = len(ra_rows)
    rescues_completed = sum(1 for r in ra_rows if r.get("state") == "helped")

    return {
        "new_incidents": new_incidents,
        "resolved": resolved,
        "rescues_created": rescues_created,
        "rescues_completed": rescues_completed,
        "avg_response": None,
    }


# ---- HEATMAP ----

@cached(ttl=60)
async def get_heatmap(hours: int = 24) -> HeatmapResponse:
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=hours)).isoformat()
    result = (
        client.table("status_history")
        .select("lat, lng, new_status, created_at")
        .gte("created_at", cutoff)
        .order("created_at", desc=True)
        .limit(500)
        .execute()
    )
    rows = result.data or []
    now = datetime.now(timezone.utc)
    points = []
    for r in rows:
        lat = r.get("lat")
        lng = r.get("lng")
        if lat is None or lng is None:
            continue

        if r["new_status"] == "emergency":
            base_weight = 1.0
        elif r["new_status"] == "help":
            base_weight = 0.5
        else:
            base_weight = 0.3

        created = r.get("created_at")
        if created:
            try:
                created_dt = datetime.fromisoformat(
                    created.replace("Z", "+00:00")
                )
                hours_ago = (now - created_dt).total_seconds() / 3600
                if hours_ago < 4:
                    recency = 1.5
                elif hours_ago < 12:
                    recency = 1.0
                else:
                    recency = 0.6
            except (ValueError, TypeError):
                recency = 0.6
        else:
            recency = 0.6

        weight = round(base_weight * recency, 3)
        points.append(HeatmapPoint(lat=float(lat), lng=float(lng), weight=weight))

    return HeatmapResponse(points=points, total=len(points))


# ---- TEMPORAL HEATMAP ----

@cached(ttl=300)
async def get_temporal_heatmap() -> TemporalHeatmapResponse:
    DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    matrix = [[0.0] * 24 for _ in range(7)]

    cutoff = (datetime.now(timezone.utc) - timedelta(days=90)).isoformat()
    result = (
        client.table("status_history")
        .select("created_at, new_status")
        .gte("created_at", cutoff)
        .execute()
    )
    rows = result.data or []
    for r in rows:
        created = r.get("created_at")
        if not created:
            continue
        try:
            dt = datetime.fromisoformat(created.replace("Z", "+00:00"))
        except (ValueError, TypeError):
            continue
        dow = dt.weekday()
        hour = dt.hour
        weight = 1.5 if r.get("new_status") == "emergency" else 1.0 if r.get("new_status") == "help" else 0.5
        matrix[dow][hour] += weight

    max_val = max((max(row) for row in matrix), default=1.0)
    if max_val > 0:
        for i in range(7):
            for j in range(24):
                matrix[i][j] = round(matrix[i][j] / max_val, 3)

    return TemporalHeatmapResponse(
        hours=list(range(24)),
        days=DAY_NAMES,
        values=matrix,
    )


# ---- RESPONSE TIMES ----

@cached(ttl=900)
async def get_response_times(days: int = 30) -> ResponseTimeResponse:
    start_date = date.today() - timedelta(days=days - 1)
    start_str = start_date.isoformat()
    result = (
        client.table("analytics_daily_snapshot")
        .select("*")
        .gte("date", start_str)
        .order("date", desc=False)
        .execute()
    )
    rows = result.data or []
    day_items = []
    for r in rows:
        day_items.append(
            ResponseTimeDay(
                date=datetime.strptime(r["date"], "%Y-%m-%d").date(),
                avg_response_seconds=r.get("avg_first_response_seconds"),
                p90_response_seconds=r.get("p90_first_response_seconds"),
                avg_time_to_onscene_seconds=r.get("avg_time_to_onscene_seconds"),
                avg_total_rescue_seconds=r.get("avg_total_rescue_seconds"),
            )
        )

    return ResponseTimeResponse(days=day_items)


# ---- BARANGAY STATS ----

@cached(ttl=300)
async def get_barangay_stats() -> BarangayResponse:
    today_str = date.today().isoformat()
    result = (
        client.table("analytics_barangay_snapshot")
        .select("*, barangays!inner(name)")
        .eq("date", today_str)
        .order("total_users", desc=True)
        .execute()
    )
    rows = result.data or []

    if not rows:
        latest_date_result = (
            client.table("analytics_barangay_snapshot")
            .select("date")
            .order("date", desc=True)
            .limit(1)
            .execute()
        )
        if latest_date_result.data:
            latest_date = latest_date_result.data[0]["date"]
            rows = (
                client.table("analytics_barangay_snapshot")
                .select("*, barangays!inner(name)")
                .eq("date", latest_date)
                .order("total_users", desc=True)
                .execute()
            ).data or []

    barangays = []
    for r in rows:
        total = r.get("total_users", 0)
        emergency = r.get("users_emergency", 0)
        barangays.append(
            BarangayStatsItem(
                barangay=r.get("barangays", {}).get("name", "Unknown"),
                total_users=total,
                users_emergency=emergency,
                users_help=r.get("users_help", 0),
                users_safe=r.get("users_safe", 0),
                vulnerable_users=r.get("vulnerable_users", 0),
                incidents_today=r.get("incidents_today", 0),
                resolved_today=r.get("resolved_today", 0),
                emergency_rate=round(emergency / total * 100, 1) if total > 0 else 0.0,
            )
        )

    return BarangayResponse(barangays=barangays)


# ---- RESCUER PERFORMANCE ----

@cached(ttl=300)
async def get_rescuer_performance() -> RescuerPerformanceResponse:
    result = client.table("vw_rescuer_performance").select("*").execute()
    rows = result.data or []
    rescuers = [
        RescuerPerformanceItem(
            rescuer_id=r["rescuer_id"],
            full_name=r.get("full_name"),
            rescuer_type=r.get("rescuer_type", "general"),
            organization=r.get("organization"),
            total_assignments=r.get("total_assignments", 0),
            helped_count=r.get("helped_count", 0),
            cancelled_count=r.get("cancelled_count", 0),
            success_rate=r.get("success_rate", 0.0),
        )
        for r in rows
    ]
    return RescuerPerformanceResponse(rescuers=rescuers)


# ---- DEMOGRAPHICS ----

@cached(ttl=1800)
async def get_demographics() -> DemographicResponse:
    result = (
        client.table("profiles")
        .select(
            "gender, blood_type, date_of_birth, special_needs, special_needs_other"
        )
        .execute()
    )
    rows = result.data or []

    gender_counts: dict[str, int] = {}
    blood_counts: dict[str, int] = {}
    age_group_counts: dict[str, int] = {"0-17": 0, "18-34": 0, "35-49": 0, "50-64": 0, "65+": 0, "unknown": 0}
    special_needs_counts: dict[str, int] = {}
    vulnerable_count = 0

    for r in rows:
        g = r.get("gender") or "unknown"
        gender_counts[g] = gender_counts.get(g, 0) + 1

        bt = r.get("blood_type") or "unknown"
        blood_counts[bt] = blood_counts.get(bt, 0) + 1

        age = _calculate_age(r.get("date_of_birth"))
        ag = _age_group(age)
        age_group_counts[ag] = age_group_counts.get(ag, 0) + 1

        needs = r.get("special_needs")
        if needs:
            vulnerable_count += 1
            if isinstance(needs, list):
                for n in needs:
                    label = str(n) if isinstance(n, str) else n.get("label", str(n)) if isinstance(n, dict) else str(n)
                    special_needs_counts[label] = special_needs_counts.get(label, 0) + 1
            elif isinstance(needs, str):
                for item in needs.split(","):
                    item = item.strip()
                    if item:
                        special_needs_counts[item] = special_needs_counts.get(item, 0) + 1

        if age is not None and (age < 5 or age > 60):
            vulnerable_count += 1

    return DemographicResponse(
        total_users=len(rows),
        by_gender=gender_counts,
        by_blood_type=blood_counts,
        by_age_group=age_group_counts,
        vulnerable_count=vulnerable_count,
        special_needs_breakdown=special_needs_counts,
    )


# ---- EVACUATION STATUS ----

@cached(ttl=300)
async def get_evacuation_status() -> EvacuationResponse:
    areas_result = (
        client.table("evacuation_areas")
        .select("id, name, latitude, longitude, capacity, status")
        .eq("status", "active")
        .is_("deleted_at", "null")
        .execute()
    )
    areas = areas_result.data or []

    profiles_result = (
        client.table("profiles")
        .select("id, lat, lng")
        .not_.is_("lat", "null")
        .not_.is_("lng", "null")
        .execute()
    )
    profiles = profiles_result.data or []

    centers = []
    for area in areas:
        lat = area.get("latitude")
        lng = area.get("longitude")
        if lat is None or lng is None:
            continue

        within_1km = 0
        within_2km = 0
        for p in profiles:
            pl = p.get("lat")
            pn = p.get("lng")
            if pl is None or pn is None:
                continue
            dist = _haversine_meters(float(lat), float(lng), float(pl), float(pn))
            if dist <= 2000:
                within_2km += 1
                if dist <= 1000:
                    within_1km += 1

        capacity = area.get("capacity") or 0
        utilization = round(within_1km / capacity * 100, 1) if capacity > 0 else 0.0

        centers.append(
            EvacuationUtilizationItem(
                id=area["id"],
                name=area["name"],
                capacity=capacity,
                users_within_1km=within_1km,
                users_within_2km=within_2km,
                utilization_pct=min(utilization, 100.0),
                status=area.get("status", "active"),
            )
        )

    centers.sort(key=lambda c: c.utilization_pct, reverse=True)
    return EvacuationResponse(centers=centers)


# ---- RECENT ACTIVITY ----

@cached(ttl=120)
async def get_recent_activity(limit: int = 20) -> RecentActivityResponse:
    result = (
        client.table("status_history")
        .select("id, user_id, new_status, created_at")
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    rows = result.data or []

    user_ids = list(set(r["user_id"] for r in rows if r.get("user_id")))
    user_map = {}
    if user_ids:
        profiles = (
            client.table("profiles")
            .select("id, full_name, barangay_id, barangays(name)")
            .in_("id", user_ids)
            .execute()
        )
        for p in profiles.data or []:
            p["barangay_name"] = (p.get("barangays") or {}).get("name")
            user_map[p["id"]] = p

    items = []
    for r in rows:
        profile = user_map.get(r.get("user_id", "")) or {}
        items.append(
            RecentActivityItem(
                id=r["id"],
                full_name=profile.get("full_name"),
                new_status=r.get("new_status", "safe"),
                created_at=r.get("created_at", ""),
                barangay=profile.get("barangay_name"),
            )
        )

    return RecentActivityResponse(items=items, total=len(items))


# ---- SCHEDULER BUILDERS ----

async def build_daily_snapshot(target_date: date):
    date_str = target_date.isoformat()
    day_start = f"{date_str}T00:00:00Z"
    day_end = (target_date + timedelta(days=1)).isoformat() + "T00:00:00Z"

    status_day = (
        client.table("status_history")
        .select("id, new_status")
        .gte("created_at", day_start)
        .lt("created_at", day_end)
        .execute()
    )
    sh_rows = status_day.data or []
    new_incidents = sum(1 for r in sh_rows if r.get("new_status") in ("help", "emergency"))
    resolved = sum(1 for r in sh_rows if r.get("new_status") == "safe")

    rescue_day = (
        client.table("rescue_assignments")
        .select("id, state")
        .gte("created_at", day_start)
        .lt("created_at", day_end)
        .execute()
    )
    ra_rows = rescue_day.data or []
    rescues_created = len(ra_rows)
    rescues_completed = sum(1 for r in ra_rows if r.get("state") == "helped")
    rescues_cancelled = sum(1 for r in ra_rows if r.get("state") == "cancelled")

    ra_with_sh = (
        client.table("rescue_assignments")
        .select("id, created_at, status_history_id")
        .gte("created_at", day_start)
        .lt("created_at", day_end)
        .not_.is_("status_history_id", "null")
        .execute()
    )
    ra_sh_rows = ra_with_sh.data or []
    sh_ids = [r["status_history_id"] for r in ra_sh_rows if r.get("status_history_id")]

    avg_first_response = None
    if sh_ids:
        sh_result = (
            client.table("status_history")
            .select("id, created_at")
            .in_("id", sh_ids)
            .execute()
        )
        sh_map = {r["id"]: r for r in (sh_result.data or [])}
        diffs = []
        for ra in ra_sh_rows:
            sh = sh_map.get(ra["status_history_id"])
            if sh and sh.get("created_at"):
                try:
                    ra_dt = datetime.fromisoformat(ra["created_at"].replace("Z", "+00:00"))
                    sh_dt = datetime.fromisoformat(sh["created_at"].replace("Z", "+00:00"))
                    diffs.append((ra_dt - sh_dt).total_seconds())
                except (ValueError, TypeError):
                    pass
        if diffs:
            avg_first_response = round(sum(diffs) / len(diffs), 1)
            diffs.sort()
            p90_first_response = round(diffs[int(len(diffs) * 0.9)], 1)
        else:
            p90_first_response = None

    avg_onscene = None
    avg_total = None
    resolved_ra = [
        r for r in ra_rows if r.get("state") in ("helped", "cancelled")
    ]
    if resolved_ra:
        ra_detail = (
            client.table("rescue_assignments")
            .select("id, created_at, resolved_at, state")
            .in_("id", [r["id"] for r in resolved_ra])
            .execute()
        )
        total_diffs = []
        for r in (ra_detail.data or []):
            if r.get("resolved_at") and r.get("created_at"):
                try:
                    created = datetime.fromisoformat(r["created_at"].replace("Z", "+00:00"))
                    resolved_at = datetime.fromisoformat(r["resolved_at"].replace("Z", "+00:00"))
                    total_diffs.append((resolved_at - created).total_seconds())
                except (ValueError, TypeError):
                    pass
        if total_diffs:
            avg_total = round(sum(total_diffs) / len(total_diffs), 1)

    payload = {
        "date": date_str,
        "new_incidents": new_incidents,
        "resolved_incidents": resolved,
        "rescue_assignments_created": rescues_created,
        "rescue_assignments_completed": rescues_completed,
        "rescue_assignments_cancelled": rescues_cancelled,
        "avg_first_response_seconds": avg_first_response,
        "p90_first_response_seconds": p90_first_response,
        "avg_time_to_onscene_seconds": avg_onscene,
        "avg_total_rescue_seconds": avg_total,
    }
    try:
        client.table("analytics_daily_snapshot").upsert(
            payload, ignore_duplicates=False
        ).execute()
    except Exception:
        payload.pop("p90_first_response_seconds", None)
        client.table("analytics_daily_snapshot").upsert(
            payload, ignore_duplicates=False
        ).execute()


async def build_barangay_snapshot(target_date: date):
    date_str = target_date.isoformat()

    # Fetch all canonical barangays
    brgy_result = client.table("barangays").select("id, name").execute()
    all_barangays = brgy_result.data or []

    # Fetch all profiles — group by barangay_id
    profiles = (
        client.table("profiles")
        .select("id, status, barangay_id, special_needs, date_of_birth")
        .execute()
    )
    rows = profiles.data or []

    barangay_data: dict[int, dict] = {}
    for r in rows:
        b_id = r.get("barangay_id")
        if not b_id:
            continue
        if b_id not in barangay_data:
            barangay_data[b_id] = {
                "total": 0,
                "emergency": 0,
                "help": 0,
                "safe": 0,
                "vulnerable": 0,
            }
        d = barangay_data[b_id]
        d["total"] += 1
        status = r.get("status")
        if status == "emergency":
            d["emergency"] += 1
        elif status == "help":
            d["help"] += 1
        else:
            d["safe"] += 1
        if r.get("special_needs") or (
            r.get("date_of_birth")
            and (age := _calculate_age(r["date_of_birth"])) is not None
            and (age < 5 or age > 60)
        ):
            d["vulnerable"] += 1

    day_start = f"{date_str}T00:00:00Z"
    day_end = (target_date + timedelta(days=1)).isoformat() + "T00:00:00Z"
    status_day = (
        client.table("status_history")
        .select("id, new_status, user_id")
        .gte("created_at", day_start)
        .lt("created_at", day_end)
        .execute()
    )
    sh_rows = status_day.data or []

    user_barangay_id = {r["id"]: r.get("barangay_id") for r in rows}

    barangay_incidents: dict[int, int] = {}
    barangay_resolved: dict[int, int] = {}
    for sh in sh_rows:
        b_id = user_barangay_id.get(sh.get("user_id"))
        if not b_id:
            continue
        if sh.get("new_status") in ("help", "emergency"):
            barangay_incidents[b_id] = barangay_incidents.get(b_id, 0) + 1
        elif sh.get("new_status") == "safe":
            barangay_resolved[b_id] = barangay_resolved.get(b_id, 0) + 1

    rows_to_upsert = []
    for brgy in all_barangays:
        b_id = brgy["id"]
        d = barangay_data.get(b_id, {})
        rows_to_upsert.append(
            {
                "date": date_str,
                "barangay_id": b_id,
                "total_users": d.get("total", 0),
                "users_emergency": d.get("emergency", 0),
                "users_help": d.get("help", 0),
                "users_safe": d.get("safe", 0),
                "vulnerable_users": d.get("vulnerable", 0),
                "incidents_today": barangay_incidents.get(b_id, 0),
                "resolved_today": barangay_resolved.get(b_id, 0),
            }
        )

    if rows_to_upsert:
        client.table("analytics_barangay_snapshot").upsert(
            rows_to_upsert, ignore_duplicates=False
        ).execute()


# ---- BACKFILL ----

async def backfill_all():
    result = (
        client.table("status_history")
        .select("created_at")
        .order("created_at", desc=False)
        .limit(1)
        .execute()
    )
    earliest_data = result.data
    if not earliest_data:
        return {"days_processed": 0, "status": "no_data"}

    try:
        earliest = datetime.fromisoformat(
            earliest_data[0]["created_at"].replace("Z", "+00:00")
        ).date()
    except (ValueError, TypeError):
        return {"days_processed": 0, "status": "invalid_date"}

    today = date.today()
    current = earliest
    count = 0
    while current < today:
        await build_daily_snapshot(current)
        await build_barangay_snapshot(current)
        count += 1
        current += timedelta(days=1)

    return {"days_processed": count, "status": "complete"}

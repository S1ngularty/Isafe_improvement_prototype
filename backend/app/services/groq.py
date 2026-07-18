import os
import hashlib
import json
import re
from groq import Groq

GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
_cache = {}


def _weather_code_description(code: int) -> str:
    if code == 0:
        return "clear sky"
    if code <= 3:
        return "partly cloudy"
    if code <= 48:
        return "foggy conditions"
    if code <= 55:
        return "drizzle"
    if code <= 65:
        return "rain"
    if code <= 82:
        return "heavy rain"
    return "thunderstorm"


def _build_prompt(current: dict, hourly: list[dict], language: str) -> str:
    temp = current.get("temperature", "?")
    rain = current.get("rain", 0)
    precip = current.get("precipitation", 0)
    wind = current.get("windSpeed", "?")
    gusts = current.get("windGusts", "?")
    pressure = current.get("pressure", "?")
    weather_desc = _weather_code_description(current.get("weatherCode", 0))

    temps = [h.get("temperature", 0) for h in hourly if h.get("temperature") is not None]
    min_temp = int(min(temps)) if temps else "?"
    max_temp = int(max(temps)) if temps else "?"

    peak_precip = 0.0
    peak_precip_time = "N/A"
    for h in hourly:
        p = h.get("precipitation", 0) or 0
        if p > peak_precip:
            peak_precip = p
            peak_precip_time = h.get("time", "N/A")

    peak_wind = max((h.get("windSpeed", 0) or 0) for h in hourly) if hourly else 0

    pressures = [h.get("pressure", 0) for h in hourly if h.get("pressure") is not None]
    if len(pressures) >= 2:
        trend = "falling" if pressures[-1] < pressures[0] else "rising" if pressures[-1] > pressures[0] else "stable"
    else:
        trend = "stable"

    lang_name = "English" if language == "en" else "Filipino/Tagalog"

    return f"""You are a disaster preparedness assistant for the Philippines. Analyze the following weather data and provide a concise, actionable summary for residents.

Current conditions: {temp}°C, rainfall {rain}mm, precipitation {precip}mm, wind {wind}km/h, gusts {gusts}km/h, pressure {pressure}hPa, {weather_desc}.
24-hour forecast: temperature range {min_temp}-{max_temp}°C, peak rainfall {peak_precip}mm at {peak_precip_time}, peak wind {peak_wind}km/h, pressure trend: {trend}.

Provide in {lang_name}:
1. Overall assessment (1-2 sentences)
2. Risks and concerns (1-2 sentences)
3. Recommended actions (1-2 sentences)
Keep it concise — maximum 6 sentences total. No greetings, no sign-off."""


def _make_cache_key(current: dict, hourly: list[dict], language: str) -> str:
    raw = json.dumps({"c": current, "h": hourly[:6], "l": language}, sort_keys=True)
    return hashlib.sha256(raw.encode()).hexdigest()


async def analyze_weather(current: dict, hourly: list[dict], language: str) -> str:
    cache_key = _make_cache_key(current, hourly, language)
    if cache_key in _cache:
        return _cache[cache_key]

    prompt = _build_prompt(current, hourly, language)
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise RuntimeError("GROQ_API_KEY is not set")

    client = Groq(api_key=api_key)
    completion = client.chat.completions.create(
        model=GROQ_MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=1,
        max_completion_tokens=1024,
        top_p=1,
        stream=True,
        stop=None,
    )

    text_parts = []
    for chunk in completion:
        delta = chunk.choices[0].delta.content
        if delta:
            text_parts.append(delta)

    result = "".join(text_parts).strip()
    _cache[cache_key] = result
    return result


def _build_flood_prompt(barangay: str, data: dict, language: str) -> str:
    risk_level = data.get("risk_level", "Unknown")
    pct_high = data.get("pct_high", 0)
    pct_medium = data.get("pct_medium", 0)
    pct_total = data.get("pct_total_hazard", 0)
    hazard_ha = data.get("total_hazard_has", 0)
    area_ha = data.get("barangay_area_has", 0)

    lang_name = "English" if language == "en" else "Filipino/Tagalog"
    lang_note = "Use simple Filipino/Tagalog that is easy to understand." if language == "fil" else ""

    return f"""You are a disaster preparedness assistant for the Philippines. A user has selected barangay "{barangay}" in Tagkawayan, Quezon which is classified as {risk_level} risk for flooding.

Hazard data for {barangay}:
- High hazard coverage: {pct_high:.1f}%
- Medium hazard coverage: {pct_medium:.1f}%
- Total hazard coverage: {pct_total:.1f}%
- Hazard area affected: {hazard_ha:.1f} hectares
- Total barangay area: {area_ha:.1f} hectares

Provide in {lang_name}:
1. What the flood risk means for this specific barangay (1-2 sentences)
2. Specific actions residents should take before and during a flood (2-3 sentences)
3. Survival tips including emergency kit items and important contacts (1-2 sentences)

{lang_note}
Keep it concise — maximum 6 sentences total. No greetings, no sign-off."""


def _make_flood_cache_key(barangay: str, data: dict, language: str) -> str:
    raw = json.dumps({"b": barangay, "d": {k: v for k, v in data.items() if k in ("risk_level", "pct_high", "pct_medium", "pct_total_hazard", "total_hazard_has", "barangay_area_has")}, "l": language}, sort_keys=True)
    return hashlib.sha256(raw.encode()).hexdigest()


async def analyze_flood_hazard(barangay: str, data: dict, language: str) -> str:
    cache_key = _make_flood_cache_key(barangay, data, language)
    if cache_key in _cache:
        return _cache[cache_key]

    prompt = _build_flood_prompt(barangay, data, language)
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise RuntimeError("GROQ_API_KEY is not set")

    client = Groq(api_key=api_key)
    completion = client.chat.completions.create(
        model=GROQ_MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=1,
        max_completion_tokens=1024,
        top_p=1,
        stream=True,
        stop=None,
    )

    text_parts = []
    for chunk in completion:
        delta = chunk.choices[0].delta.content
        if delta:
            text_parts.append(delta)

    result = "".join(text_parts).strip()
    _cache[cache_key] = result
    return result


def _build_analytics_prompt(
    kpi: dict, trends: dict, barangay: dict,
    response_times: dict, demographics: dict,
    rescuer_perf: dict, temporal: dict,
    heatmap_data: dict, language: str,
) -> str:
    total = kpi.get("total_users", 0)
    emergency = kpi.get("users_emergency", 0)
    help_ct = kpi.get("users_help", 0)
    safe = kpi.get("users_safe", 0)
    emergency_rate = kpi.get("emergency_rate", 0)
    vulnerable_pct = kpi.get("vulnerable_percentage", 0)
    avg_response = kpi.get("avg_response_seconds")
    resolution_rate = kpi.get("resolution_rate")
    available = kpi.get("available_rescuers", 0)
    rescuer_ratio = kpi.get("rescuer_to_victim_ratio", 0)
    today_incidents = kpi.get("today_new_incidents", 0)
    today_resolved = kpi.get("today_resolved", 0)
    active_tcws = kpi.get("active_tcws_count", 0)

    trend_days = trends.get("days", [])
    recent = [d for d in trend_days if d.get("date")]
    recent_7 = recent[-7:] if len(recent) >= 7 else recent
    prev_7 = recent[-14:-7] if len(recent) >= 14 else []
    recent_avg = sum(d.get("new_incidents", 0) for d in recent_7) / max(len(recent_7), 1)
    prev_avg = sum(d.get("new_incidents", 0) for d in prev_7) / max(len(prev_7), 1)
    trend_dir = "rising" if recent_avg > prev_avg * 1.1 else "falling" if recent_avg < prev_avg * 0.9 else "stable"

    brgy_list = barangay.get("barangays", [])
    sorted_brgy = sorted(brgy_list, key=lambda b: b.get("emergency_rate", 0), reverse=True)
    top3 = sorted_brgy[:3]

    rt_days = response_times.get("days", [])
    rt_recent = [d for d in rt_days if d.get("avg_response_seconds") is not None]
    if len(rt_recent) >= 2:
        rt_latest = rt_recent[-1].get("avg_response_seconds", 0)
        rt_earliest = rt_recent[0].get("avg_response_seconds", 0)
        rt_trend = "improving" if rt_latest < rt_earliest else "worsening" if rt_latest > rt_earliest else "stable"
    else:
        rt_trend = "stable"
    rt_avg = rt_recent[-1].get("avg_response_seconds") if rt_recent else None
    rt_p90 = rt_recent[-1].get("p90_response_seconds") if rt_recent else None

    demo_total = demographics.get("total_users", 0)
    by_gender = demographics.get("by_gender", {})
    by_blood = demographics.get("by_blood_type", {})
    by_age = demographics.get("by_age_group", {})
    vulnerable_count = demographics.get("vulnerable_count", 0)
    special_needs = demographics.get("special_needs_breakdown", {})
    gender_male = by_gender.get("male", 0)
    gender_female = by_gender.get("female", 0)
    top_blood = max(by_blood, key=by_blood.get) if by_blood else "N/A"
    top_age = max(by_age, key=by_age.get) if by_age else "N/A"
    top_needs = max(special_needs, key=special_needs.get) if special_needs else None

    rescuer_list = rescuer_perf.get("rescuers", [])
    total_rescuers = len(rescuer_list)
    avg_success = (
        sum(r.get("success_rate", 0) for r in rescuer_list) / total_rescuers
        if total_rescuers > 0 else 0
    )
    top_rescuer = max(rescuer_list, key=lambda r: r.get("helped_count", 0)) if rescuer_list else None

    temporal_values = temporal.get("values", [])
    if temporal_values:
        flat = [(d, h, temporal_values[d][h]) for d in range(len(temporal_values)) for h in range(len(temporal_values[d]))]
        peak = max(flat, key=lambda x: x[2])
        DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        peak_day = DAY_NAMES[peak[0]] if peak[0] < len(DAY_NAMES) else "?"
        peak_hour = f"{peak[1]}:00"
    else:
        peak_day = "N/A"
        peak_hour = "N/A"

    lang_name = "English" if language == "en" else "Filipino/Tagalog"
    lang_note = "Use simple Filipino/Tagalog that is easy to understand." if language == "fil" else ""

    hm_points = heatmap_data.get("points", [])
    hm_total = heatmap_data.get("total", len(hm_points))
    hm_avg_weight = round(sum(p.get("weight", 0) for p in hm_points) / max(len(hm_points), 1), 3) if hm_points else 0
    hm_emergency = sum(1 for p in hm_points if p.get("weight", 0) >= 0.75)
    hm_help = sum(1 for p in hm_points if 0.4 <= p.get("weight", 0) < 0.75)
    hm_safe = sum(1 for p in hm_points if p.get("weight", 0) < 0.4)

    top3_lines = "\n".join(
        f"- {b.get('barangay', 'Unknown')}: {b.get('emergency_rate', 0):.1f}% emergency rate, {b.get('vulnerable_users', 0)} vulnerable, {b.get('incidents_today', 0)} incidents today"
        for b in top3
    )

    response_str = (
        f"{avg_response / 60:.1f} minutes" if avg_response is not None else "N/A"
    )
    rt_str = f"{rt_avg:.0f}s" if rt_avg is not None else "N/A"
    p90_str = f"{rt_p90:.0f}s" if rt_p90 is not None else "N/A"

    top_rescuer_str = (
        f"{top_rescuer.get('full_name', 'Unknown')} ({top_rescuer.get('helped_count', 0)} helped, {top_rescuer.get('success_rate', 0)*100:.0f}% success)"
        if top_rescuer else "N/A"
    )

    top_needs_str = f"{top_needs}" if top_needs else "none"

    return f"""You are a disaster operations analyst for the Philippines. Analyze the following operational dashboard data and provide a structured briefing for emergency response commanders.

CURRENT SNAPSHOT:
- Total users: {total} | Emergency: {emergency} ({emergency_rate}%) | Help: {help_ct} | Safe: {safe}
- Vulnerable population: {vulnerable_pct}%
- Today's incidents: {today_incidents} new, {today_resolved} resolved
- Available rescuers: {available} | Rescuer-to-victim ratio: {rescuer_ratio}
- Average response time: {response_str}
- Resolution rate: {resolution_rate}%
- Active weather alerts (TCWS): {active_tcws}

30-DAY TREND: Incidents are {trend_dir} (recent 7-day avg: {recent_avg:.1f}/day vs previous: {prev_avg:.1f}/day).

RESPONSE TIMES: Trend is {rt_trend}. Latest avg: {rt_str}, P90: {p90_str}.

DEMOGRAPHICS: {demo_total} total. Gender: {gender_male}M/{gender_female}F. Top blood type: {top_blood}. Largest age group: {top_age}. Vulnerable: {vulnerable_count}. Special needs: {top_needs_str}.

RESCUER PERFORMANCE: {total_rescuers} rescuers, avg success rate {avg_success*100:.0f}%. Top performer: {top_rescuer_str}.

TEMPORAL PATTERNS: Peak activity on {peak_day} at {peak_hour}.

INCIDENT HEATMAP (24h): {hm_total} total points, avg severity {hm_avg_weight}. Emergency-grade: {hm_emergency}, Help: {hm_help}, Safe: {hm_safe}.

TOP-3 MOST AFFECTED BARANGAYS:
{top3_lines}

Provide in {lang_name}. Use the following format with exact markers — each marker on its own line, followed by the content, then a blank line:

===EXECUTIVE_SUMMARY===
4-6 sentence overall assessment covering situation, risks, and recommended actions.

===STATUS_DISTRIBUTION===
Exactly one sentence interpreting the Safe/Help/Emergency distribution.

===INCIDENT_TREND===
Exactly one sentence on whether incidents are rising, falling, or stable.

===TEMPORAL_HEATMAP===
Exactly one sentence on peak activity times and patterns.

===RESPONSE_TIMES===
Exactly one sentence on response time performance and trend.

===BARANGAY===
Exactly one sentence on the most affected barangays.

===RESCUER_PERFORMANCE===
Exactly one sentence on rescuer effectiveness.

===BLOOD_TYPE===
Exactly one sentence on blood type distribution and its implications.

===INCIDENT_HEATMAP===
Exactly one sentence on geographic incident density and severity hotspots over the last 24 hours.

===AGE_GROUPS===
Exactly one sentence on age group distribution and vulnerable populations.

{lang_note}
Each chart insight must be exactly one sentence. No greetings, no sign-off."""


def _make_analytics_cache_key(
    kpi: dict, trends: dict, barangay: dict,
    response_times: dict, demographics: dict,
    rescuer_perf: dict, temporal: dict,
    heatmap_data: dict, language: str,
) -> str:
    kpi_keys = ("total_users", "users_emergency", "users_help", "users_safe", "emergency_rate", "vulnerable_percentage", "avg_response_seconds", "resolution_rate", "available_rescuers", "rescuer_to_victim_ratio", "today_new_incidents", "today_resolved", "active_tcws_count")
    raw = json.dumps({
        "k": {k: v for k, v in kpi.items() if k in kpi_keys},
        "t": [{"date": d.get("date"), "new_incidents": d.get("new_incidents")} for d in (trends.get("days") or [])[-14:]],
        "b": [{"barangay": b.get("barangay"), "emergency_rate": b.get("emergency_rate"), "vulnerable_users": b.get("vulnerable_users"), "incidents_today": b.get("incidents_today")} for b in sorted((barangay.get("barangays") or []), key=lambda x: x.get("emergency_rate", 0), reverse=True)[:5]],
        "rt": [{"avg_response_seconds": d.get("avg_response_seconds"), "p90_response_seconds": d.get("p90_response_seconds")} for d in (response_times.get("days") or [])[-7:]],
        "d": {k: demographics.get(k) for k in ("total_users", "by_gender", "by_blood_type", "by_age_group", "vulnerable_count", "special_needs_breakdown") if k in demographics},
        "rp": [{"helped_count": r.get("helped_count"), "success_rate": r.get("success_rate")} for r in (rescuer_perf.get("rescuers") or [])],
        "tp": temporal.get("values", []),
        "hm": {"total": heatmap_data.get("total", len(heatmap_data.get("points", []))), "weights": [round(p.get("weight", 0), 2) for p in (heatmap_data.get("points") or [])[:50]]},
        "l": language,
    }, sort_keys=True)
    return hashlib.sha256(raw.encode()).hexdigest()


_SECTIONS = [
    "EXECUTIVE_SUMMARY", "STATUS_DISTRIBUTION", "INCIDENT_TREND",
    "TEMPORAL_HEATMAP", "RESPONSE_TIMES", "BARANGAY",
    "RESCUER_PERFORMANCE", "BLOOD_TYPE", "AGE_GROUPS",
    "INCIDENT_HEATMAP",
]


def _parse_analytics_response(text: str) -> dict:
    result = {}
    for section in _SECTIONS:
        pattern = rf"==={section}===\s*\n(.*?)(?:\n\n|\n===|$)"
        match = re.search(pattern, text, re.DOTALL)
        if match:
            result[section.lower()] = match.group(1).strip()
    executive = result.pop("executive_summary", "")
    raw_insights = result
    return {
        "executive_summary": executive,
        "chart_insights": {
            "status_distribution": raw_insights.get("status_distribution", ""),
            "incident_trend": raw_insights.get("incident_trend", ""),
            "temporal_heatmap": raw_insights.get("temporal_heatmap", ""),
            "response_times": raw_insights.get("response_times", ""),
            "barangay": raw_insights.get("barangay", ""),
            "rescuer_performance": raw_insights.get("rescuer_performance", ""),
            "blood_type": raw_insights.get("blood_type", ""),
            "age_groups": raw_insights.get("age_groups", ""),
            "incident_heatmap": raw_insights.get("incident_heatmap", ""),
        },
    }


async def analyze_analytics(
    kpi: dict, trends: dict, barangay: dict,
    response_times: dict | None = None,
    demographics: dict | None = None,
    rescuer_perf: dict | None = None,
    temporal: dict | None = None,
    heatmap_data: dict | None = None,
    language: str = "en",
) -> dict:
    response_times = response_times or {}
    demographics = demographics or {}
    rescuer_perf = rescuer_perf or {}
    temporal = temporal or {}
    heatmap_data = heatmap_data or {}

    cache_key = _make_analytics_cache_key(kpi, trends, barangay, response_times, demographics, rescuer_perf, temporal, heatmap_data, language)
    if cache_key in _cache:
        return _cache[cache_key]

    prompt = _build_analytics_prompt(kpi, trends, barangay, response_times, demographics, rescuer_perf, temporal, heatmap_data, language)
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise RuntimeError("GROQ_API_KEY is not set")

    client = Groq(api_key=api_key)
    completion = client.chat.completions.create(
        model=GROQ_MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=1,
        max_completion_tokens=1024,
        top_p=1,
        stream=True,
        stop=None,
    )

    text_parts = []
    for chunk in completion:
        delta = chunk.choices[0].delta.content
        if delta:
            text_parts.append(delta)

    result = "".join(text_parts).strip()
    parsed = _parse_analytics_response(result)
    _cache[cache_key] = parsed
    return parsed

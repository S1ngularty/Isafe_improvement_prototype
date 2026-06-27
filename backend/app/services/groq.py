import os
import hashlib
import json
from groq import Groq

GROQ_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"
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

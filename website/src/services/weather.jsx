const API_BASE = "https://api.open-meteo.com/v1/forecast";

const CURRENT_PARAMS =
  "temperature_2m,rain,precipitation,wind_speed_10m,wind_gusts_10m,surface_pressure,weather_code";

const HOURLY_PARAMS =
  "precipitation,rain,wind_speed_10m,wind_gusts_10m,surface_pressure,weather_code";

export function getWeatherIcon(code) {
  if (code === 0) return ClearSkyIcon;
  if (code <= 3) return PartlyCloudyIcon;
  if (code <= 48) return FogIcon;
  if (code <= 55) return DrizzleIcon;
  if (code <= 65) return RainIcon;
  if (code <= 82) return HeavyRainIcon;
  return ThunderstormIcon;
}

function ClearSkyIcon() {
  return (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <circle cx="12" cy="12" r="5" strokeWidth="1.5" />
      <path strokeWidth="1.5" strokeLinecap="round" d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" className="text-yellow-500" />
    </svg>
  );
}

function PartlyCloudyIcon() {
  return (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <circle cx="9" cy="8" r="4" strokeWidth="1.5" className="text-yellow-500" />
      <path strokeWidth="1.5" strokeLinecap="round" d="M5 16a4 4 0 014-4h1a4 4 0 014 4v1H5v-1z" className="text-gray-400" />
    </svg>
  );
}

function FogIcon() {
  return (
    <svg className="w-6 h-6 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path strokeWidth="1.5" strokeLinecap="round" d="M3 15h18M5 11h14M8 19h8M6 7h12" />
    </svg>
  );
}

function DrizzleIcon() {
  return (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path strokeWidth="1.5" strokeLinecap="round" d="M8 19v2M8 13v2M16 19v2M16 13v2M12 21v2M12 15v2" className="text-blue-400" />
      <circle cx="12" cy="8" r="4" strokeWidth="1.5" className="text-blue-300" fill="currentColor" />
    </svg>
  );
}

function RainIcon() {
  return (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path strokeWidth="1.5" strokeLinecap="round" d="M20 16.58A5 5 0 0018 7h-1.26A8 8 0 104 15.25" className="text-blue-500" />
      <path strokeWidth="1.5" strokeLinecap="round" d="M8 19v2M8 13v2M16 19v2M16 13v2M12 21v2" className="text-blue-400" />
    </svg>
  );
}

function HeavyRainIcon() {
  return (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path strokeWidth="1.5" strokeLinecap="round" d="M20 16.58A5 5 0 0018 7h-1.26A8 8 0 104 15.25" className="text-blue-600" />
      <path strokeWidth="1.5" d="M8 18l-2 3M12 18l-3 3M16 18l-2 3" className="text-blue-500" />
    </svg>
  );
}

function ThunderstormIcon() {
  return (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path strokeWidth="1.5" strokeLinecap="round" d="M20 16.58A5 5 0 0018 7h-1.26A8 8 0 104 15.25" className="text-gray-500" />
      <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M13 10l-2 5h3l-2 5" className="text-yellow-500" fill="currentColor" />
    </svg>
  );
}

function buildUrl(lat, lng, extraParams = "") {
  const url = new URL(API_BASE);
  url.searchParams.set("latitude", lat);
  url.searchParams.set("longitude", lng);
  url.searchParams.set("current", CURRENT_PARAMS);
  url.searchParams.set("timezone", "Asia/Manila");
  url.searchParams.set("forecast_days", "1");
  if (extraParams) url.searchParams.set("hourly", HOURLY_PARAMS);
  return url.toString();
}

function parseCurrent(json) {
  if (!json?.current) return null;
  const c = json.current;
  return {
    temperature: Math.round(c.temperature_2m),
    rain: c.rain ?? 0,
    precipitation: c.precipitation ?? 0,
    windSpeed: Math.round(c.wind_speed_10m),
    windGusts: Math.round(c.wind_gusts_10m),
    pressure: Math.round(c.surface_pressure),
    weatherCode: c.weather_code,
    icon: getWeatherIcon(c.weather_code),
  };
}

function parseHourly(json) {
  if (!json?.hourly) return [];
  const h = json.hourly;
  return h.time.map((t, i) => ({
    time: t,
    precipitation: h.precipitation[i] ?? 0,
    rain: h.rain?.[i] ?? 0,
    windSpeed: Math.round(h.wind_speed_10m[i]),
    windGusts: Math.round(h.wind_gusts_10m[i]),
    pressure: Math.round(h.surface_pressure[i]),
    weatherCode: h.weather_code[i],
    icon: getWeatherIcon(h.weather_code[i]),
  }));
}

export async function fetchCurrent(lat, lng) {
  const res = await fetch(buildUrl(lat, lng));
  if (!res.ok) throw new Error("Weather data unavailable");
  return parseCurrent(await res.json());
}

export async function fetchHourly(lat, lng) {
  const res = await fetch(buildUrl(lat, lng, "hourly"));
  if (!res.ok) throw new Error("Weather data unavailable");
  return parseHourly(await res.json());
}

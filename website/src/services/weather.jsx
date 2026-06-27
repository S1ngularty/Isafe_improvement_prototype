import { apiGet } from "./backend.js";

async function apiPostRaw(path, body) {
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";
  const res = await fetch(`${BACKEND_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Request failed: ${res.status}`);
  }
  const envelope = await res.json();
  if (envelope.error) {
    throw new Error(envelope.error.message || "Unknown error");
  }
  return envelope.data;
}

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

function toWeatherObject(data) {
  return {
    temperature: data.temperature,
    rain: data.rain,
    precipitation: data.precipitation,
    windSpeed: data.windSpeed,
    windGusts: data.windGusts,
    pressure: data.pressure,
    weatherCode: data.weatherCode,
    icon: getWeatherIcon(data.weatherCode),
  };
}

function toHourlyPoint(data) {
  return {
    ...data,
    icon: getWeatherIcon(data.weatherCode),
  };
}

export async function fetchCurrent(lat, lng) {
  const data = await apiGet("/api/weather/current", { lat, lng });
  return toWeatherObject(data);
}

export async function fetchHourly(lat, lng) {
  const data = await apiGet("/api/weather/hourly", { lat, lng });
  return (data.hourly || []).map(toHourlyPoint);
}

export async function fetchAnalysis(current, hourly, language) {
  return apiPostRaw("/api/weather/analyze", { current, hourly, language });
}

import { apiGet } from "./backend.js";

const WMO_CODES = {
  0: { icon: "☀️", description: "Clear sky" },
  1: { icon: "🌤️", description: "Mainly clear" },
  2: { icon: "⛅", description: "Partly cloudy" },
  3: { icon: "☁️", description: "Overcast" },
  45: { icon: "🌫️", description: "Foggy" },
  48: { icon: "🌫️", description: "Depositing rime fog" },
  51: { icon: "🌧️", description: "Light drizzle" },
  53: { icon: "🌧️", description: "Moderate drizzle" },
  55: { icon: "🌧️", description: "Dense drizzle" },
  61: { icon: "🌧️", description: "Slight rain" },
  63: { icon: "🌧️", description: "Moderate rain" },
  65: { icon: "🌧️", description: "Heavy rain" },
  71: { icon: "❄️", description: "Slight snow" },
  73: { icon: "❄️", description: "Moderate snow" },
  75: { icon: "❄️", description: "Heavy snow" },
  77: { icon: "❄️", description: "Snow grains" },
  80: { icon: "🌧️", description: "Slight rain showers" },
  81: { icon: "🌧️", description: "Moderate rain showers" },
  82: { icon: "🌧️", description: "Violent rain showers" },
  85: { icon: "❄️", description: "Slight snow showers" },
  86: { icon: "❄️", description: "Heavy snow showers" },
  95: { icon: "⛈️", description: "Thunderstorm" },
  96: { icon: "⛈️", description: "Thunderstorm with hail" },
  99: { icon: "⛈️", description: "Thunderstorm with hail" },
};

export async function fetchCurrent(lat, lng) {
  try {
    const data = await apiGet("/api/weather/current", { lat, lng });
    const code = data.weatherCode;

    return {
      temperature: data.temperature,
      weatherCode: code,
      description: WMO_CODES[code]?.description || "Unknown",
      icon: WMO_CODES[code]?.icon || "🌡️",
      precipitation: data.precipitation,
      windSpeed: data.windSpeed,
      windGusts: data.windGusts,
      pressure: data.pressure,
      isDanger: isDangerousCondition(data),
    };
  } catch (error) {
    console.error("[fetchCurrent] Error:", error);
    throw error;
  }
}

export async function fetchHourly(lat, lng) {
  try {
    const data = await apiGet("/api/weather/hourly", { lat, lng });
    const hourly = data.hourly || [];

    return hourly.map((point) => ({
      time: new Date(point.time).toLocaleTimeString("en-PH", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      weatherCode: point.weatherCode,
      icon: WMO_CODES[point.weatherCode]?.icon || "🌡️",
      precipitation: point.precipitation,
      windSpeed: point.windSpeed,
    }));
  } catch (error) {
    console.error("[fetchHourly] Error:", error);
    throw error;
  }
}

function isDangerousCondition(current) {
  if (current.weatherCode >= 95) return true;
  if (current.precipitation > 10) return true;
  if (current.windSpeed > 50) return true;
  if (current.windGusts > 60) return true;
  if (current.pressure < 1000) return true;
  return false;
}

export { WMO_CODES };

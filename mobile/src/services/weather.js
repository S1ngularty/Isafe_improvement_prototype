import { apiGet } from "./backend.js";

const WMO_CODES = {
  0: { icon: "wb-sunny", description: "Clear sky" },
  1: { icon: "wb-sunny", description: "Mainly clear" },
  2: { icon: "wb-cloudy", description: "Partly cloudy" },
  3: { icon: "cloud", description: "Overcast" },
  45: { icon: "cloud", description: "Foggy" },
  48: { icon: "cloud", description: "Depositing rime fog" },
  51: { icon: "grain", description: "Light drizzle" },
  53: { icon: "grain", description: "Moderate drizzle" },
  55: { icon: "grain", description: "Dense drizzle" },
  61: { icon: "grain", description: "Slight rain" },
  63: { icon: "grain", description: "Moderate rain" },
  65: { icon: "grain", description: "Heavy rain" },
  71: { icon: "ac-unit", description: "Slight snow" },
  73: { icon: "ac-unit", description: "Moderate snow" },
  75: { icon: "ac-unit", description: "Heavy snow" },
  77: { icon: "ac-unit", description: "Snow grains" },
  80: { icon: "grain", description: "Slight rain showers" },
  81: { icon: "grain", description: "Moderate rain showers" },
  82: { icon: "grain", description: "Violent rain showers" },
  85: { icon: "ac-unit", description: "Slight snow showers" },
  86: { icon: "ac-unit", description: "Heavy snow showers" },
  95: { icon: "flash-on", description: "Thunderstorm" },
  96: { icon: "flash-on", description: "Thunderstorm with hail" },
  99: { icon: "flash-on", description: "Thunderstorm with hail" },
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
    let hourly = Array.isArray(data) ? data : (data.hourly || []);

    // Handle raw Open-Meteo format: { time: [...], precipitation: [...] }
    if (hourly && !Array.isArray(hourly) && hourly.time && Array.isArray(hourly.time)) {
      hourly = hourly.time.map((t, i) => ({
        time: t,
        weatherCode: hourly.weather_code?.[i] || 0,
        precipitation: hourly.precipitation?.[i] || 0,
        windSpeed: hourly.wind_speed_10m?.[i] || 0,
      }));
    }

    return (Array.isArray(hourly) ? hourly : []).map((point) => ({
      time: new Date(point.time).toLocaleTimeString("en-PH", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      weatherCode: point.weatherCode || point.weather_code,
      icon: WMO_CODES[point.weatherCode || point.weather_code]?.icon || "🌡️",
      precipitation: point.precipitation || 0,
      windSpeed: point.windSpeed || point.wind_speed || 0,
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

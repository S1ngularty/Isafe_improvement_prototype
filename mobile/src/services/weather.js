// Open-Meteo Weather API Service
// Free, no API key required
// API: https://open-meteo.com/

const WEATHER_API_URL = "https://api.open-meteo.com/v1/forecast";

// WMO Weather Code Mapping
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
    const params = new URLSearchParams({
      latitude: lat,
      longitude: lng,
      current: "temperature_2m,weather_code,precipitation,wind_speed_10m,wind_gusts_10m,pressure_msl",
      timezone: "Asia/Manila",
    });

    const response = await fetch(`${WEATHER_API_URL}?${params}`);
    if (!response.ok) throw new Error("Weather API error");

    const data = await response.json();
    const current = data.current;

    return {
      temperature: current.temperature_2m,
      weatherCode: current.weather_code,
      description: WMO_CODES[current.weather_code]?.description || "Unknown",
      icon: WMO_CODES[current.weather_code]?.icon || "🌡️",
      precipitation: current.precipitation,
      windSpeed: current.wind_speed_10m,
      windGusts: current.wind_gusts_10m,
      pressure: current.pressure_msl,
      isDanger: isDangerousCondition(current),
    };
  } catch (error) {
    console.error("[fetchCurrent] Error:", error);
    throw error;
  }
}

export async function fetchHourly(lat, lng) {
  try {
    const params = new URLSearchParams({
      latitude: lat,
      longitude: lng,
      hourly: "weather_code,precipitation,wind_speed_10m",
      timezone: "Asia/Manila",
      forecast_days: 1,
    });

    const response = await fetch(`${WEATHER_API_URL}?${params}`);
    if (!response.ok) throw new Error("Weather API error");

    const data = await response.json();
    const hourly = data.hourly;

    return hourly.time.map((time, index) => ({
      time: new Date(time).toLocaleTimeString("en-PH", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      weatherCode: hourly.weather_code[index],
      icon: WMO_CODES[hourly.weather_code[index]]?.icon || "🌡️",
      precipitation: hourly.precipitation[index],
      windSpeed: hourly.wind_speed_10m[index],
    }));
  } catch (error) {
    console.error("[fetchHourly] Error:", error);
    throw error;
  }
}

function isDangerousCondition(current) {
  const weatherCode = current.weather_code;
  const precipitation = current.precipitation;
  const windSpeed = current.wind_speed_10m;
  const windGusts = current.wind_gusts_10m;
  const pressure = current.pressure_msl;

  // Thunderstorm codes
  if (weatherCode >= 95) return true;

  // Heavy rain
  if (precipitation > 10) return true;

  // Heavy wind
  if (windSpeed > 50) return true;
  if (windGusts > 60) return true;

  // Low pressure
  if (pressure < 1000) return true;

  return false;
}

export { WMO_CODES };

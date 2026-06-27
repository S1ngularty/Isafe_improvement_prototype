import useWeather from "../hooks/useWeather";

function sectionClass(condition) {
  return condition ? "text-alert-600 font-semibold" : "text-gray-700";
}

export default function ForecastPage({ lat, lng }) {
  const { current, hourly, loading, error } = useWeather(lat, lng);

  if (lat == null || lng == null) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <p className="text-sm">Enable location to see the weather forecast</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-gray-100 animate-pulse" />
          <div className="space-y-2.5 flex-1">
            <div className="h-8 bg-gray-100 rounded animate-pulse w-1/4" />
            <div className="h-4 bg-gray-100 rounded animate-pulse w-2/3" />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-gray-50 rounded-lg p-3 animate-pulse">
              <div className="h-3 bg-gray-100 rounded w-1/2 mb-2" />
              <div className="h-5 bg-gray-100 rounded w-3/4" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !current) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-red-200 p-6">
        <div className="flex items-center gap-3 text-red-500">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm">{error || "Weather data unavailable"}</p>
        </div>
      </div>
    );
  }

  const Icon = current.icon;

  const hasDanger =
    current.precipitation > 10 ||
    current.pressure < 1000 ||
    current.windSpeed > 50 ||
    current.windGusts > 60;

  const dangers = [];
  if (current.precipitation > 10) dangers.push("Heavy rainfall — possible flooding");
  if (current.pressure < 1000) dangers.push("Low sea level pressure — storm possible");
  if (current.windSpeed > 50) dangers.push("Strong winds — take caution");
  if (current.windGusts > 60) dangers.push("Dangerous wind gusts detected");

  function formatHour(t) {
    const d = new Date(t);
    return d.toLocaleTimeString("en-PH", { hour: "numeric", hour12: true }).replace(" ", "");
  }

  const maxPrecip = Math.max(...hourly.map((h) => h.precipitation), 1);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
            Current Weather
          </h3>
          <span className="text-[10px] text-gray-400">
            {lat.toFixed(2)}N, {lng.toFixed(2)}E
          </span>
        </div>

        <div className="flex items-center gap-5 mt-4">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center shrink-0 ${hasDanger ? "bg-red-100" : "bg-gray-50"}`}>
            <Icon />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-4xl font-bold text-gray-900">{current.temperature}&deg;C</span>
            <p className="text-sm text-gray-500 mt-0.5">
              {current.weatherCode === 0 ? "Clear sky" :
               current.weatherCode <= 3 ? "Partly cloudy" :
               current.weatherCode <= 48 ? "Fog" :
               current.weatherCode <= 55 ? "Drizzle" :
               current.weatherCode <= 65 ? "Rain" :
               current.weatherCode <= 82 ? "Heavy rain" : "Thunderstorm"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          <div className={`bg-gray-50 rounded-lg p-3 ${current.precipitation > 5 ? "ring-2 ring-alert-500/30" : ""}`}>
            <div className="flex items-center gap-1.5 mb-1">
              <svg className={`w-3.5 h-3.5 shrink-0 ${sectionClass(current.precipitation > 5)}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 16.58A5 5 0 0018 7h-1.26A8 8 0 104 15.25" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 19v2M8 13v2M16 19v2M16 13v2M12 21v2" />
              </svg>
              <p className="text-[10px] text-gray-400 uppercase font-medium">Rainfall</p>
            </div>
            <p className={`text-lg font-bold ${sectionClass(current.precipitation > 5)}`}>{current.rain.toFixed(1)} mm</p>
          </div>
          <div className={`bg-gray-50 rounded-lg p-3 ${current.windSpeed > 50 ? "ring-2 ring-alert-500/30" : ""}`}>
            <div className="flex items-center gap-1.5 mb-1">
              <svg className={`w-3.5 h-3.5 shrink-0 ${sectionClass(current.windSpeed > 50)}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.59 4.59A2 2 0 1111 8H2m10.59 11.41A2 2 0 1014 16H2m15.73-8.27A2.5 2.5 0 1119.5 12H2" />
              </svg>
              <p className="text-[10px] text-gray-400 uppercase font-medium">Wind Speed</p>
            </div>
            <p className={`text-lg font-bold ${sectionClass(current.windSpeed > 50)}`}>{current.windSpeed} km/h</p>
          </div>
          <div className={`bg-gray-50 rounded-lg p-3 ${current.pressure < 1000 ? "ring-2 ring-alert-500/30" : ""}`}>
            <div className="flex items-center gap-1.5 mb-1">
              <svg className={`w-3.5 h-3.5 shrink-0 ${sectionClass(current.pressure < 1000)}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8v1m0 6v1m4.243-7.757l-.707.707M8.464 15.536l-.707.707m11.314 0l-.707-.707M8.464 8.464l-.707-.707" />
              </svg>
              <p className="text-[10px] text-gray-400 uppercase font-medium">Sea Level Pressure</p>
            </div>
            <p className={`text-lg font-bold ${sectionClass(current.pressure < 1000)}`}>{current.pressure} hPa</p>
          </div>
          <div className={`bg-gray-50 rounded-lg p-3 ${current.windGusts > 60 ? "ring-2 ring-alert-500/30" : ""}`}>
            <div className="flex items-center gap-1.5 mb-1">
              <svg className={`w-3.5 h-3.5 shrink-0 ${sectionClass(current.windGusts > 60)}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              </svg>
              <p className="text-[10px] text-gray-400 uppercase font-medium">Wind Gusts</p>
            </div>
            <p className={`text-lg font-bold ${sectionClass(current.windGusts > 60)}`}>{current.windGusts} km/h</p>
          </div>
        </div>
      </div>

      {hasDanger && (
        <div className="mx-6 mb-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3 space-y-1.5">
          {dangers.map((d, i) => (
            <div key={i} className="flex items-center gap-2 text-alert-600">
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs font-semibold">{d}</p>
            </div>
          ))}
        </div>
      )}

      <div className="border-t border-gray-100 px-6 pb-5 pt-4">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">24-Hour Forecast</p>
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
          {hourly.map((h, i) => {
            const HIcon = h.icon;
            const barPct = Math.round((h.precipitation / maxPrecip) * 100);
            return (
              <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-lg px-2 py-1.5">
                <span className="text-[10px] text-gray-400 w-8 shrink-0">{formatHour(h.time)}</span>
                <div className="w-4 h-4 flex items-center justify-center text-gray-500 shrink-0">
                  <HIcon />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="h-3 w-full relative">
                    <div
                      className="absolute bottom-0 left-0 rounded-r-sm transition-all"
                      style={{
                        width: `${Math.max(barPct, 2)}%`,
                        height: "100%",
                        backgroundColor: h.precipitation > 5 ? "#f87171" : "#60a5fa",
                        opacity: barPct > 0 ? 0.75 : 0.12,
                      }}
                    />
                  </div>
                </div>
                <span className={`text-[9px] font-medium w-7 text-right shrink-0 ${h.precipitation > 5 ? "text-alert-600" : "text-gray-400"}`}>
                  {h.precipitation > 0 ? h.precipitation.toFixed(1) : "0"}
                </span>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-4 mt-3 text-[10px]">
          <div className="flex items-center gap-1 text-gray-400">
            <span className="w-2.5 h-2.5 rounded-sm bg-blue-400 opacity-75" />
            Rainfall (mm)
          </div>
          <span className={`${current.windSpeed > 50 ? "text-alert-600 font-medium" : "text-gray-400"}`}>Wind</span>
        </div>
      </div>
    </div>
  );
}

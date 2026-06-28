import { useState, useEffect, useRef } from "react";
import useWeather from "../hooks/useWeather";
import { fetchAnalysis } from "../services/weather.jsx";

const METRICS = [
  { key: "rain", label: "Rainfall", unit: "mm", danger: (c) => c.precipitation > 5,
    icon: (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 16.58A5 5 0 0018 7h-1.26A8 8 0 104 15.25"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 19v2M8 13v2M16 19v2M16 13v2M12 21v2"/></svg>) },
  { key: "windSpeed", label: "Wind", unit: "km/h", danger: (c) => c.windSpeed > 50,
    icon: (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.59 4.59A2 2 0 1111 8H2m10.59 11.41A2 2 0 1014 16H2m15.73-8.27A2.5 2.5 0 1119.5 12H2"/></svg>) },
  { key: "windGusts", label: "Gusts", unit: "km/h", danger: (c) => c.windGusts > 60,
    icon: (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/></svg>) },
  { key: "pressure", label: "Pressure", unit: "hPa", danger: (c) => c.pressure < 1000,
    icon: (<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8v1m0 6v1m4.243-7.757l-.707.707M8.464 15.536l-.707.707m11.314 0l-.707-.707M8.464 8.464l-.707-.707"/></svg>) },
];

export default function ForecastPage({ lat, lng }) {
  const { current, hourly, loading, error } = useWeather(lat, lng);
  const [lang, setLang] = useState("en");
  const [analysis, setAnalysis] = useState({ en: null, fil: null });
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);
  const fetchedRef = useRef({ en: false, fil: false });

  useEffect(() => {
    if (!current || !hourly || hourly.length === 0) return;
    if (fetchedRef.current[lang]) return;
    setAnalysisLoading(true);
    setAnalysisError(null);
    fetchAnalysis(current, hourly, lang)
      .then((text) => {
        setAnalysis((prev) => ({ ...prev, [lang]: text }));
        fetchedRef.current[lang] = true;
      })
      .catch((err) => setAnalysisError(err.message))
      .finally(() => setAnalysisLoading(false));
  }, [current, hourly, lang]);

  if (lat == null || lng == null) return <NoLocation />;
  if (loading) return <LoadingSkeleton />;
  if (error || !current) return <ErrorCard message={error || "Weather data unavailable"} />;

  const Icon = current.icon;
  const hasDanger = current.precipitation > 10 || current.pressure < 1000 || current.windSpeed > 50 || current.windGusts > 60;
  const maxPrecip = Math.max(...hourly.map((h) => h.precipitation), 1);

  function formatHour(t) {
    return new Date(t).toLocaleTimeString("en-PH", { hour: "numeric", hour12: true }).replace(" ", "");
  }

  const cardBg = hasDanger
    ? "bg-gradient-to-b from-red-50/80 to-white"
    : "bg-gradient-to-b from-blue-50/30 to-white";

  return (
    <div className="grid lg:grid-cols-2 gap-5 h-full">
      <div className={`${cardBg} rounded-xl shadow-sm border ${hasDanger ? "border-red-200" : "border-gray-200"} overflow-hidden flex flex-col`}>
        <div className="flex-1 flex flex-col items-center justify-center px-6 pt-8 pb-4 text-center">
          <div className={`w-28 h-28 rounded-3xl flex items-center justify-center mb-4 ${hasDanger ? "bg-red-100 ring-4 ring-red-200/50" : "bg-blue-50 ring-4 ring-blue-100/50"}`}>
            <Icon />
          </div>
          <span className="text-6xl font-extrabold text-gray-900 tracking-tight">{current.temperature}&deg;</span>
          <span className={`text-base font-semibold mt-1.5 ${hasDanger ? "text-red-600" : "text-gray-600"}`}>
            {current.weatherCode === 0 ? "Clear Sky" :
             current.weatherCode <= 3 ? "Partly Cloudy" :
             current.weatherCode <= 48 ? "Fog" :
             current.weatherCode <= 55 ? "Drizzle" :
             current.weatherCode <= 65 ? "Rain" :
             current.weatherCode <= 82 ? "Heavy Rain" : "Thunderstorm"}
          </span>
          <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/></svg>
            {lat.toFixed(4)}&deg;N, {lng.toFixed(4)}&deg;E
          </p>
        </div>

        <div className="px-5 pb-4 grid grid-cols-2 gap-2.5">
          {METRICS.map(({ key, label, unit, danger, icon }) => {
            const d = danger(current);
            const value = current[key];
            return (
              <div key={key} className={`flex items-center gap-3 rounded-xl px-4 py-3 ${d ? "bg-red-100/70 border border-red-200" : "bg-gray-100/70 border border-gray-100"}`}>
                <span className={`shrink-0 ${d ? "text-red-600" : "text-gray-500"}`}>{icon}</span>
                <div className="min-w-0">
                  <p className={`text-xl font-bold leading-none ${d ? "text-red-700" : "text-gray-800"}`}>
                    {value.toFixed ? value.toFixed(0) : value}
                    <span className="text-xs font-medium ml-1 opacity-50">{unit}</span>
                  </p>
                  <p className={`text-[10px] font-semibold uppercase tracking-wide mt-1 ${d ? "text-red-500" : "text-gray-400"}`}>{label}</p>
                </div>
              </div>
            );
          })}
        </div>

        {hasDanger && (
          <div className="mx-5 mb-4 bg-red-100/80 border border-red-300 rounded-xl px-4 py-3">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-5 h-5 text-red-600 shrink-0" fill="currentColor" viewBox="0 0 24 24"><path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd"/></svg>
              <span className="text-sm font-extrabold text-red-700 uppercase tracking-wide">Warning</span>
            </div>
            {[current.precipitation > 10 && "Heavy rainfall — possible flooding",
              current.pressure < 1000 && "Low sea level pressure — storm possible",
              current.windSpeed > 50 && "Strong winds — take caution",
              current.windGusts > 60 && "Dangerous wind gusts detected",
            ].filter(Boolean).map((d, i) => (
              <div key={i} className="flex items-center gap-2 text-red-700 ml-7">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                <p className="text-xs font-semibold leading-snug">{d}</p>
              </div>
            ))}
          </div>
        )}

        <div className="border-t border-gray-200 px-5 py-3.5">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">AI Analysis</h3>
            </div>
            <div className="flex bg-gray-100 rounded-md p-0.5">
              <button onClick={() => setLang("en")} className={`px-2.5 py-1 rounded text-[10px] font-semibold transition-colors ${lang === "en" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>EN</button>
              <button onClick={() => setLang("fil")} className={`px-2.5 py-1 rounded text-[10px] font-semibold transition-colors ${lang === "fil" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>FIL</button>
            </div>
          </div>
          {analysisLoading ? (
            <div className="space-y-1.5">
              <div className="h-2.5 bg-gray-100 rounded animate-pulse w-full" /><div className="h-2.5 bg-gray-100 rounded animate-pulse w-11/12" /><div className="h-2.5 bg-gray-100 rounded animate-pulse w-full" />
            </div>
          ) : analysisError ? (
            <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <div className="flex items-center gap-1.5"><svg className="w-3.5 h-3.5 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg><p className="text-[11px] text-red-600">{analysisError}</p></div>
              <button onClick={() => { fetchedRef.current[lang] = false; setAnalysisError(null); }} className="text-[10px] font-semibold text-red-600 hover:text-red-800 underline shrink-0">Retry</button>
            </div>
          ) : analysis[lang] ? (
            <div className="text-[13px] text-gray-700 leading-relaxed text-justify space-y-1.5">
              {analysis[lang].split("\n\n").filter(Boolean).map((para, i) => (<p key={i}>{para}</p>))}
            </div>
          ) : null}
          <p className="text-[10px] text-gray-400 mt-2"><span className="font-medium text-gray-500">Groq</span> &middot; Llama 4 Scout</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">24-Hour Forecast</h3>
          </div>
          <div className="flex items-center gap-3 text-[10px]">
            <span className="flex items-center gap-1 text-gray-400"><span className="w-2.5 h-2.5 rounded-sm bg-blue-400 opacity-75"/>Rain</span>
            <span className="flex items-center gap-1 text-gray-400"><span className="w-4 h-px bg-gray-400"/>Wind</span>
          </div>
        </div>
        <div className="flex-1 p-3">
          <div className="grid grid-cols-3 gap-1.5 h-full content-stretch auto-rows-fr">
            {hourly.map((h, i) => {
              const HIcon = h.icon;
              const barPct = Math.round((h.precipitation / maxPrecip) * 100);
              const hasPrecip = h.precipitation > 5;
              return (
                <div key={i} className={`rounded-lg px-2.5 py-2 transition-all duration-150 hover:scale-[1.04] hover:shadow-md hover:z-10 cursor-default flex flex-col justify-between gap-1 ${hasPrecip ? "bg-red-50 border border-red-100" : "bg-gray-50 border border-gray-100"}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-gray-600">{formatHour(h.time)}</span>
                    <span className={`shrink-0 ${hasPrecip ? "text-red-500" : "text-gray-400"}`}><HIcon /></span>
                  </div>
                  <div>
                    <div className="h-1.5 w-full bg-gray-200/40 rounded-full overflow-hidden mb-1">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.max(barPct, 6)}%`, backgroundColor: hasPrecip ? "#f87171" : "#60a5fa", opacity: barPct > 0 ? 0.85 : 0.06 }}/>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-semibold ${hasPrecip ? "text-red-500" : "text-gray-500"}`}>{h.precipitation > 0 ? `${h.precipitation.toFixed(1)} mm` : "—"}</span>
                      <span className={`text-[9px] ${h.windSpeed > 50 ? "text-red-500 font-medium" : "text-gray-400"}`}>{h.windSpeed}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function NoLocation() {
  return (
    <div className="flex items-center justify-center h-full min-h-[60vh] text-gray-400">
      <p className="text-sm">Enable location to see weather data</p>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="grid lg:grid-cols-2 gap-5 h-full">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col items-center gap-4">
        <div className="w-28 h-28 rounded-3xl bg-gray-100 animate-pulse" />
        <div className="h-8 bg-gray-100 rounded animate-pulse w-1/4" />
        <div className="h-3 bg-gray-100 rounded animate-pulse w-1/3" />
        <div className="grid grid-cols-2 gap-2.5 w-full mt-2">
          {[...Array(4)].map((_, i) => <div key={i} className="bg-gray-50 rounded-xl p-3 animate-pulse"><div className="h-5 bg-gray-100 rounded w-3/4 mb-2" /><div className="h-2.5 bg-gray-100 rounded w-1/2" /></div>)}
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 animate-pulse">
        <div className="h-3 bg-gray-100 rounded w-1/4 mb-3" />
        <div className="grid grid-cols-3 gap-1.5">{[...Array(9)].map((_, i) => <div key={i} className="bg-gray-50 rounded-lg border border-gray-100 p-2 h-[56px]" />)}</div>
      </div>
    </div>
  );
}

function ErrorCard({ message }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-red-200 p-5 flex items-center gap-3 text-red-500">
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
      <p className="text-sm">{message}</p>
    </div>
  );
}

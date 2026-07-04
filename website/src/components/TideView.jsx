import { useState, useEffect, useCallback, useMemo } from "react";
import { getTideData, refreshTideData } from "../services/tide";
import { useToast } from "../context/ToastContext";

const CHART_W = 900;
const CHART_H = 320;
const M = { t: 25, r: 25, b: 50, l: 55 };
const PW = CHART_W - M.l - M.r;
const PH = CHART_H - M.t - M.b;

const TABS = [
  { id: "today", label: "Today" },
  { id: "7day", label: "7 Days" },
  { id: "15day", label: "15 Days" },
];

function fmtLocalTime(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit", hour12: true });
}

function fmtDate(dateStr) {
  const [y, m, d] = dateStr.split("-");
  return new Date(+y, +m - 1, +d).toLocaleDateString("en-PH", { month: "short", day: "numeric" });
}

function fmtDay(dateStr) {
  const [y, m, d] = dateStr.split("-");
  return new Date(+y, +m - 1, +d).toLocaleDateString("en-PH", { weekday: "short" });
}

function fmtFullDate(dateStr) {
  const [y, m, d] = dateStr.split("-");
  return new Date(+y, +m - 1, +d).toLocaleDateString("en-PH", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

function fmtUpdated(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-PH", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
  });
}

function getTideStatus(extremes) {
  const now = Date.now();
  for (let i = 0; i < extremes.length - 1; i++) {
    const a = new Date(extremes[i].time).getTime();
    const b = new Date(extremes[i + 1].time).getTime();
    if (now >= a && now <= b) {
      const rising = extremes[i + 1].height > extremes[i].height;
      return {
        current: extremes[i],
        next: extremes[i + 1],
        rising,
        elapsed: (now - a) / (b - a),
      };
    }
  }
  if (extremes.length >= 2) {
    const last = extremes[extremes.length - 1];
    const prev = extremes[extremes.length - 2];
    return {
      current: last,
      next: null,
      rising: last.height > prev.height,
      elapsed: 1,
    };
  }
  return null;
}

function buildDailySummary(extremes) {
  const days = {};
  for (const e of extremes) {
    if (!days[e.localDate]) days[e.localDate] = [];
    days[e.localDate].push(e);
  }
  const today = new Date().toISOString().slice(0, 10);
  const todayKey = Object.keys(days).find((k) => k === today);
  return { days, todayKey };
}

export default function TideView({ isAdmin }) {
  const [tideData, setTideData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState("today");
  const { showToast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getTideData();
      setTideData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await refreshTideData();
      setTideData(data);
      showToast("Tide data refreshed.", "success");
    } catch (err) {
      showToast("Failed to refresh: " + err.message, "error");
    } finally {
      setRefreshing(false);
    }
  }, [showToast]);

  const allExtremes = useMemo(() => {
    if (!tideData || !tideData.extremes) return [];
    return tideData.extremes;
  }, [tideData]);

  const extremes = useMemo(() => {
    if (tab === "15day") return allExtremes;
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    if (tab === "today") return allExtremes.filter((e) => e.localDate === todayStr);
    const end = new Date(now);
    end.setDate(end.getDate() + 7);
    const endStr = end.toISOString().slice(0, 10);
    return allExtremes.filter((e) => e.localDate >= todayStr && e.localDate <= endStr);
  }, [allExtremes, tab]);

  const station = tideData?.station || null;
  const summary = useMemo(() => buildDailySummary(extremes), [extremes]);
  const allSummary = useMemo(() => buildDailySummary(allExtremes), [allExtremes]);
  const tideStatus = useMemo(() => getTideStatus(allExtremes), [allExtremes]);

  const chartData = useMemo(() => {
    if (extremes.length < 2) return null;

    const times = extremes.map((e) => new Date(e.time).getTime());
    let tMin, tMax;
    if (tab === "today") {
      const now = new Date();
      tMin = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      tMax = tMin + 86400000;
    } else {
      tMin = times[0] - 3600000;
      tMax = times[times.length - 1] + 3600000;
    }
    const tRange = tMax - tMin;

    const heights = extremes.map((e) => e.height);
    let hMin = Math.min(...heights);
    let hMax = Math.max(...heights);
    const pad = (hMax - hMin) * 0.15 || 0.3;
    hMin = Math.max(0, +(hMin - pad).toFixed(1));
    hMax = +(hMax + pad).toFixed(1);
    const hRange = hMax - hMin;

    const points = extremes.map((e) => ({
      x: M.l + ((new Date(e.time).getTime() - tMin) / tRange) * PW,
      y: M.t + PH - ((e.height - hMin) / hRange) * PH,
      height: e.height,
      type: e.type,
      label: fmtLocalTime(e.localTime),
      localDate: e.localDate,
      time: e.time,
    }));

    const yTicks = [];
    const tickStep = hRange <= 1 ? 0.2 : hRange <= 2 ? 0.5 : 1;
    let tick = Math.ceil(hMin / tickStep) * tickStep;
    while (tick <= hMax) {
      yTicks.push(tick);
      tick = +(tick + tickStep).toFixed(1);
    }

    const xTicks = [];
    const xCount = tab === "today" ? 6 : tab === "7day" ? 7 : 10;
    const xStep = tRange / xCount;
    for (let i = 0; i <= xCount; i++) {
      const t = tMin + xStep * i;
      const d = new Date(t);
      const dateStr = d.toISOString().slice(0, 10);
      const isToday = dateStr === new Date().toISOString().slice(0, 10);
      xTicks.push({
        x: M.l + ((t - tMin) / tRange) * PW,
        label: tab === "today"
          ? d.toLocaleTimeString("en-PH", { hour: "numeric", hour12: true })
          : fmtDate(dateStr),
        sub: tab === "today" ? "" : fmtDay(dateStr),
        isToday,
      });
    }

    const curveParts = [];
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      curveParts.push(`C${p0.x + (p1.x - p0.x) * 0.35},${p0.y} ${p0.x + (p1.x - p0.x) * 0.65},${p1.y} ${p1.x},${p1.y}`);
    }

    const pathD = `M${points[0].x},${points[0].y} ${curveParts.join(" ")}`;
    const fillD = `${pathD} L${points[points.length - 1].x},${M.t + PH} L${points[0].x},${M.t + PH} Z`;
    const nowX = M.l + ((Date.now() - tMin) / tRange) * PW;

    return { points, yTicks, xTicks, pathD, fillD, hMin, hMax, nowX, tMin, tMax };
  }, [extremes, tab]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-10 h-10 border-4 border-shield-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error && !tideData) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center">
        <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 16.58A5 5 0 0018 7h-1.26A8 8 0 104 15.25" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 19v2M8 13v2M16 19v2M16 13v2M12 21v2" />
        </svg>
        <p className="text-gray-500 font-medium mb-1">Unable to load tide data</p>
        <p className="text-sm text-gray-400 mb-4">{error}</p>
        <div className="flex items-center gap-3">
          <button onClick={load} className="btn-primary px-4 py-2 text-sm">Retry</button>
          {isAdmin && (
            <button onClick={handleRefresh} disabled={refreshing} className="btn-outline px-4 py-2 text-sm">
              {refreshing ? "Refreshing..." : "Fetch from TideCheck"}
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!tideData || !allExtremes.length) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center">
        <svg className="w-20 h-20 text-gray-200 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M20 16.58A5 5 0 0018 7h-1.26A8 8 0 104 15.25" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M8 19v2M8 13v2M16 19v2M16 13v2M12 21v2" />
        </svg>
        <p className="text-gray-500 font-medium mb-1">No tide data available</p>
        <p className="text-sm text-gray-400 mb-4">Data has not been fetched yet. Trigger a refresh to get the latest tide forecast.</p>
        {isAdmin && (
          <button onClick={handleRefresh} disabled={refreshing} className="btn-primary px-5 py-2.5 text-sm flex items-center gap-2">
            <svg className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {refreshing ? "Fetching..." : "Fetch Tide Data Now"}
          </button>
        )}
        {!isAdmin && <p className="text-xs text-gray-400">An administrator needs to fetch tide data first.</p>}
      </div>
    );
  }

  const todayExtremes = summary.todayKey ? summary.days[summary.todayKey] : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tide Forecast</h1>
          {station && (
            <p className="text-sm text-gray-500 mt-1">
              {station.name}, {station.region} &middot; Datum: {tideData.datum || "LAT"}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {tideData._updated_at && (
            <span className="text-xs text-gray-400">Updated {fmtUpdated(tideData._updated_at)}</span>
          )}
          {isAdmin && (
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="btn-outline px-4 py-2 text-sm flex items-center gap-2"
            >
              <svg className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === id
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tideStatus && todayExtremes.length > 0 && (
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="card bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200">
            <p className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-1">Current Status</p>
            <p className="text-lg font-extrabold text-blue-900">
              {tideStatus.rising ? "Rising" : "Falling"}
            </p>
            <p className="text-xs text-blue-600 mt-0.5">
              {tideStatus.rising ? "Low to high tide" : "High to low tide"}
            </p>
          </div>
          <div className="card bg-gradient-to-br from-orange-50 to-orange-100/50 border-orange-200">
            <p className="text-xs font-bold text-orange-700 uppercase tracking-wider mb-1">Last {tideStatus.current.type === "high" ? "High" : "Low"} Tide</p>
            <p className="text-lg font-extrabold text-orange-900">{tideStatus.current.height.toFixed(2)}m</p>
            <p className="text-xs text-orange-600 mt-0.5">{fmtLocalTime(tideStatus.current.localTime)}</p>
          </div>
          <div className="card bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200">
            <p className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-1">Next {tideStatus.next ? (tideStatus.next.type === "high" ? "High" : "Low") : "—"} Tide</p>
            {tideStatus.next ? (
              <>
                <p className="text-lg font-extrabold text-blue-900">{tideStatus.next.height.toFixed(2)}m</p>
                <p className="text-xs text-blue-600 mt-0.5">{fmtLocalTime(tideStatus.next.localTime)}</p>
              </>
            ) : (
              <p className="text-base font-medium text-blue-500">No data</p>
            )}
          </div>
        </div>
      )}

      {chartData && (
        <div className="card overflow-hidden">
          <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
            <defs>
              <linearGradient id="tideFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2563eb" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#2563eb" stopOpacity="0.04" />
              </linearGradient>
            </defs>

            {chartData.yTicks.map((tick) => {
              const y = M.t + PH - ((tick - chartData.hMin) / (chartData.hMax - chartData.hMin)) * PH;
              return (
                <g key={`yt-${tick}`}>
                  <line x1={M.l} y1={y} x2={M.l + PW} y2={y} stroke="#e5e7eb" strokeWidth="1" />
                  <text x={M.l - 8} y={y + 4} textAnchor="end" className="text-[11px]" fill="#9ca3af">
                    {tick.toFixed(1)}
                  </text>
                </g>
              );
            })}

            {chartData.xTicks.map((t, i) => (
              <g key={`xt-${i}`}>
                <text x={t.x} y={M.t + PH + 18} textAnchor="middle" className="text-[11px]" fill="#6b7280" fontWeight={t.isToday ? "bold" : "normal"}>
                  {t.label}
                </text>
                {t.sub && (
                  <text x={t.x} y={M.t + PH + 33} textAnchor="middle" className="text-[10px]" fill="#9ca3af">
                    {t.sub}
                  </text>
                )}
                {t.isToday && (
                  <line x1={t.x} y1={M.t} x2={t.x} y2={M.t + PH} stroke="#3b82f6" strokeWidth="1" strokeDasharray="4 3" opacity="0.5" />
                )}
              </g>
            ))}

            {chartData.nowX >= M.l && chartData.nowX <= M.l + PW && (
              <line x1={chartData.nowX} y1={M.t} x2={chartData.nowX} y2={M.t + PH} stroke="#ef4444" strokeWidth="1.5" strokeDasharray="5 3" opacity="0.7" />
            )}

            <path d={chartData.fillD} fill="url(#tideFill)" />
            <path d={chartData.pathD} fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

            {chartData.points.map((p, i) => (
              <g key={`pt-${i}`}>
                <circle cx={p.x} cy={p.y} r="5" fill={p.type === "high" ? "#2563eb" : "#ea580c"} stroke="#fff" strokeWidth="2" />
                <text x={p.x} y={p.y - 12} textAnchor="middle" className="text-[10px]" fill={p.type === "high" ? "#1d4ed8" : "#c2410c"} fontWeight="bold">
                  {p.height.toFixed(2)}m
                </text>
                <text x={p.x} y={p.y + 18} textAnchor="middle" className="text-[9px]" fill="#6b7280">
                  {p.label}
                </text>
              </g>
            ))}
          </svg>

          <div className="flex items-center justify-center gap-6 px-4 pb-4 text-xs text-gray-500">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-blue-600" />
              <span>High Tide</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-orange-600" />
              <span>Low Tide</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-6 h-0.5 border-t-2 border-dashed border-red-500" />
              <span>Current Time</span>
            </div>
          </div>
        </div>
      )}

      {todayExtremes.length > 0 && (
        <div className="card">
          <h3 className="font-bold text-gray-900 mb-3">Today&apos;s Tides &mdash; {fmtFullDate(summary.todayKey)}</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 font-medium border-b border-gray-200">
                  <th className="pb-2 pr-4">Time</th>
                  <th className="pb-2 pr-4">Height</th>
                  <th className="pb-2 pr-4">Type</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {todayExtremes.map((e, i) => {
                  const isRising = i < todayExtremes.length - 1 && todayExtremes[i + 1].height > e.height;
                  return (
                    <tr key={e.time} className="hover:bg-gray-50">
                      <td className="py-2.5 pr-4 font-medium text-gray-900">{fmtLocalTime(e.localTime)}</td>
                      <td className="py-2.5 pr-4">
                        <span className={`font-bold ${e.type === "high" ? "text-blue-700" : "text-orange-700"}`}>
                          {e.height.toFixed(2)}m
                        </span>
                      </td>
                      <td className="py-2.5 pr-4">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                          e.type === "high" ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"
                        }`}>
                          {e.type === "high" ? "High Tide" : "Low Tide"}
                        </span>
                      </td>
                      <td className="py-2.5">
                        {i < todayExtremes.length - 1 ? (
                          <span className={`text-xs font-medium ${isRising ? "text-blue-600" : "text-orange-600"}`}>
                            <svg className="w-3.5 h-3.5 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={isRising ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} />
                            </svg>
                            {isRising ? "Rising" : "Falling"}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab !== "today" && (
        <div className="card">
          <h3 className="font-bold text-gray-900 mb-3">{tab === "7day" ? "7-Day" : "15-Day"} Tide Summary</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 font-medium border-b border-gray-200">
                  <th className="pb-2 pr-4">Date</th>
                  <th className="pb-2 pr-4">Day</th>
                  <th className="pb-2 pr-4">High Tide</th>
                  <th className="pb-2 pr-4">Low Tide</th>
                  <th className="pb-2">Range</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {Object.entries(summary.days).map(([date, exts]) => {
                  const high = exts.filter((e) => e.type === "high");
                  const low = exts.filter((e) => e.type === "low");
                  const maxH = high.length ? Math.max(...high.map((e) => e.height)) : null;
                  const minL = low.length ? Math.min(...low.map((e) => e.height)) : null;
                  const range = maxH !== null && minL !== null ? (maxH - minL).toFixed(2) : "—";
                  const isToday = date === summary.todayKey;
                  return (
                    <tr key={date} className={`hover:bg-gray-50 ${isToday ? "bg-blue-50/50" : ""}`}>
                      <td className={`py-2.5 pr-4 font-medium ${isToday ? "text-blue-700" : "text-gray-900"}`}>
                        {fmtDate(date)}
                        {isToday && <span className="ml-1.5 text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full font-semibold">Today</span>}
                      </td>
                      <td className="py-2.5 pr-4 text-gray-500">{fmtDay(date)}</td>
                      <td className="py-2.5 pr-4">
                        {high.length ? (
                          <div>
                            {high.map((h) => (
                              <div key={h.time} className="flex items-center gap-1.5">
                                <svg className="w-3 h-3 text-blue-600 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M12 2l-7 14h14L12 2zm0 4.5L14.5 13h-5L12 6.5z" />
                                </svg>
                                <span className="font-medium text-blue-700">{h.height.toFixed(2)}m</span>
                                <span className="text-gray-400 text-[10px]">{fmtLocalTime(h.localTime)}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="py-2.5 pr-4">
                        {low.length ? (
                          <div>
                            {low.map((l) => (
                              <div key={l.time} className="flex items-center gap-1.5">
                                <svg className="w-3 h-3 text-orange-600 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M12 22l7-14H5l7 14zm0-4.5L9.5 11h5L12 17.5z" />
                                </svg>
                                <span className="font-medium text-orange-700">{l.height.toFixed(2)}m</span>
                                <span className="text-gray-400 text-[10px]">{fmtLocalTime(l.localTime)}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="py-2.5 text-gray-700 font-medium">{range}m</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card">
        <h3 className="font-bold text-gray-900 mb-3">{tab === "today" ? "Today" : tab === "7day" ? "7-Day" : "15-Day"} Tide Extremes</h3>
        <div className="overflow-x-auto max-h-80 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white">
              <tr className="text-left text-gray-500 font-medium border-b border-gray-200">
                <th className="pb-2 pr-4">Date</th>
                <th className="pb-2 pr-4">Time</th>
                <th className="pb-2 pr-4">Height</th>
                <th className="pb-2">Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {extremes.map((e) => (
                <tr key={e.time} className="hover:bg-gray-50">
                  <td className="py-2 pr-4 text-gray-600">{fmtDate(e.localDate)}</td>
                  <td className="py-2 pr-4 text-gray-900">{fmtLocalTime(e.localTime)}</td>
                  <td className="py-2 pr-4">
                    <span className={`font-medium ${e.type === "high" ? "text-blue-700" : "text-orange-700"}`}>
                      {e.height.toFixed(2)}m
                    </span>
                  </td>
                  <td className="py-2">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                      e.type === "high" ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"
                    }`}>
                      {e.type === "high" ? "High" : "Low"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {station && (
        <div className="text-center text-xs text-gray-400">
          <p>Tide data for {station.name}, {station.region}, {station.country}</p>
          <p>Datum: {tideData.datum || "LAT"} &middot; Timezone: {station.timezone || "Asia/Manila"}</p>
        </div>
      )}
    </div>
  );
}

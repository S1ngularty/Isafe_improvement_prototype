import { useState, useEffect, useMemo } from "react";
import {
  fetchWaterLevelSummary,
  fetchWaterLevelAnalytics,
  fetchUnsafeReadings,
} from "../../services/waterLevel.js";
import WaterLevelCharts from "./WaterLevelCharts";
import RealtimeSensorChart from "./RealtimeSensorChart";
import WaterDepthChart from "./WaterDepthChart";
import exportWaterLevelPdf from "../../utils/exportWaterLevelPdf.js";
import useRealtimeWaterLevel from "../../hooks/useRealtimeWaterLevel.js";

const FLOAT_SWITCH_SENSOR_ID = "SR04M-2";

function KpiCard({ label, value, sub, color }) {
  const borderColor =
    color === "red"
      ? "border-red-500"
      : color === "amber"
        ? "border-amber-500"
        : color === "green"
          ? "border-green-500"
          : color === "blue"
            ? "border-blue-500"
            : "border-shield-500";
  return (
    <div className={`card border-l-4 ${borderColor}`}>
      <h3 className="font-bold text-gray-900 mb-1">{label}</h3>
      <p className="text-3xl font-extrabold text-gray-900">
        {value != null ? value : "..."}
      </p>
      {sub != null && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function UnsafeSection({ unsafeReadings, loading, error }) {
  if (error) {
    return (
      <div className="card border-l-4 border-gray-400">
        <p className="text-sm text-gray-500">Unable to load unsafe conditions: {error}</p>
      </div>
    );
  }

  if (loading) {
    return <div className="card h-32 bg-gray-50 rounded-xl animate-pulse" />;
  }

  if (!unsafeReadings || unsafeReadings.length === 0) {
    return (
      <div className="card border-l-4 border-green-500">
        <div className="flex items-center gap-3">
          <svg className="w-6 h-6 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 className="font-bold text-gray-900">All Clear</h3>
            <p className="text-xs text-gray-500">All sensors reporting safe levels</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card border-l-4 border-red-500">
      <div className="flex items-center gap-2 mb-3">
        <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 className="font-bold text-gray-900">
          Unsafe Conditions Detected
        </h3>
        <span className="text-xs px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold">
          {unsafeReadings.length}
        </span>
      </div>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {unsafeReadings.map((r) => (
          <div
            key={r.id}
            className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 truncate">
                {r.sensor_id}
              </p>
              <p className="text-xs text-gray-400">
                {new Date(r.recorded_at).toLocaleString()}
              </p>
            </div>
            <div className="text-right shrink-0 ml-4">
              <span
                className={`text-sm font-extrabold ${
                  r.status === "CRITICAL" ? "text-red-600" : "text-amber-600"
                }`}
              >
                {(r.water_level_cm / 100).toFixed(2)} m
              </span>
              <span
                className={`block text-[10px] font-semibold ${
                  r.status === "CRITICAL" ? "text-red-500" : "text-amber-500"
                }`}
              >
                {r.status}
              </span>
            </div>
            {r.duration_minutes != null && (
              <span className="text-[10px] text-gray-400 shrink-0 ml-3 w-16 text-right">
                {r.duration_minutes < 60
                  ? `${r.duration_minutes}m ago`
                  : `${Math.floor(r.duration_minutes / 60)}h ago`}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg">
      <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p className="text-xs text-red-700">{message}</p>
    </div>
  );
}

function usePolling(fetchFn, intervalMs, deps = [], enabled = true) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!enabled) return;

    let mounted = true;
    let timer;

    async function load() {
      try {
        const result = await fetchFn();
        if (mounted) {
          setData(result);
          setError(null);
        }
      } catch (err) {
        if (mounted) setError(err.message);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    if (intervalMs > 0) {
      timer = setInterval(load, intervalMs);
    }

    return () => {
      mounted = false;
      if (timer) clearInterval(timer);
    };
  }, [...deps, enabled]);

  return { data, loading, error };
}

export default function WaterLevelView() {
  const [Plot, setPlot] = useState(null);
  const [analyticsDays, setAnalyticsDays] = useState(7);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    import("react-plotly.js").then((mod) => setPlot(() => mod.default));
  }, []);

  const { data: summary, loading: summaryLoading, error: summaryError } = usePolling(
    fetchWaterLevelSummary,
    30000,
    [],
    true,
  );

  const { data: analytics, loading: analyticsLoading, error: analyticsError } = usePolling(
    () => fetchWaterLevelAnalytics(analyticsDays),
    120000,
    [analyticsDays],
    true,
  );

  const { data: unsafeReadings, loading: unsafeLoading, error: unsafeError } = usePolling(
    () => fetchUnsafeReadings({ limit: 20 }),
    30000,
    [],
    true,
  );

  const {
    readings: realtimeReadings,
    error: realtimeError,
  } = useRealtimeWaterLevel();

  const kpi = useMemo(() => {
    if (!summary) return null;
    return {
      totalSensors: summary.total_sensors,
      activeSensors: summary.active_sensors,
      inactiveSensors: summary.inactive_sensors,
      unsafeCount: summary.unsafe_count,
      warningCount: summary.warning_count,
      criticalCount: summary.critical_count,
    };
  }, [summary]);

  async function handleExportPdf() {
    setExporting(true);
    try {
      await exportWaterLevelPdf(kpi);
    } catch (e) {
      console.warn("PDF export failed:", e);
    } finally {
      setExporting(false);
    }
  }

  const analyticsReady = analytics && Array.isArray(analytics.time_series) && analytics.time_series.length > 0;

  const fsData = useMemo(() => {
    const historical = (analytics?.time_series || []).filter(
      (p) => p.float_switch_1m !== null || p.float_switch_2m !== null
    );

    const rt = (realtimeReadings || [])
      .filter((r) => r.float_switch_1m !== null || r.float_switch_2m !== null)
      .map((r) => ({
        timestamp: r.recorded_at,
        sensor_id: r.sensor_id,
        float_switch_1m: r.float_switch_1m,
        float_switch_2m: r.float_switch_2m,
      }));

    const seen = new Set(historical.map((p) => p.timestamp));
    const merged = [...historical];
    for (const r of rt) {
      if (!seen.has(r.timestamp)) {
        merged.push(r);
        seen.add(r.timestamp);
      }
    }

    merged.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    return merged;
  }, [analytics, realtimeReadings]);

  const todayFSData = useMemo(() => {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return fsData.filter((p) => {
      const isToday = new Date(p.timestamp) >= startOfDay;
      const isCorrectSensor = p.sensor_id === FLOAT_SWITCH_SENSOR_ID;
      return isToday && isCorrectSensor;
    });
  }, [fsData]);

  const stateChangeEvents = useMemo(() => {
    if (todayFSData.length < 2) return [];
    const events = [];
    for (let i = 1; i < todayFSData.length; i++) {
      const prev = todayFSData[i - 1];
      const curr = todayFSData[i];
      if (curr.float_switch_1m !== null && prev.float_switch_1m !== null && curr.float_switch_1m !== prev.float_switch_1m) {
        events.push({ timestamp: curr.timestamp, switch: "1m", from: prev.float_switch_1m ? "Triggered" : "At Rest", to: curr.float_switch_1m ? "Triggered" : "At Rest" });
      }
      if (curr.float_switch_2m !== null && prev.float_switch_2m !== null && curr.float_switch_2m !== prev.float_switch_2m) {
        events.push({ timestamp: curr.timestamp, switch: "2m", from: prev.float_switch_2m ? "Triggered" : "At Rest", to: curr.float_switch_2m ? "Triggered" : "At Rest" });
      }
    }
    return events;
  }, [todayFSData]);

  const transitionShapes = useMemo(() => {
    return stateChangeEvents.map((e) => ({
      type: "line",
      xref: "x",
      yref: "paper",
      x0: e.timestamp,
      x1: e.timestamp,
      y0: 0,
      y1: 1,
      line: { color: e.switch === "1m" ? "#6366f1" : "#ef4444", width: 1, dash: "dot" },
      layer: "below",
    }));
  }, [stateChangeEvents]);

  const hasFloatSwitch = todayFSData.length > 0;

  const currentDepth = useMemo(() => {
    if (!realtimeReadings || realtimeReadings.length === 0) return null;
    return 2.29 - (realtimeReadings[0].water_level_cm / 100);
  }, [realtimeReadings]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Water Level Analytics</h1>
          <p className="text-sm text-gray-500 mt-1">
            Real-time sensor monitoring and analytics
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleExportPdf}
            disabled={exporting}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-shield-600 text-white hover:bg-shield-700 disabled:opacity-50 transition-colors"
          >
            {exporting ? "Exporting..." : "Export PDF"}
          </button>
          {summaryLoading && (
            <span className="text-xs text-gray-400 animate-pulse">Refreshing...</span>
          )}
        </div>
      </div>

      {/* Global error state — show if all data sources failed */}
      {summaryError && !summary && (
        <ErrorBanner message={`Failed to load sensor data: ${summaryError}. Auto-retrying...`} />
      )}

      {/* KPI Cards */}
      <div id="wl-kpi-grid" className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-4">
        <KpiCard label="Total Sensors" value={kpi?.totalSensors} color="blue" />
        <KpiCard
          label="Active Sensors"
          value={kpi?.activeSensors}
          sub={kpi?.inactiveSensors ? `${kpi.inactiveSensors} inactive` : null}
          color="green"
        />
        <KpiCard
          label="Unsafe Readings"
          value={kpi?.unsafeCount ?? 0}
          sub="Last 24 hours"
          color={kpi?.unsafeCount > 0 ? "red" : "green"}
        />
        <KpiCard label="WARNING Count" value={kpi?.warningCount ?? 0} color="amber" />
        <KpiCard
          label="CRITICAL Count"
          value={kpi?.criticalCount ?? 0}
          color="red"
        />
        <KpiCard
          label="Current Depth"
          value={currentDepth != null ? `${currentDepth.toFixed(2)} m` : "..."}
          color={currentDepth >= 1.99 ? "red" : currentDepth >= 0.99 ? "amber" : "green"}
        />
        <KpiCard
          label="Analytics Period"
          value={`${analyticsDays}d`}
          sub={`${analytics?.total_readings || 0} readings`}
          color="shield"
        />
      </div>

      {/* Period selector */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Chart period:
        </span>
        {[1, 3, 7, 14, 30].map((d) => (
          <button
            key={d}
            onClick={() => setAnalyticsDays(d)}
            className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-colors ${
              analyticsDays === d
                ? "bg-shield-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {d}d
          </button>
        ))}
      </div>

      {/* Realtime Sensor Chart */}
      <div id="wl-realtime-chart">
        <h2 className="text-lg font-bold text-gray-900 mb-3">Live: Distance from Sensor to Water</h2>
        {realtimeError && (
          <ErrorBanner message={`Realtime subscription error: ${realtimeError}. Data may be delayed.`} />
        )}
        <RealtimeSensorChart readings={realtimeReadings} Plot={Plot} />
      </div>

      {/* Side-by-side: Freeboard + Actual Depth */}
      <div id="wl-depth-comparison" className="grid lg:grid-cols-2 gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-3">Distance from Sensor (Freeboard)</h2>
          {realtimeError && (
            <ErrorBanner message={`Realtime subscription error: ${realtimeError}. Data may be delayed.`} />
          )}
          <RealtimeSensorChart readings={realtimeReadings} Plot={Plot} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-3">Actual Water Depth</h2>
          {realtimeError && (
            <ErrorBanner message={`Realtime subscription error: ${realtimeError}. Data may be delayed.`} />
          )}
          <WaterDepthChart readings={realtimeReadings} Plot={Plot} />
        </div>
      </div>

      {/* Float Switch History */}
      <div id="wl-float-switch-section">
        <h2 className="text-lg font-bold text-gray-900 mb-3">Float Switch History</h2>
        <div className="card">
          <p className="text-xs text-gray-400 mb-4">1m and 2m float switch state over time</p>
          {!Plot ? (
            <div className="h-64 bg-gray-50 rounded-xl animate-pulse" />
          ) : hasFloatSwitch ? (
            <>
            <Plot
              data={[
                {
                  type: "scatter",
                  mode: "lines+markers",
                  x: todayFSData.map((p) => p.timestamp),
                  y: todayFSData.map((p) => (p.float_switch_1m ? 1 : 0)),
                  name: "1m Switch",
                  line: { shape: "hv", color: "#6366f1", width: 2 },
                  marker: {
                    size: 4,
                    color: todayFSData.map((p) => (p.float_switch_1m ? "#ef4444" : "#9ca3af")),
                    symbol: "circle",
                  },
                  hovertemplate: "<b>1m</b>: %{customdata}<br>%{x}<extra></extra>",
                  customdata: todayFSData.map((p, i) => {
                    const state = p.float_switch_1m ? "Triggered" : "At Rest";
                    if (i > 0 && p.float_switch_1m !== todayFSData[i - 1].float_switch_1m) return state + " ← State changed";
                    return state;
                  }),
                },
                {
                  type: "scatter",
                  mode: "lines+markers",
                  x: todayFSData.map((p) => p.timestamp),
                  y: todayFSData.map((p) => (p.float_switch_2m ? 3 : 2)),
                  name: "2m Switch",
                  line: { shape: "hv", color: "#ef4444", width: 2 },
                  marker: {
                    size: 4,
                    color: todayFSData.map((p) => (p.float_switch_2m ? "#ef4444" : "#9ca3af")),
                    symbol: "diamond",
                  },
                  hovertemplate: "<b>2m</b>: %{customdata}<br>%{x}<extra></extra>",
                  customdata: todayFSData.map((p, i) => {
                    const state = p.float_switch_2m ? "Triggered" : "At Rest";
                    if (i > 0 && p.float_switch_2m !== todayFSData[i - 1].float_switch_2m) return state + " ← State changed";
                    return state;
                  }),
                },
              ]}
              layout={{
                font: { size: 11, color: "#374151" },
                margin: { l: 40, r: 10, t: 10, b: 30 },
                plot_bgcolor: "transparent",
                paper_bgcolor: "transparent",
                showlegend: true,
                legend: { orientation: "h", y: 1.2, x: 0.5, xanchor: "center", font: { size: 10 } },
                height: 280,
                yaxis: {
                  tickvals: [0, 1, 2, 3],
                  ticktext: ["1m At Rest", "1m Triggered", "2m At Rest", "2m Triggered"],
                  range: [-0.15, 3.15],
                },
                xaxis: { tickfont: { size: 9 }, tickformat: "%H:%M", hoverformat: "%b %e, %Y %H:%M" },
                hovermode: "x unified",
                shapes: transitionShapes,
              }}
              config={{ displayModeBar: false, responsive: true }}
              style={{ width: "100%", height: 300 }}
            />
            {stateChangeEvents.length > 0 && (
              <div className="mt-4 border-t border-gray-100 pt-3">
                <details className="group">
                  <summary className="text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none">
                    State Change Events ({stateChangeEvents.length})
                  </summary>
                  <div className="mt-2 max-h-48 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="text-left py-1.5 pr-3 font-semibold text-gray-400">Time</th>
                          <th className="text-left py-1.5 pr-3 font-semibold text-gray-400">Switch</th>
                          <th className="text-left py-1.5 font-semibold text-gray-400">Change</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stateChangeEvents.map((e, i) => (
                          <tr key={i} className="border-b border-gray-50">
                            <td className="py-1.5 pr-3 text-gray-600 whitespace-nowrap">
                              {new Date(e.timestamp).toLocaleString()}
                            </td>
                            <td className="py-1.5 pr-3">
                              <span className={`font-semibold ${e.switch === "1m" ? "text-indigo-600" : "text-red-600"}`}>
                                {e.switch}
                              </span>
                            </td>
                            <td className="py-1.5">
                              <span className={`inline-flex items-center gap-1 ${e.to === "Triggered" ? "text-red-600" : "text-gray-500"}`}>
                                <span>{e.from}</span>
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                </svg>
                                <span className="font-semibold">{e.to}</span>
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              </div>
            )}
          </>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">
              <p className="text-sm">No float switch data available</p>
            </div>
          )}
        </div>
      </div>

      {/* Unsafe Conditions */}
      <div id="wl-unsafe-section">
        <h2 className="text-lg font-bold text-gray-900 mb-3">Unsafe Conditions</h2>
        <UnsafeSection
          unsafeReadings={unsafeReadings}
          loading={unsafeLoading}
          error={unsafeError}
        />
      </div>

      {/* Charts */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-3">Analytics Charts</h2>
        {analyticsError && !analytics ? (
          <ErrorBanner message={`Could not load analytics: ${analyticsError}`} />
        ) : analyticsLoading && !analytics ? (
          <div className="h-64 bg-gray-50 rounded-xl animate-pulse" />
        ) : analyticsReady ? (
          <WaterLevelCharts analytics={analytics} Plot={Plot} />
        ) : analytics && !analyticsReady ? (
          <div className="card py-12 text-center text-gray-400">
            <p className="text-sm">No readings in this period. Try a shorter range.</p>
          </div>
        ) : (
          <div className="card py-12 text-center text-gray-400">
            <p className="text-sm">No analytics data available yet</p>
          </div>
        )}
      </div>
    </div>
  );
}

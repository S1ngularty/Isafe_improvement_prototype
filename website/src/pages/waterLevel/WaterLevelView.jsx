import { useState, useEffect, useMemo } from "react";
import {
  fetchWaterLevelSummary,
  fetchWaterLevelAnalytics,
  fetchUnsafeReadings,
} from "../../services/waterLevel.js";
import WaterLevelCharts from "./WaterLevelCharts";
import RealtimeSensorChart from "./RealtimeSensorChart";
import exportWaterLevelPdf from "../../utils/exportWaterLevelPdf.js";
import useRealtimeWaterLevel from "../../hooks/useRealtimeWaterLevel.js";

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
                  r.status === "FLOOD_WARNING" ? "text-red-600" : "text-amber-600"
                }`}
              >
                {(r.water_level_cm / 100).toFixed(2)} m
              </span>
              <span
                className={`block text-[10px] font-semibold ${
                  r.status === "FLOOD_WARNING" ? "text-red-500" : "text-amber-500"
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
      floodWarningCount: summary.flood_warning_count,
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
      <div id="wl-kpi-grid" className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
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
          label="FLOOD WARNING Count"
          value={kpi?.floodWarningCount ?? 0}
          color="red"
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
        <h2 className="text-lg font-bold text-gray-900 mb-3">Live Sensor Readings</h2>
        {realtimeError && (
          <ErrorBanner message={`Realtime subscription error: ${realtimeError}. Data may be delayed.`} />
        )}
        <RealtimeSensorChart readings={realtimeReadings} Plot={Plot} />
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

import { useState, useEffect, useMemo, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet.heat";
import { useAuth } from "../context/AuthContext";
import {
  fetchKpiData,
  fetchTrendsData,
  fetchHeatmapData,
  fetchTemporalHeatmap,
  fetchResponseTimes,
  fetchBarangayStats,
  fetchRescuerPerformance,
  fetchDemographics,
  fetchEvacuationStatus,
  fetchRecentActivity,
  fetchAnalyticsAnalysis,
  triggerBackfill,
} from "../services/analytics.js";
import exportAnalyticsPdf from "../utils/exportPdf.js";

const DARK_RED = "#991b1b";
const RED = "#ef4444";
const ORANGE = "#f97316";
const AMBER = "#f59e0b";
const GREEN = "#22c55e";
const BLUE = "#3b82f6";
const SHIELD = "#1d4ed8";
const GRAY = "#9ca3af";

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
      {sub != null && (
        <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
      )}
    </div>
  );
}

function ChartInsight({ text }) {
  if (!text) return null;
  return (
    <div className="mt-2 flex items-start gap-1.5 px-0.5">
      <svg className="w-3.5 h-3.5 text-indigo-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
      <p className="text-xs text-gray-500 italic leading-relaxed">{text}</p>
    </div>
  );
}

function HeatmapLayer({ points }) {
  const map = useMap();
  const layerRef = useRef(null);

  useEffect(() => {
    if (!points || points.length === 0) return;
    if (layerRef.current) {
      map.removeLayer(layerRef.current);
    }
    layerRef.current = L.heatLayer(
      points.map((p) => [p.lat, p.lng, p.weight]),
      {
        radius: 25,
        blur: 15,
        maxZoom: 12,
        max: 1.0,
        gradient: {
          0.0: "green",
          0.25: "yellow",
          0.5: "orange",
          0.75: "red",
          1.0: "darkred",
        },
      }
    ).addTo(map);

    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
      }
    };
  }, [map, points]);

  return null;
}

function DynamicPlot({ Plot, data, layout, config, style, onClick }) {
  if (!Plot) return <div className="h-64 bg-gray-50 rounded-xl animate-pulse" />;
  return (
    <Plot
      data={data}
      layout={layout}
      config={config || { displayModeBar: false, responsive: true }}
      style={style || { width: "100%", height: 300 }}
      onClick={onClick}
    />
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

const DEFAULT_LAYOUT = {
  font: { size: 11, color: "#374151" },
  margin: { l: 40, r: 10, t: 30, b: 30 },
  plot_bgcolor: "transparent",
  paper_bgcolor: "transparent",
  showlegend: true,
  legend: { orientation: "h", y: 1.1, x: 0.5, xanchor: "center", font: { size: 10 } },
  height: 280,
};

export default function AnalyticsDashboard() {
  const { session } = useAuth();
  const [Plot, setPlot] = useState(null);
  const [backfilling, setBackfilling] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [analysis, setAnalysis] = useState({ en: null, fil: null });
  const [analysisLang, setAnalysisLang] = useState("en");
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);
  const analysisFetchedRef = useRef({ en: false, fil: false });

  useEffect(() => {
    import("react-plotly.js").then((mod) => setPlot(() => mod.default));
  }, []);

  async function handleRefresh() {
    setBackfilling(true);
    try {
      await triggerBackfill();
      window.location.reload();
    } catch {
      setBackfilling(false);
    }
  }

  async function handleExportPdf() {
    setExporting(true);
    try {
      var lang = analysisLang;
      var analysisData = analysis[lang];
      if (!analysisData && kpi && trends && barangay) {
        try {
          analysisData = await fetchAnalyticsAnalysis(kpi, trends, barangay, responseTimes, demo, rescuerPerf, temporal, heatmapData, lang);
        } catch {
          // export without AI summary
        }
      }
      await exportAnalyticsPdf(kpi, recentAlerts, analysisData || null);
    } catch {
      // handled in utility
    } finally {
      setExporting(false);
    }
  }

  const { data: kpi, loading: kpiLoading } = usePolling(fetchKpiData, 60000, [], !!session);
  const { data: heatmapData } = usePolling(() => fetchHeatmapData(24), 60000, [], !!session);
  const { data: trends } = usePolling(() => fetchTrendsData(30), 300000, [], !!session);
  const { data: temporal } = usePolling(fetchTemporalHeatmap, 300000, [], !!session);
  const { data: responseTimes } = usePolling(() => fetchResponseTimes(30), 300000, [], !!session);
  const { data: barangay } = usePolling(fetchBarangayStats, 300000, [], !!session);
  const { data: rescuerPerf } = usePolling(fetchRescuerPerformance, 300000, [], !!session);
  const { data: demo } = usePolling(fetchDemographics, 600000, [], !!session);
  const { data: evacStatus } = usePolling(fetchEvacuationStatus, 300000, [], !!session);
  const { data: recentAlerts } = usePolling(() => fetchRecentActivity(20), 120000, [], !!session);

  useEffect(() => {
    if (!kpi || !trends || !barangay || !responseTimes || !demo || !rescuerPerf || !temporal || !heatmapData) return;
    if (analysisFetchedRef.current[analysisLang]) return;
    runAnalysis(analysisLang);
  }, [kpi, trends, barangay, responseTimes, demo, rescuerPerf, temporal, heatmapData, analysisLang]);

  async function runAnalysis(lang) {
    if (!kpi || !trends || !barangay) return;
    setAnalysisLoading(true);
    setAnalysisError(null);
    try {
      const result = await fetchAnalyticsAnalysis(kpi, trends, barangay, responseTimes, demo, rescuerPerf, temporal, heatmapData, lang);
      setAnalysis((prev) => ({ ...prev, [lang]: result }));
      analysisFetchedRef.current[lang] = true;
    } catch (err) {
      setAnalysisError(err.message);
    } finally {
      setAnalysisLoading(false);
    }
  }

  function handleAnalysisLangSwitch(lang) {
    if (lang === analysisLang) return;
    setAnalysisLang(lang);
  }

  function handleReanalyze() {
    analysisFetchedRef.current = { en: false, fil: false };
    setAnalysis({ en: null, fil: null });
    setAnalysisError(null);
  }

  const heatmapPoints = useMemo(() => {
    if (!heatmapData?.points) return [];
    return heatmapData.points;
  }, [heatmapData]);

  const trendChart = useMemo(() => {
    if (!trends?.days) return null;
    const days = trends.days;
    const dates = days.map((d) => d.date);
    return {
      dates,
      incidents: days.map((d) => d.new_incidents),
      resolved: days.map((d) => d.resolved_incidents),
      rescues: days.map((d) => d.rescue_assignments_completed),
    };
  }, [trends]);

  const responseChart = useMemo(() => {
    if (!responseTimes?.days) return null;
    const days = responseTimes.days;
    return {
      dates: days.map((d) => d.date),
      avg: days.map((d) => d.avg_response_seconds),
      p90: days.map((d) => d.p90_response_seconds),
      onscene: days.map((d) => d.avg_time_to_onscene_seconds),
      total: days.map((d) => d.avg_total_rescue_seconds),
    };
  }, [responseTimes]);

  const barangayChart = useMemo(() => {
    if (!barangay?.barangays) return null;
    const sorted = [...barangay.barangays]
      .sort((a, b) => b.users_emergency - a.users_emergency)
      .reverse();
    return {
      names: sorted.map((b) => b.barangay),
      emergency: sorted.map((b) => b.users_emergency),
      help: sorted.map((b) => b.users_help),
      safe: sorted.map((b) => b.users_safe),
      rates: sorted.map((b) => b.emergency_rate),
    };
  }, [barangay]);

  const rescuerChart = useMemo(() => {
    if (!rescuerPerf?.rescuers) return null;
    const sorted = [...rescuerPerf.rescuers]
      .sort((a, b) => b.total_assignments - a.total_assignments)
      .slice(0, 15)
      .reverse();
    return {
      names: sorted.map((r) => r.full_name || r.rescuer_id.slice(0, 8)),
      helped: sorted.map((r) => r.helped_count),
      cancelled: sorted.map((r) => r.cancelled_count),
      rates: sorted.map((r) => r.success_rate),
    };
  }, [rescuerPerf]);

  const demoChart = useMemo(() => {
    if (!demo) return null;
    const bloodTypes = Object.entries(demo.by_blood_type || {})
      .sort((a, b) => b[1] - a[1]);
    const ageGroups = Object.entries(demo.by_age_group || {})
      .filter(([k]) => k !== "unknown")
      .sort((a, b) => {
        const order = ["0-17", "18-34", "35-49", "50-64", "65+"];
        return order.indexOf(a[0]) - order.indexOf(b[0]);
      });
    return { bloodTypes, ageGroups };
  }, [demo]);

  return (
    <div className="space-y-6">
      {/* Section: Overview */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={backfilling}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {backfilling ? "Rebuilding..." : "Refresh Data"}
          </button>
          <button
            type="button"
            onClick={handleExportPdf}
            disabled={exporting}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-shield-600 text-white hover:bg-shield-700 disabled:opacity-50 transition-colors"
          >
            {exporting ? "Exporting..." : "Export PDF"}
          </button>
          {kpiLoading && (
            <span className="text-xs text-gray-400 animate-pulse">Refreshing...</span>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard
          label="Total Users"
          value={kpi?.total_users}
          color="blue"
        />
        <KpiCard
          label="Emergency"
          value={kpi?.users_emergency}
          sub={
            kpi?.emergency_rate != null
              ? `${kpi.emergency_rate}% of users`
              : null
          }
          color="red"
        />
        <KpiCard
          label="Help Needed"
          value={kpi?.users_help}
          color="amber"
        />
        <KpiCard
          label="Active Rescuers"
          value={kpi?.active_rescuers}
          sub={
            kpi?.available_rescuers != null
              ? `${kpi.available_rescuers} available`
              : null
          }
          color="green"
        />
        <KpiCard
          label="Avg Response"
          value={
            kpi?.avg_response_seconds != null
              ? `${Math.round(kpi.avg_response_seconds / 60)}m`
              : "..."
          }
          sub={kpi?.today_rescues_created != null ? `${kpi.today_rescues_created} rescues today` : null}
          color="shield"
        />
        <KpiCard
          label="Resolution Rate"
          value={kpi?.resolution_rate != null ? `${kpi.resolution_rate}%` : "..."}
          sub={kpi?.today_resolved != null ? `${kpi.today_resolved} resolved today` : null}
          color={kpi?.resolution_rate >= 70 ? "green" : kpi?.resolution_rate >= 40 ? "amber" : "red"}
        />
      </div>

      {/* AI Executive Summary */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <h3 className="font-bold text-gray-900">AI Executive Summary</h3>
            <span className="text-[10px] text-gray-400 ml-1">
              <span className="font-medium text-gray-500">Groq</span> &middot; Llama 4 Scout
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex bg-gray-100 rounded-md p-0.5">
              <button
                onClick={() => handleAnalysisLangSwitch("en")}
                className={`px-2.5 py-1 rounded text-[10px] font-semibold transition-colors ${analysisLang === "en" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
              >
                EN
              </button>
              <button
                onClick={() => handleAnalysisLangSwitch("fil")}
                className={`px-2.5 py-1 rounded text-[10px] font-semibold transition-colors ${analysisLang === "fil" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
              >
                FIL
              </button>
            </div>
            <button
              type="button"
              onClick={handleReanalyze}
              disabled={analysisLoading}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              {analysisLoading ? (
                <span className="flex items-center gap-1.5">
                  <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Analyzing...
                </span>
              ) : (
                "Re-analyze"
              )}
            </button>
          </div>
        </div>

        {analysisLoading && !analysis[analysisLang] ? (
          <div className="space-y-1.5">
            <div className="h-2.5 bg-gray-100 rounded animate-pulse w-full" />
            <div className="h-2.5 bg-gray-100 rounded animate-pulse w-11/12" />
            <div className="h-2.5 bg-gray-100 rounded animate-pulse w-10/12" />
            <div className="h-2.5 bg-gray-100 rounded animate-pulse w-full" />
            <div className="h-2.5 bg-gray-100 rounded animate-pulse w-8/12" />
          </div>
        ) : analysisError ? (
          <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            <div className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-[11px] text-red-600">{analysisError}</p>
            </div>
            <button
              onClick={() => {
                analysisFetchedRef.current[analysisLang] = false;
                setAnalysisError(null);
              }}
              className="text-[10px] font-semibold text-red-600 hover:text-red-800 underline shrink-0"
            >
              Retry
            </button>
          </div>
        ) : analysis[analysisLang]?.executive_summary ? (
          <div className="text-[13px] text-gray-700 leading-relaxed space-y-1.5">
            {analysis[analysisLang].executive_summary.split("\n\n").filter(Boolean).map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        ) : (
          <div className="py-6 text-center text-gray-400">
            <p className="text-sm">Waiting for data to analyze...</p>
          </div>
        )}
      </div>

      {/* Heatmap Map */}
      <div id="map-heatmap" className="card overflow-hidden p-0">
        <div className="p-4 pb-2">
          <h3 className="font-bold text-gray-900">Incident Heatmap</h3>
          <p className="text-xs text-gray-400">
            Real-time activity density from the last 24 hours
          </p>
        </div>
        <div className="h-80 w-full">
          <MapContainer
            center={[14.0, 122.5]}
            zoom={10}
            scrollWheelZoom={false}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            <HeatmapLayer points={heatmapPoints} />
          </MapContainer>
        </div>
        <div className="px-4 pb-3">
          <ChartInsight text={analysis[analysisLang]?.chart_insights?.incident_heatmap} />
        </div>
      </div>

      {/* Row: Status Distribution + Incident Trend */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div id="chart-status-distribution" className="card">
          <h3 className="font-bold text-gray-900 mb-4">Status Distribution</h3>
          <DynamicPlot
            Plot={Plot}
            data={[
              {
                type: "pie",
                labels: ["Safe", "Help", "Emergency"],
                values: [
                  kpi?.users_safe || 0,
                  kpi?.users_help || 0,
                  kpi?.users_emergency || 0,
                ],
                marker: {
                  colors: [GREEN, AMBER, RED],
                },
                hole: 0.45,
                textinfo: "label+percent",
                textposition: "outside",
                textfont: { size: 10 },
              },
            ]}
            layout={{
              ...DEFAULT_LAYOUT,
              height: 260,
              showlegend: false,
              margin: { l: 10, r: 10, t: 10, b: 10 },
            }}
          />
          <ChartInsight text={analysis[analysisLang]?.chart_insights?.status_distribution} />
        </div>

        <div id="chart-trend" className="card">
          <h3 className="font-bold text-gray-900 mb-4">Daily Incident Trend</h3>
          <DynamicPlot
            Plot={Plot}
            data={
              trendChart
                ? [
                    {
                      type: "scatter",
                      mode: "lines+markers",
                      x: trendChart.dates,
                      y: trendChart.incidents,
                      name: "Incidents",
                      line: { color: RED, width: 2 },
                      marker: { size: 4 },
                      fill: "tozeroy",
                      fillcolor: "rgba(239,68,68,0.1)",
                    },
                    {
                      type: "scatter",
                      mode: "lines+markers",
                      x: trendChart.dates,
                      y: trendChart.resolved,
                      name: "Resolved",
                      line: { color: GREEN, width: 2 },
                      marker: { size: 4 },
                    },
                  ]
                : []
            }
            layout={{
              ...DEFAULT_LAYOUT,
              yaxis: { rangemode: "tozero", dtick: 1 },
              xaxis: { tickfont: { size: 9 } },
              hovermode: "x",
            }}
          />
          <ChartInsight text={analysis[analysisLang]?.chart_insights?.incident_trend} />
        </div>
      </div>

      {/* Temporal Heatmap */}
      <div id="chart-temporal-heatmap" className="card">
        <h3 className="font-bold text-gray-900 mb-4">
          Activity Patterns — Hour × Day of Week
        </h3>
        <DynamicPlot
          Plot={Plot}
          data={
            temporal
              ? [
                  {
                    type: "heatmap",
                    z: temporal.values,
                    x: temporal.hours,
                    y: temporal.days,
                    colorscale: [
                      [0, "#f0fdf4"],
                      [0.25, "#bbf7d0"],
                      [0.5, "#fde68a"],
                      [0.75, "#f97316"],
                      [1, "#dc2626"],
                    ],
                    hoverongaps: false,
                    hovertemplate: "Day: %{y}<br>Hour: %{x}<br>Activity: %{z:.2f}<extra></extra>",
                  },
                ]
              : []
          }
          layout={{
            ...DEFAULT_LAYOUT,
            height: 260,
            xaxis: { title: "Hour of Day", dtick: 3, tickfont: { size: 9 } },
            yaxis: { tickfont: { size: 9 } },
            margin: { l: 40, r: 10, t: 10, b: 40 },
          }}
        />
        <ChartInsight text={analysis[analysisLang]?.chart_insights?.temporal_heatmap} />
      </div>

      {/* Row: Response Time + Barangay */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div id="chart-response-times" className="card">
          <h3 className="font-bold text-gray-900 mb-4">
            Response Time Trend (seconds)
          </h3>
          <DynamicPlot
            Plot={Plot}
            data={
              responseChart
                ? [
                    {
                      type: "bar",
                      x: responseChart.dates,
                      y: responseChart.avg,
                      name: "Avg Response",
                      marker: { color: BLUE },
                    },
                    {
                      type: "bar",
                      x: responseChart.dates,
                      y: responseChart.p90,
                      name: "P90 Response",
                      marker: { color: RED },
                    },
                  ].filter((t) => t.y.some((v) => v != null))
                : []
            }
            layout={{
              ...DEFAULT_LAYOUT,
              yaxis: { rangemode: "tozero", title: "Seconds" },
              xaxis: { tickfont: { size: 8 }, dtick: 5 },
              hovermode: "x",
            }}
          />
          <ChartInsight text={analysis[analysisLang]?.chart_insights?.response_times} />
        </div>

        <div id="chart-barangay" className="card">
          <h3 className="font-bold text-gray-900 mb-4">
            Most Affected Barangays
          </h3>
          <DynamicPlot
            Plot={Plot}
            data={
              barangayChart
                ? [
                    {
                      type: "bar",
                      orientation: "h",
                      y: barangayChart.names,
                      x: barangayChart.emergency,
                      name: "Emergency",
                      marker: { color: RED },
                      customdata: barangayChart.rates,
                      hovertemplate: "%{y}: %{x} emergency (%{customdata}%)<extra></extra>",
                    },
                    {
                      type: "bar",
                      orientation: "h",
                      y: barangayChart.names,
                      x: barangayChart.help,
                      name: "Help",
                      marker: { color: AMBER },
                      hovertemplate: "%{y}: %{x} help<extra></extra>",
                    },
                  ]
                : []
            }
            layout={{
              ...DEFAULT_LAYOUT,
              barmode: "stack",
              height: 320,
              xaxis: { rangemode: "tozero", dtick: 1 },
              yaxis: { tickfont: { size: 9 }, automargin: true },
              margin: { l: 100, r: 10, t: 10, b: 30 },
              showlegend: true,
              legend: { orientation: "h", y: 1.05, x: 0.5, xanchor: "center", font: { size: 10 } },
            }}
          />
          <ChartInsight text={analysis[analysisLang]?.chart_insights?.barangay} />
        </div>
      </div>

      {/* Row: Rescuer Performance + Demographics */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div id="chart-rescuers" className="card">
          <h3 className="font-bold text-gray-900 mb-4">
            Top Rescuers by Assignments
          </h3>
          <DynamicPlot
            Plot={Plot}
            data={
              rescuerChart
                ? [
                    {
                      type: "bar",
                      orientation: "h",
                      y: rescuerChart.names,
                      x: rescuerChart.helped,
                      name: "Helped",
                      marker: { color: GREEN },
                    },
                    {
                      type: "bar",
                      orientation: "h",
                      y: rescuerChart.names,
                      x: rescuerChart.cancelled,
                      name: "Cancelled",
                      marker: { color: GRAY },
                    },
                  ]
                : []
            }
            layout={{
              ...DEFAULT_LAYOUT,
              barmode: "stack",
              height: 320,
              xaxis: { rangemode: "tozero", dtick: 1 },
              yaxis: { tickfont: { size: 9 }, automargin: true },
              margin: { l: 100, r: 10, t: 10, b: 30 },
              showlegend: true,
              legend: { orientation: "h", y: 1.05, x: 0.5, xanchor: "center", font: { size: 10 } },
            }}
          />
          <ChartInsight text={analysis[analysisLang]?.chart_insights?.rescuer_performance} />
        </div>

        <div className="card">
          <h3 className="font-bold text-gray-900 mb-4">Demographics</h3>
          <div className="grid grid-cols-2 gap-4">
            <div id="chart-blood-type">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Blood Type
              </h4>
              {demoChart ? (
                <DynamicPlot
                  Plot={Plot}
                  data={[
                    {
                      type: "pie",
                      labels: demoChart.bloodTypes.map(([t]) => t),
                      values: demoChart.bloodTypes.map(([, c]) => c),
                      marker: {
                        colors: ["#1d4ed8", "#3b82f6", "#60a5fa", "#93c5fd", "#bfdbfe", "#dbeafe"],
                      },
                      hole: 0.4,
                      textinfo: "label+percent",
                      textfont: { size: 9 },
                    },
                  ]}
                  layout={{
                    ...DEFAULT_LAYOUT,
                    height: 200,
                    showlegend: false,
                    margin: { l: 5, r: 5, t: 5, b: 5 },
                  }}
                  config={{ displayModeBar: false, responsive: true }}
                  style={{ width: "100%", height: 200 }}
                />
              ) : (
                <div className="h-48 bg-gray-50 rounded animate-pulse" />
              )}
              <p className="text-xs text-gray-400 mt-1">
                {demo?.total_users || 0} total ·{" "}
                {demo?.vulnerable_count || 0} vulnerable
              </p>
              <ChartInsight text={analysis[analysisLang]?.chart_insights?.blood_type} />
            </div>
            <div id="chart-age-groups">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Age Groups
              </h4>
              {demoChart ? (
                <DynamicPlot
                  Plot={Plot}
                  data={[
                    {
                      type: "bar",
                      x: demoChart.ageGroups.map(([a]) => a),
                      y: demoChart.ageGroups.map(([, c]) => c),
                      marker: {
                        color: [
                          "#93c5fd",
                          "#60a5fa",
                          "#3b82f6",
                          "#1d4ed8",
                          "#1e3a8a",
                        ],
                      },
                      text: demoChart.ageGroups.map(([, c]) => c),
                      textposition: "outside",
                      textfont: { size: 9 },
                    },
                  ]}
                  layout={{
                    ...DEFAULT_LAYOUT,
                    height: 200,
                    showlegend: false,
                    margin: { l: 5, r: 5, t: 5, b: 30 },
                    xaxis: { tickfont: { size: 8 } },
                    yaxis: { rangemode: "tozero", dtick: 1 },
                  }}
                  config={{ displayModeBar: false, responsive: true }}
                  style={{ width: "100%", height: 200 }}
                />
              ) : (
                <div className="h-48 bg-gray-50 rounded animate-pulse" />
              )}
              <p className="text-xs text-gray-400 mt-1">
                {demo?.by_gender?.male || 0} male ·{" "}
                {demo?.by_gender?.female || 0} female
              </p>
              <ChartInsight text={analysis[analysisLang]?.chart_insights?.age_groups} />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Alerts */}
      <div className="card">
        <h3 className="font-bold text-gray-900 mb-4">Recent Activity</h3>
        {recentAlerts?.items && recentAlerts.items.length > 0 ? (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {recentAlerts.items.slice(0, 20).map((item) => {
              const color =
                item.new_status === "emergency"
                  ? "bg-red-500"
                  : item.new_status === "help"
                    ? "bg-amber-500"
                    : "bg-green-500";
              const label =
                item.new_status === "emergency"
                  ? "Emergency"
                  : item.new_status === "help"
                    ? "Help"
                    : "Safe";
              return (
                <div
                  key={item.id}
                  className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0"
                >
                  <span
                    className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${color}`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700 truncate">
                      <span className="font-medium">{item.full_name || "User"}</span>{" "}
                      status changed to{" "}
                      <span className="font-semibold">{label}</span>
                    </p>
                    <p className="text-xs text-gray-400">
                      {item.created_at
                        ? new Date(item.created_at).toLocaleString()
                        : ""}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-8 text-center text-gray-400">
            <p className="text-sm">No recent activity</p>
          </div>
        )}
      </div>
    </div>
  );
}

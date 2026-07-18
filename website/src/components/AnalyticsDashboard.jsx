import { useState, useEffect, useMemo, useRef, Fragment } from "react";
import {
  MapContainer,
  TileLayer,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet.heat";
import { Doughnut, Line, Bar } from "react-chartjs-2";
import "../utils/chartSetup.js";
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

function MapLegend() {
  const map = useMap();
  const ctrlRef = useRef(null);

  useEffect(() => {
    const legend = L.control({ position: "bottomright" });

    legend.onAdd = () => {
      const div = L.DomUtil.create("div", "rounded-lg shadow-md bg-white px-3 py-2 text-xs leading-tight");
      div.style.background = "white";
      div.style.padding = "8px 12px";
      div.style.borderRadius = "8px";
      div.style.boxShadow = "0 2px 8px rgba(0,0,0,0.15)";
      div.innerHTML = `
        <div style="font-weight:600;color:#374151;margin-bottom:4px;font-size:10px;">Intensity Scale</div>
        <div style="height:10px;width:120px;border-radius:4px;background:linear-gradient(to right, #22c55e, #eab308, #f97316, #ef4444, #991b1b);"></div>
        <div style="display:flex;justify-content:space-between;color:#9ca3af;font-size:9px;margin-top:2px;">
          <span>Low</span>
          <span>High</span>
        </div>
      `;
      return div;
    };

    legend.addTo(map);
    ctrlRef.current = legend;

    return () => {
      legend.remove();
    };
  }, [map]);

  return null;
}

function ChartContainer({ children, height = 280 }) {
  return <div style={{ width: "100%", height }}>{children}</div>;
}

function ActivityMatrix({ data }) {
  if (!data) return <ChartContainer height={260}><div className="h-64 bg-gray-50 rounded-xl animate-pulse" /></ChartContainer>;

  const maxVal = Math.max(...data.values.flat(), 1);
  const days = data.days || ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const hours = data.hours || Array.from({ length: 24 }, (_, i) => `${i}:00`);

  function getColor(val) {
    const i = maxVal > 0 ? val / maxVal : 0;
    if (i === 0) return "#f0fdf4";
    if (i < 0.25) return "#bbf7d0";
    if (i < 0.5) return "#fde68a";
    if (i < 0.75) return "#f97316";
    return "#dc2626";
  }

  return (
    <div className="overflow-x-auto">
      <div className="grid min-w-[500px]" style={{ gridTemplateColumns: "55px repeat(24, 1fr)", gap: 1.5 }}>
        <div />
        {hours.map((h) => (
          <div key={h} className="text-[7px] text-gray-400 text-center leading-tight">{h}</div>
        ))}
        {days.map((day, di) => (
          <Fragment key={day}>
            <div className="text-[9px] text-gray-500 text-right pr-1 leading-loose">{day}</div>
            {data.values[di].map((val, hi) => (
              <div
                key={`${di}-${hi}`}
                className="rounded-[3px]"
                style={{ backgroundColor: getColor(val), aspectRatio: "1", minWidth: 10, minHeight: 10 }}
                title={`${day} ${hours[hi]} — ${val.toFixed(2)}`}
              />
            ))}
          </Fragment>
        ))}
      </div>
      <div className="flex items-center gap-3 mt-3 justify-center">
        <span className="text-[10px] text-gray-400 font-medium">Legend:</span>
        <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: "#f0fdf4" }} />
        <span className="text-[10px] text-gray-400">None</span>
        <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: "#bbf7d0" }} />
        <span className="text-[10px] text-gray-400">Low</span>
        <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: "#fde68a" }} />
        <span className="text-[10px] text-gray-400">Moderate</span>
        <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: "#f97316" }} />
        <span className="text-[10px] text-gray-400">High</span>
        <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: "#dc2626" }} />
        <span className="text-[10px] text-gray-400">Very High</span>
      </div>
    </div>
  );
}

function usePolling(fetchFn, intervalMs, deps = [], enabled = true, initialDelayMs = 0) {
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

    const initialTimer = setTimeout(load, initialDelayMs);
    if (intervalMs > 0) {
      timer = setInterval(load, intervalMs);
    }

    return () => {
      mounted = false;
      clearTimeout(initialTimer);
      if (timer) clearInterval(timer);
    };
  }, [...deps, enabled]);

  return { data, loading, error };
}

export default function AnalyticsDashboard() {
  const { session } = useAuth();
  const [backfilling, setBackfilling] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [analysis, setAnalysis] = useState({ en: null, fil: null });
  const [analysisLang, setAnalysisLang] = useState("en");
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const analysisFetchedRef = useRef({ en: false, fil: false });

  async function handleRefresh() {
    setBackfilling(true);
    try {
      await triggerBackfill();
      setRefreshKey((k) => k + 1);
      analysisFetchedRef.current = { en: false, fil: false };
      setAnalysis({ en: null, fil: null });
    } catch {
      // ignore
    } finally {
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

  const { data: kpi, loading: kpiLoading } = usePolling(fetchKpiData, 60000, [refreshKey], !!session, 0);
  const { data: heatmapData } = usePolling(() => fetchHeatmapData(24), 60000, [refreshKey], !!session, 300);
  const { data: trends } = usePolling(() => fetchTrendsData(30), 300000, [refreshKey], !!session, 600);
  const { data: temporal } = usePolling(fetchTemporalHeatmap, 300000, [refreshKey], !!session, 900);
  const { data: responseTimes } = usePolling(() => fetchResponseTimes(30), 300000, [refreshKey], !!session, 1200);
  const { data: barangay } = usePolling(fetchBarangayStats, 300000, [refreshKey], !!session, 1500);
  const { data: rescuerPerf } = usePolling(fetchRescuerPerformance, 300000, [refreshKey], !!session, 1800);
  const { data: demo } = usePolling(fetchDemographics, 600000, [refreshKey], !!session, 2100);
  const { data: evacStatus } = usePolling(fetchEvacuationStatus, 300000, [refreshKey], !!session, 2400);
  const { data: recentAlerts } = usePolling(() => fetchRecentActivity(20), 120000, [refreshKey], !!session, 2700);

  useEffect(() => {
    if (!kpi || !trends || !barangay || !responseTimes || !demo || !rescuerPerf || !temporal || !heatmapData) return;
    if (analysisFetchedRef.current[analysisLang]) return;
    runAnalysis(analysisLang);
  }, [kpi, trends, barangay, responseTimes, demo, rescuerPerf, temporal, heatmapData, analysisLang, refreshKey]);

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
    return {
      dates: days.map((d) => d.date),
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

  const statusDistChartData = useMemo(() => ({
    labels: ["Safe", "Help", "Emergency"],
    datasets: [{
      data: [kpi?.users_safe || 0, kpi?.users_help || 0, kpi?.users_emergency || 0],
      backgroundColor: [GREEN, AMBER, RED],
      borderWidth: 0,
    }],
  }), [kpi?.users_safe, kpi?.users_help, kpi?.users_emergency]);

  const trendChartData = useMemo(() => {
    if (!trendChart) return { labels: [], datasets: [] };
    return {
      labels: trendChart.dates,
      datasets: [
        {
          label: "Incidents",
          data: trendChart.incidents,
          borderColor: RED,
          backgroundColor: "rgba(239,68,68,0.1)",
          fill: true,
          tension: 0,
          pointRadius: 4,
          borderWidth: 2,
        },
        {
          label: "Resolved",
          data: trendChart.resolved,
          borderColor: GREEN,
          backgroundColor: "transparent",
          fill: false,
          tension: 0,
          pointRadius: 4,
          borderWidth: 2,
        },
      ],
    };
  }, [trendChart]);

  const responseChartData = useMemo(() => {
    if (!responseChart) return { labels: [], datasets: [] };
    const nonNull = responseChart.avg.some((v) => v != null) || responseChart.p90.some((v) => v != null);
    if (!nonNull) return { labels: responseChart.dates, datasets: [] };
    return {
      labels: responseChart.dates,
      datasets: [
        {
          label: "Avg Response",
          data: responseChart.avg,
          backgroundColor: BLUE,
        },
        {
          label: "P90 Response",
          data: responseChart.p90,
          backgroundColor: RED,
        },
      ],
    };
  }, [responseChart]);

  const barangayChartData = useMemo(() => {
    if (!barangayChart) return { labels: [], datasets: [] };
    return {
      labels: barangayChart.names,
      datasets: [
        {
          label: "Emergency",
          data: barangayChart.emergency,
          backgroundColor: RED,
        },
        {
          label: "Help",
          data: barangayChart.help,
          backgroundColor: AMBER,
        },
      ],
    };
  }, [barangayChart]);

  const rescuerChartData = useMemo(() => {
    if (!rescuerChart) return { labels: [], datasets: [] };
    return {
      labels: rescuerChart.names,
      datasets: [
        {
          label: "Helped",
          data: rescuerChart.helped,
          backgroundColor: GREEN,
        },
        {
          label: "Cancelled",
          data: rescuerChart.cancelled,
          backgroundColor: GRAY,
        },
      ],
    };
  }, [rescuerChart]);

  const bloodTypeChartData = useMemo(() => {
    if (!demoChart) return { labels: [], datasets: [] };
    return {
      labels: demoChart.bloodTypes.map(([t]) => t),
      datasets: [{
        data: demoChart.bloodTypes.map(([, c]) => c),
        backgroundColor: ["#1d4ed8", "#3b82f6", "#60a5fa", "#93c5fd", "#bfdbfe", "#dbeafe"],
        borderWidth: 0,
      }],
    };
  }, [demoChart]);

  const ageGroupChartData = useMemo(() => {
    if (!demoChart) return { labels: [], datasets: [] };
    return {
      labels: demoChart.ageGroups.map(([a]) => a),
      datasets: [{
        data: demoChart.ageGroups.map(([, c]) => c),
        backgroundColor: ["#93c5fd", "#60a5fa", "#3b82f6", "#1d4ed8", "#1e3a8a"],
      }],
    };
  }, [demoChart]);

  const DOUGHNUT_OPTS = {
    cutout: "55%",
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      datalabels: {
        color: "#374151",
        font: { size: 10 },
        formatter: (v, ctx) => {
          const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
          const pct = total > 0 ? ((v / total) * 100).toFixed(0) : 0;
          return `${ctx.chart.data.labels[ctx.dataIndex]}\n${pct}%`;
        },
      },
    },
  };

  const LINE_OPTS = {
    maintainAspectRatio: false,
    responsive: true,
    scales: {
      y: { beginAtZero: true, ticks: { stepSize: 1 } },
      x: { ticks: { font: { size: 9 } } },
    },
    interaction: { mode: "index", axis: "x" },
    plugins: { legend: { display: false }, datalabels: { display: false } },
  };

  const RESPONSE_OPTS = {
    maintainAspectRatio: false,
    responsive: true,
    scales: {
      y: { beginAtZero: true, title: { display: true, text: "Seconds" } },
      x: { ticks: { font: { size: 8 } } },
    },
    interaction: { mode: "index", axis: "x" },
    plugins: { legend: { display: false }, datalabels: { display: false } },
  };

  const STACKED_H_OPTS = {
    indexAxis: "y",
    maintainAspectRatio: false,
    responsive: true,
    scales: {
      x: { stacked: true, beginAtZero: true, ticks: { stepSize: 1 } },
      y: { stacked: true, ticks: { font: { size: 9 } } },
    },
    plugins: {
      legend: { display: true, position: "top", labels: { font: { size: 10 } } },
      datalabels: { display: false },
    },
  };

  const AGE_OPTS = {
    maintainAspectRatio: false,
    responsive: true,
    scales: {
      y: { beginAtZero: true, ticks: { stepSize: 1 } },
      x: { ticks: { font: { size: 8 } } },
    },
    plugins: {
      legend: { display: false },
      datalabels: {
        color: "#374151",
        anchor: "end",
        align: "end",
        font: { size: 9 },
        formatter: (v) => v,
      },
    },
  };

  const AGE_DATASET = useMemo(() => {
    if (!demoChart) return [];
    return [{
      data: demoChart.ageGroups.map(([, c]) => c),
      backgroundColor: ["#93c5fd", "#60a5fa", "#3b82f6", "#1d4ed8", "#1e3a8a"],
    }];
  }, [demoChart]);

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
        <KpiCard label="Total Users" value={kpi?.total_users} color="blue" />
        <KpiCard
          label="Emergency"
          value={kpi?.users_emergency}
          sub={kpi?.emergency_rate != null ? `${kpi.emergency_rate}% of users` : null}
          color="red"
        />
        <KpiCard label="Help Needed" value={kpi?.users_help} color="amber" />
        <KpiCard
          label="Active Rescuers"
          value={kpi?.active_rescuers}
          sub={kpi?.available_rescuers != null ? `${kpi.available_rescuers} available` : null}
          color="green"
        />
        <KpiCard
          label="Avg Response"
          value={kpi?.avg_response_seconds != null ? `${Math.round(kpi.avg_response_seconds / 60)}m` : "..."}
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
            <MapLegend />
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
          <ChartContainer height={260}>
            <Doughnut data={statusDistChartData} options={DOUGHNUT_OPTS} />
          </ChartContainer>
          <ChartInsight text={analysis[analysisLang]?.chart_insights?.status_distribution} />
        </div>

        <div id="chart-trend" className="card">
          <h3 className="font-bold text-gray-900 mb-4">Daily Incident Trend</h3>
          <ChartContainer height={280}>
            <Line data={trendChartData} options={LINE_OPTS} />
          </ChartContainer>
          <ChartInsight text={analysis[analysisLang]?.chart_insights?.incident_trend} />
        </div>
      </div>

      {/* Temporal Heatmap */}
      <div id="chart-temporal-heatmap" className="card">
        <h3 className="font-bold text-gray-900 mb-4">
          Activity Patterns — Hour × Day of Week
        </h3>
        <ActivityMatrix data={temporal} />
        <ChartInsight text={analysis[analysisLang]?.chart_insights?.temporal_heatmap} />
      </div>

      {/* Row: Response Time + Barangay */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div id="chart-response-times" className="card">
          <h3 className="font-bold text-gray-900 mb-4">
            Response Time Trend (seconds)
          </h3>
          <ChartContainer height={280}>
            <Bar data={responseChartData} options={RESPONSE_OPTS} />
          </ChartContainer>
          <ChartInsight text={analysis[analysisLang]?.chart_insights?.response_times} />
        </div>

        <div id="chart-barangay" className="card">
          <h3 className="font-bold text-gray-900 mb-4">
            Most Affected Barangays
          </h3>
          <ChartContainer height={320}>
            <Bar data={barangayChartData} options={STACKED_H_OPTS} />
          </ChartContainer>
          <ChartInsight text={analysis[analysisLang]?.chart_insights?.barangay} />
        </div>
      </div>

      {/* Row: Rescuer Performance + Demographics */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div id="chart-rescuers" className="card">
          <h3 className="font-bold text-gray-900 mb-4">
            Top Rescuers by Assignments
          </h3>
          <ChartContainer height={320}>
            <Bar data={rescuerChartData} options={STACKED_H_OPTS} />
          </ChartContainer>
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
                <ChartContainer height={200}>
                  <Doughnut data={bloodTypeChartData} options={DOUGHNUT_OPTS} />
                </ChartContainer>
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
                <ChartContainer height={200}>
                  <Bar
                    data={ageGroupChartData}
                    options={AGE_OPTS}
                  />
                </ChartContainer>
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
                  <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${color}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700 truncate">
                      <span className="font-medium">{item.full_name || "User"}</span>{" "}
                      status changed to{" "}
                      <span className="font-semibold">{label}</span>
                    </p>
                    <p className="text-xs text-gray-400">
                      {item.created_at ? new Date(item.created_at).toLocaleString() : ""}
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

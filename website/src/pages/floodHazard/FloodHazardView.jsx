import { useState, useEffect, useCallback } from "react";
import { useToast } from "../../context/ToastContext";
import { fetchAll, rerunAnalysis } from "../../services/floodHazardApi";
import FloodHazardStats from "./FloodHazardStats";
import FloodHazardMap from "./FloodHazardMap";
import FloodHazardCharts from "./FloodHazardCharts";
import FloodHazardTable from "./FloodHazardTable";
import FloodHazardSidebar from "./FloodHazardSidebar";
import LayerControl from "./LayerControl";

export default function FloodHazardView() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [geojson, setGeojson] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [rerunLoading, setRerunLoading] = useState(false);
  const [selectedBarangay, setSelectedBarangay] = useState(null);
  const [opacity, setOpacity] = useState(70);
  const [basemap, setBasemap] = useState("satellite");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const all = await fetchAll();
      setSummary(all.summary?.data || []);
      setGeojson(all.geojson || null);
      setLastUpdated(all.summary?.last_updated || null);
    } catch (err) {
      showToast("Failed to load flood hazard data: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleRerun() {
    setRerunLoading(true);
    try {
      await rerunAnalysis();
      showToast("Analysis started. Refreshing in 20 seconds...", "info", 5000);
      setTimeout(loadData, 20000);
    } catch (err) {
      showToast("Failed to trigger analysis: " + err.message, "error");
      setRerunLoading(false);
    }
  }

  function handleSelectBarangay(name) {
    setSelectedBarangay((prev) => (prev === name ? null : name));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-shield-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Flood Risk Analysis</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Tagkawayan, Quezon — 100-Year Flood Hazard Model
            {lastUpdated && <span> &middot; Last updated: {new Date(lastUpdated).toLocaleString()}</span>}
          </p>
        </div>
        <button
          onClick={handleRerun}
          disabled={rerunLoading}
          className="btn-primary py-2 px-4 text-sm"
        >
          {rerunLoading ? "Running..." : "Rerun Analysis"}
        </button>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-xs text-amber-800">
        This analysis uses the <strong>100-year flood hazard model</strong> from the Department of Environment and Natural Resources (DENR) and UP Resilience Institute. Barangay risk is calculated as the percentage of its area that overlaps with medium and high hazard zones. A 100-year flood has a 1% chance of occurring in any given year — it represents severe, large-scale flooding events, not minor rains.
      </div>

      <FloodHazardStats summary={summary} />

      <div className="flex flex-col lg:flex-row gap-4">
        <div className="lg:w-[70%] flex flex-col gap-4">
          <div className="h-[55vh] min-h-[400px]">
            <FloodHazardMap
              geojson={geojson}
              summary={summary}
              onSelectBarangay={handleSelectBarangay}
              selectedBarangay={selectedBarangay}
              opacity={opacity}
              basemap={basemap}
            />
          </div>
        </div>
        <div className="lg:w-[30%] flex flex-col gap-4">
          <LayerControl
            opacity={opacity} setOpacity={setOpacity}
            basemap={basemap} setBasemap={setBasemap}
          />
          <FloodHazardSidebar selected={selectedBarangay} summary={summary} />
        </div>
      </div>

      <FloodHazardCharts summary={summary} onSelectBarangay={handleSelectBarangay} />

      <FloodHazardTable
        summary={summary}
        onSelectBarangay={handleSelectBarangay}
        selectedBarangay={selectedBarangay}
      />
    </div>
  );
}

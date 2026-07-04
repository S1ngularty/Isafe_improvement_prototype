import { useState, useEffect, useCallback, useRef } from "react";
import { useToast } from "../../context/ToastContext";
import { useAuth } from "../../context/AuthContext";
import { fetchAll, rerunAnalysis, fetchFloodAnalysis } from "../../services/floodHazardApi";
import FloodHazardStats from "./FloodHazardStats";
import FloodHazardMap from "./FloodHazardMap";
import FloodHazardCharts from "./FloodHazardCharts";
import FloodHazardTable from "./FloodHazardTable";
import FloodHazardSidebar from "./FloodHazardSidebar";
import LayerControl from "./LayerControl";

export default function FloodHazardView() {
  const { showToast } = useToast();
  const { role } = useAuth();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [geojson, setGeojson] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [rerunLoading, setRerunLoading] = useState(false);
  const [selectedBarangay, setSelectedBarangay] = useState(null);
  const [opacity, setOpacity] = useState(70);
  const [basemap, setBasemap] = useState("satellite");
  const [analysis, setAnalysis] = useState({ en: null, fil: null });
  const [analysisLang, setAnalysisLang] = useState("en");
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);
  const fetchedRef = useRef({});

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

  useEffect(() => {
    if (!selectedBarangay || !summary) return;
    const key = `${selectedBarangay}_${analysisLang}`;
    if (fetchedRef.current[key]) return;
    const row = summary.find((r) => r.barangay === selectedBarangay);
    if (!row) return;
    setAnalysisLoading(true);
    setAnalysisError(null);
    fetchFloodAnalysis(selectedBarangay, row, analysisLang)
      .then((text) => {
        setAnalysis((prev) => ({ ...prev, [analysisLang]: text }));
        fetchedRef.current[key] = true;
      })
      .catch((err) => setAnalysisError(err.message))
      .finally(() => setAnalysisLoading(false));
  }, [selectedBarangay, analysisLang, summary]);

  function handleLangSwitch(lang) {
    if (lang === analysisLang) return;
    setAnalysisLang(lang);
  }

  useEffect(() => {
    setAnalysis({ en: null, fil: null });
    fetchedRef.current = {};
  }, [selectedBarangay]);

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
      <div className="rounded-xl overflow-hidden border border-gray-200">
        <div className="h-[75vh] min-h-[500px] bg-gray-50 animate-pulse flex flex-col items-center justify-center gap-4">
          <div className="w-10 h-10 border-[3px] border-shield-500 border-t-transparent rounded-full animate-spin" />
          <div className="space-y-1 text-center">
            <p className="text-sm font-medium text-gray-500">Loading flood hazard data...</p>
            <p className="text-xs text-gray-400">Fetching risk analysis for Tagkawayan, Quezon</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-600 to-orange-500 flex items-center justify-center shadow-lg shadow-red-600/20">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 16.58A5 5 0 0018 7h-1.26A8 8 0 104 15.25" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Flood Risk Analysis</h1>
            <p className="text-xs text-gray-500 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              Tagkawayan, Quezon
              <span className="text-gray-300">&middot;</span>
              100-Year Flood Model
              {lastUpdated && (
                <>
                  <span className="text-gray-300 hidden sm:inline">&middot;</span>
                  <span className="hidden sm:inline">Updated {new Date(lastUpdated).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}</span>
                </>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] px-2 py-1 rounded-md bg-amber-50 text-amber-700 font-medium border border-amber-200">
            1% annual exceedance probability
          </span>
          {role === "admin" && (
            <button
              onClick={handleRerun}
              disabled={rerunLoading}
              className="btn-primary py-1.5 px-3 text-xs flex items-center gap-1.5"
            >
              <svg className={`w-3.5 h-3.5 ${rerunLoading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {rerunLoading ? "Running..." : "Rerun"}
            </button>
          )}
        </div>
      </div>

      <FloodHazardStats summary={summary} />

      <div className="flex flex-col lg:flex-row gap-4">
        <div className="lg:w-[68%] flex flex-col gap-4">
          <div className="h-[60vh] min-h-[420px] relative">
            <FloodHazardMap
              geojson={geojson}
              summary={summary}
              onSelectBarangay={handleSelectBarangay}
              selectedBarangay={selectedBarangay}
              opacity={opacity}
              basemap={basemap}
            />
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-3 flex items-start gap-3 text-[11px] text-gray-500 border-b border-gray-100">
              <svg className="w-4 h-4 shrink-0 text-gray-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>
                <strong>100-year flood hazard model</strong> from the Department of Environment and Natural Resources (DENR) and UP Resilience Institute. Barangay risk is calculated as the percentage of its area overlapping with medium and high hazard zones. A 100-year flood has a <strong>1% chance</strong> of occurring in any given year.
              </span>
            </div>

            {selectedBarangay && (
              <div className="p-3 border-t border-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                      AI Analysis &mdash; {selectedBarangay}
                    </h3>
                  </div>
                  <div className="flex bg-gray-100 rounded-md p-0.5">
                    <button
                      onClick={() => handleLangSwitch("en")}
                      className={`px-2.5 py-1 rounded text-[10px] font-semibold transition-colors ${analysisLang === "en" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                    >
                      EN
                    </button>
                    <button
                      onClick={() => handleLangSwitch("fil")}
                      className={`px-2.5 py-1 rounded text-[10px] font-semibold transition-colors ${analysisLang === "fil" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                    >
                      FIL
                    </button>
                  </div>
                </div>

                {analysisLoading ? (
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
                        fetchedRef.current[`${selectedBarangay}_${analysisLang}`] = false;
                        setAnalysisError(null);
                      }}
                      className="text-[10px] font-semibold text-red-600 hover:text-red-800 underline shrink-0"
                    >
                      Retry
                    </button>
                  </div>
                ) : analysis[analysisLang] ? (
                  <div className="text-[13px] text-gray-700 leading-relaxed space-y-1.5">
                    {analysis[analysisLang].split("\n\n").filter(Boolean).map((para, i) => (
                      <p key={i}>{para}</p>
                    ))}
                  </div>
                ) : null}

                <p className="text-[10px] text-gray-400 mt-2">
                  <span className="font-medium text-gray-500">Groq</span> &middot; Llama 4 Scout
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="lg:w-[32%] flex flex-col gap-3">
          <LayerControl
            opacity={opacity} setOpacity={setOpacity}
            basemap={basemap} setBasemap={setBasemap}
          />
          <FloodHazardSidebar
            selected={selectedBarangay}
            summary={summary}
            onZoomTo={null}
          />
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

export default function FloodHazardSidebar({ selected, summary }) {
  if (!selected || !summary) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Analysis Summary</h3>
        <div className="space-y-3 text-sm text-gray-600">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-gray-900">{summary.length} Barangays</p>
              <p className="text-xs text-gray-400">Analyzed for flood hazard</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-gray-900">100-Year Flood</p>
              <p className="text-xs text-gray-400">1% annual exceedance probability</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-gray-900">Tagkawayan, Quezon</p>
              <p className="text-xs text-gray-400">Calabarzon, Philippines</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-gray-900">DENR + UP Resilience</p>
              <p className="text-xs text-gray-400">Institute data sources</p>
            </div>
          </div>
        </div>
        <div className="mt-5 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-400 text-center">
            Click a barangay on the map or table for detailed risk information
          </p>
        </div>
      </div>
    );
  }

  const s = summary.find((r) => r.barangay === selected);
  if (!s) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 text-center">
        <p className="text-xs text-gray-400">Barangay not found in summary data</p>
      </div>
    );
  }

  const riskConfig = {
    "Very High": { color: "#67000d", bg: "bg-red-900", text: "text-white" },
    "High": { color: "#a50f15", bg: "bg-red-600", text: "text-white" },
    "Moderate": { color: "#ef3b2d", bg: "bg-orange-500", text: "text-white" },
    "Low": { color: "#fc9272", bg: "bg-orange-200", text: "text-orange-800" },
    "None": { color: "#fee0d2", bg: "bg-gray-100", text: "text-gray-500" },
  };
  const rc = riskConfig[s.risk_level] || riskConfig["None"];

  const bars = [
    { label: "High Hazard", pct: s.pct_high || 0, color: "#5c1010" },
    { label: "Medium Hazard", pct: s.pct_medium || 0, color: "#b91c1c" },
    { label: "Total Exposure", pct: s.pct_total_hazard || 0, color: "#ef4444" },
  ];

  const coverageRatio = s.barangay_area_has > 0
    ? ((s.total_hazard_has / s.barangay_area_has) * 100).toFixed(1)
    : "0.0";

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-4 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-900">{s.barangay}</h3>
            <span className={`mt-1 inline-block px-2 py-0.5 rounded-full text-[11px] font-bold ${rc.bg} ${rc.text}`}>
              {s.risk_level || "None"} Risk
            </span>
          </div>
          {s.pct_total_hazard > 0 && (
            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-red-50 border-2 border-red-200 shrink-0">
              <span className="text-sm font-extrabold text-red-700">{s.pct_total_hazard?.toFixed(0)}%</span>
            </div>
          )}
        </div>

        <div className="space-y-2.5">
          {bars.map(({ label, pct, color }) => (
            <div key={label}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-gray-600">{label}</span>
                <span className="font-semibold text-gray-900">{pct.toFixed(1)}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="pt-3 border-t border-gray-100 space-y-1.5 text-[11px]">
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Hazard Area</span>
            <span className="font-medium text-gray-900">{s.total_hazard_has?.toFixed(1)} ha</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Barangay Area</span>
            <span className="font-medium text-gray-900">{s.barangay_area_has?.toFixed(1)} ha</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-500">Coverage Ratio</span>
            <span className="font-medium text-gray-900">{coverageRatio}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FloodHazardSidebar({ selected, summary }) {
  if (!selected || !summary) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center text-gray-400 text-xs">
        Click a barangay on the map or table to see details
      </div>
    );
  }

  const s = summary.find((r) => r.barangay === selected);
  if (!s) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-center text-gray-400 text-xs">
        Barangay not found in summary data
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-3">
      <div>
        <h3 className="text-sm font-bold text-gray-900">{s.barangay}</h3>
        <span className={`mt-1 inline-block px-2 py-0.5 rounded-full text-xs font-bold ${
          s.risk_level === "Very High" ? "bg-red-900 text-white" :
          s.risk_level === "High" ? "bg-red-600 text-white" :
          s.risk_level === "Moderate" ? "bg-orange-500 text-white" :
          s.risk_level === "Low" ? "bg-orange-200 text-orange-800" :
          "bg-gray-100 text-gray-500"
        }`}>
          {s.risk_level || "None"} Risk
        </span>
      </div>

      <div className="space-y-2">
        {[
          { label: "High Hazard", value: `${s.pct_high?.toFixed(1)}%`, color: "bg-[#5c1010]" },
          { label: "Medium Hazard", value: `${s.pct_medium?.toFixed(1)}%`, color: "bg-[#b91c1c]" },
          { label: "Total Exposure", value: `${s.pct_total_hazard?.toFixed(1)}%`, color: "bg-[#ef4444]" },
        ].map(({ label, value, color }) => (
          <div key={label} className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${color}`} />
            <span className="text-xs text-gray-600 flex-1">{label}</span>
            <span className="text-xs font-semibold text-gray-900">{value}</span>
          </div>
        ))}
      </div>

      <div className="pt-2 border-t border-gray-100">
        <div className="text-[11px] text-gray-500 space-y-1">
          <p>Hazard Area: {s.total_hazard_has?.toFixed(1)} ha</p>
          <p>Barangay Area: {s.barangay_area_has?.toFixed(1)} ha</p>
          <p>Coverage Ratio: {s.pct_total_hazard > 0 ? ((s.total_hazard_has / (s.barangay_area_has || 0.01)) * 100).toFixed(1) : "0.0"}%</p>
        </div>
      </div>
    </div>
  );
}

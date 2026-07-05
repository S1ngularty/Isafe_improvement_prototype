import { useState, useMemo } from "react";

const RISK_BADGE = {
  "Very High": "bg-red-900 text-white",
  "High": "bg-red-600 text-white",
  "Moderate": "bg-orange-500 text-white",
  "Low": "bg-orange-200 text-orange-800",
  "None": "bg-gray-100 text-gray-500",
};

const RISK_ORDER = ["Very High", "High", "Moderate", "Low", "None"];

const FILTER_OPTIONS = ["All", "Very High", "High", "Moderate", "Low", "None"];

export default function FloodHazardTable({ summary, onSelectBarangay, selectedBarangay }) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("pct_total_hazard");
  const [sortAsc, setSortAsc] = useState(false);
  const [riskFilter, setRiskFilter] = useState("All");

  const filtered = useMemo(() => {
    if (!summary) return [];
    let rows = [...summary];

    if (riskFilter !== "All") {
      rows = rows.filter((s) => s.risk_level === riskFilter);
    }

    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter((s) => s.barangay?.toLowerCase().includes(q));
    }

    rows.sort((a, b) => {
      const va = a[sortKey] ?? 0;
      const vb = b[sortKey] ?? 0;
      if (typeof va === "string") {
        return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      return sortAsc ? va - vb : vb - va;
    });
    return rows;
  }, [summary, search, sortKey, sortAsc, riskFilter]);

  function handleSort(key) {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(key === "barangay");
    }
  }

  function SortIcon({ active, asc }) {
    if (!active) return <span className="text-gray-300 ml-1">&#x2195;</span>;
    return <span className="text-shield-600 ml-1">{asc ? "\u2191" : "\u2193"}</span>;
  }

  const headers = [
    { key: "barangay", label: "Barangay" },
    { key: "pct_high", label: "High %" },
    { key: "pct_medium", label: "Med %" },
    { key: "pct_total_hazard", label: "Total %" },
    { key: "risk_level", label: "Risk" },
  ];

  const riskCounts = useMemo(() => {
    if (!summary) return {};
    const counts = { All: summary.length };
    RISK_ORDER.forEach((r) => { counts[r] = 0; });
    summary.forEach((s) => { if (counts[s.risk_level] != null) counts[s.risk_level]++; });
    return counts;
  }, [summary]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-4 pt-3 pb-2 border-b border-gray-100 space-y-2">
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {FILTER_OPTIONS.map((level) => {
            const count = riskCounts[level] ?? 0;
            const active = riskFilter === level;
            const colorClass = level === "Very High" ? "border-red-900 text-red-900" :
              level === "High" ? "border-red-600 text-red-700" :
              level === "Moderate" ? "border-orange-500 text-orange-700" :
              level === "Low" ? "border-orange-300 text-orange-600" :
              level === "None" ? "border-gray-300 text-gray-500" :
              "border-gray-200 text-gray-700";
            return (
              <button
                key={level}
                onClick={() => setRiskFilter(level)}
                className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all ${
                  active
                    ? `${colorClass} bg-white shadow-sm`
                    : "border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-50"
                }`}
              >
                {level} <span className="opacity-60">({count})</span>
              </button>
            );
          })}
        </div>
        <div className="flex items-center justify-between">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search barangay..."
            className="text-xs rounded-md border border-gray-200 py-1.5 px-2.5 w-48 focus:ring-1 focus:ring-shield-500 focus:border-shield-500 outline-none"
          />
          <span className="text-xs text-gray-500 font-medium">{filtered.length} barangays</span>
        </div>
      </div>
      <div className="overflow-x-auto max-h-96 overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              {headers.map(({ key, label }) => (
                <th
                  key={key}
                  onClick={() => handleSort(key)}
                  className="text-left px-4 py-2.5 text-gray-600 font-semibold cursor-pointer hover:text-gray-900 whitespace-nowrap select-none"
                >
                  {label}
                  <SortIcon active={sortKey === key} asc={sortAsc} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-gray-400">
                  No barangays match the current filter
                </td>
              </tr>
            )}
            {filtered.map((s, i) => {
              const isSelected = selectedBarangay === s.barangay;
              return (
                <tr
                  key={s.barangay || i}
                  onClick={() => onSelectBarangay?.(s.barangay)}
                  className={`cursor-pointer transition-all ${
                    isSelected
                      ? "bg-red-50 shadow-[inset_3px_0_0_0] shadow-red-600"
                      : "hover:bg-gray-50"
                  }`}
                >
                  <td className="px-4 py-2.5 font-medium text-gray-900 flex items-center gap-2">
                    {s.barangay}
                    {s.risk_level === "Very High" && (
                      <svg className="w-3 h-3 text-red-600 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2L1 21h22L12 2zm0 4l7.5 13h-15L12 6zm0 2l-6 10h12L12 8z" />
                      </svg>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="font-medium text-gray-900">{s.pct_high?.toFixed(1)}</span>
                    <span className="text-gray-400 ml-0.5">%</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="font-medium text-gray-900">{s.pct_medium?.toFixed(1)}</span>
                    <span className="text-gray-400 ml-0.5">%</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-12 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-red-500"
                          style={{ width: `${Math.min(s.pct_total_hazard || 0, 100)}%` }}
                        />
                      </div>
                      <span className="font-bold text-gray-900 tabular-nums">{s.pct_total_hazard?.toFixed(1)}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${RISK_BADGE[s.risk_level] || "bg-gray-100 text-gray-500"}`}>
                      {s.risk_level || "None"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import { useState, useMemo } from "react";

const RISK_BADGE = {
  "Very High": "bg-red-900 text-white",
  "High": "bg-red-600 text-white",
  "Moderate": "bg-orange-500 text-white",
  "Low": "bg-orange-200 text-orange-800",
  "None": "bg-gray-100 text-gray-500",
};

export default function FloodHazardTable({ summary, onSelectBarangay, selectedBarangay }) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("pct_total_hazard");
  const [sortAsc, setSortAsc] = useState(false);

  const filtered = useMemo(() => {
    if (!summary) return [];
    let rows = [...summary];
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter((s) => s.barangay?.toLowerCase().includes(q));
    }
    rows.sort((a, b) => {
      const v = (a[sortKey] ?? 0) - (b[sortKey] ?? 0);
      return sortAsc ? v : -v;
    });
    return rows;
  }, [summary, search, sortKey, sortAsc]);

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

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search barangay..."
          className="text-xs rounded-md border-gray-200 py-1.5 px-2.5 w-48 focus:ring-1 focus:ring-shield-500 focus:border-shield-500"
        />
        <span className="text-[10px] text-gray-400">{filtered.length} barangays</span>
      </div>
      <div className="overflow-x-auto max-h-96 overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              {headers.map(({ key, label }) => (
                <th
                  key={key}
                  onClick={() => handleSort(key)}
                  className="text-left px-4 py-2 text-gray-500 font-medium cursor-pointer hover:text-gray-700 whitespace-nowrap"
                >
                  {label}
                  <SortIcon active={sortKey === key} asc={sortAsc} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map((s) => (
              <tr
                key={s.barangay}
                onClick={() => onSelectBarangay?.(s.barangay)}
                className={`cursor-pointer transition-colors hover:bg-gray-50 ${
                  selectedBarangay === s.barangay ? "bg-shield-50 border-l-2 border-shield-600" : ""
                }`}
              >
                <td className="px-4 py-2 font-medium text-gray-900">{s.barangay}</td>
                <td className="px-4 py-2 text-gray-600">{s.pct_high?.toFixed(1)}</td>
                <td className="px-4 py-2 text-gray-600">{s.pct_medium?.toFixed(1)}</td>
                <td className="px-4 py-2 font-semibold text-gray-900">{s.pct_total_hazard?.toFixed(1)}</td>
                <td className="px-4 py-2">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${RISK_BADGE[s.risk_level] || "bg-gray-100 text-gray-500"}`}>
                    {s.risk_level || "None"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

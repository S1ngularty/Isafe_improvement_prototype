export default function FloodHazardStats({ summary }) {
  if (!summary || summary.length === 0) {
    return <div className="h-20 bg-gray-50 rounded-xl animate-pulse" />;
  }

  const atRisk = summary.filter((s) => s.pct_total_hazard > 0).length;
  const veryHigh = summary.filter((s) => s.risk_level === "Very High").length;
  const high = summary.filter((s) => s.risk_level === "High").length;
  const moderate = summary.filter((s) => s.risk_level === "Moderate").length;

  const cards = [
    { label: "At-Risk Barangays", value: `${atRisk} / ${summary.length}`, borderColor: "border-shield-600", bgColor: "bg-shield-50" },
    { label: "Very High Risk", value: veryHigh, borderColor: "border-red-900", bgColor: "bg-red-50" },
    { label: "High Risk", value: high, borderColor: "border-red-700", bgColor: "bg-red-50" },
    { label: "Moderate + Low", value: moderate + summary.filter((s) => s.risk_level === "Low").length, borderColor: "border-orange-500", bgColor: "bg-orange-50" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map(({ label, value, borderColor, bgColor }) => (
        <div key={label} className={`${bgColor} border-2 ${borderColor} rounded-xl px-4 py-3 shadow-sm`}>
          <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wide">{label}</p>
          <p className="text-2xl font-extrabold text-gray-900 mt-1">{value}</p>
        </div>
      ))}
    </div>
  );
}

export default function FloodHazardStats({ summary }) {
  if (!summary || summary.length === 0) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 bg-gray-50 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  const total = summary.length;
  const atRisk = summary.filter((s) => s.pct_total_hazard > 0).length;
  const veryHigh = summary.filter((s) => s.risk_level === "Very High").length;
  const high = summary.filter((s) => s.risk_level === "High").length;
  const moderate = summary.filter((s) => s.risk_level === "Moderate").length;
  const low = summary.filter((s) => s.risk_level === "Low").length;
  const totalHazardArea = summary.reduce((acc, s) => acc + (s.total_hazard_has || 0), 0);

  const cards = [
    {
      label: "At-Risk Barangays",
      value: atRisk,
      sub: `${total} total · ${(atRisk / total * 100).toFixed(0)}% of municipality`,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      gradient: "from-blue-600 to-blue-500",
      shadow: "shadow-blue-600/20",
      textColor: "text-blue-700",
      bgLight: "bg-blue-50",
    },
    {
      label: "Very High Risk",
      value: veryHigh,
      sub: `${((veryHigh / total) * 100).toFixed(0)}% of barangays · Immediate action needed`,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M10.29 3.86l-8.1 14c-.6 1.04.15 2.14 1.21 2.14h16.2c1.06 0 1.81-1.1 1.21-2.14l-8.1-14c-.6-1.04-1.82-1.04-2.42 0z" />
        </svg>
      ),
      gradient: "from-red-900 to-red-700",
      shadow: "shadow-red-900/20",
      textColor: "text-red-900",
      bgLight: "bg-red-50",
    },
    {
      label: "High Risk",
      value: high,
      sub: `${((high / total) * 100).toFixed(0)}% of barangays · Requires mitigation`,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      gradient: "from-red-600 to-red-500",
      shadow: "shadow-red-600/20",
      textColor: "text-red-700",
      bgLight: "bg-red-50",
    },
    {
      label: "Moderate + Low Risk",
      value: moderate + low,
      sub: `${(moderate + low)} barangays · ${((totalHazardArea / 100).toFixed(0))} km² hazard zone`,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      gradient: "from-amber-500 to-orange-400",
      shadow: "shadow-amber-500/20",
      textColor: "text-amber-700",
      bgLight: "bg-amber-50",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map(({ label, value, sub, icon, gradient, shadow, textColor, bgLight }) => (
        <div key={label} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4">
            <div className="flex items-start justify-between mb-3">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider leading-tight max-w-[140px]">
                {label}
              </span>
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${gradient} ${shadow} flex items-center justify-center shrink-0`}>
                {icon}
              </div>
            </div>
            <p className="text-3xl font-extrabold text-gray-900 tracking-tight">{value}</p>
            <p className="text-[11px] text-gray-500 mt-1.5 leading-tight">{sub}</p>
          </div>
          <div className={`h-1 w-full bg-gradient-to-r ${gradient}`} />
        </div>
      ))}
    </div>
  );
}

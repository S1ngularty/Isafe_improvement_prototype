const SIGNAL_COLORS = {
  1: "bg-yellow-500",
  2: "bg-orange-400",
  3: "bg-orange-600",
  4: "bg-red-600",
  5: "bg-red-900",
};

const SIGNAL_LABELS = {
  1: "TCWS #1",
  2: "TCWS #2",
  3: "TCWS #3",
  4: "TCWS #4",
  5: "TCWS #5",
};

export default function TcwsBanner({ alerts, onDismiss }) {
  if (!alerts || alerts.length === 0) return null;

  const highest = alerts[0];

  return (
    <div className={`${SIGNAL_COLORS[highest.signal_level] || "bg-yellow-500"} text-white rounded-xl shadow-lg px-5 py-4 flex-shrink-0 animate-pulse`}>
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center shrink-0">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg font-extrabold uppercase tracking-wide">
              {SIGNAL_LABELS[highest.signal_level] || "TCWS"}
            </span>
            {alerts.length > 1 && (
              <span className="text-xs bg-white/20 rounded-full px-2 py-0.5 font-medium">
                +{alerts.length - 1} more areas
              </span>
            )}
          </div>
          <p className="text-sm font-semibold opacity-90">Quezon, Tagkawayan &mdash; {highest.wind_speed}</p>
          {highest.description && (
            <p className="text-xs opacity-75 mt-1">{highest.description}</p>
          )}
        </div>
        <button
          onClick={onDismiss}
          className="shrink-0 w-7 h-7 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

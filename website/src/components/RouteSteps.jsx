import { useState } from "react";

const ARROW_SIZE = 20;

function StraightSvg({ color = "#333" }) {
  return (
    <svg width={ARROW_SIZE} height={ARROW_SIZE} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="2">
      <path d="M10 17 v-13 m2.5 2 l-2.5 -2.5 -2.5 2.5" />
    </svg>
  );
}

function RightSvg({ color = "#333" }) {
  return (
    <svg width={ARROW_SIZE} height={ARROW_SIZE} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="2">
      <path d="M7 17 v-5 q0 -3 3 -3 h4 m-2 2.5 l2.5 -2.5 -2.5 -2.5" />
    </svg>
  );
}

function LeftSvg({ color = "#333" }) {
  return (
    <svg width={ARROW_SIZE} height={ARROW_SIZE} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="2" style={{ transform: "scaleX(-1)" }}>
      <path d="M7 17 v-5 q0 -3 3 -3 h4 m-2 2.5 l2.5 -2.5 -2.5 -2.5" />
    </svg>
  );
}

function SlightRightSvg({ color = "#333" }) {
  return (
    <svg width={ARROW_SIZE} height={ARROW_SIZE} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="2">
      <path d="M7 17 v-3 q0 -2 2 -4 l5 -5 m0 0 h-3 l3 3" />
    </svg>
  );
}

function SlightLeftSvg({ color = "#333" }) {
  return (
    <svg width={ARROW_SIZE} height={ARROW_SIZE} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="2" style={{ transform: "scaleX(-1)" }}>
      <path d="M7 17 v-3 q0 -2 2 -4 l5 -5 m0 0 h-3 l3 3" />
    </svg>
  );
}

function SharpRightSvg({ color = "#333" }) {
  return (
    <svg width={ARROW_SIZE} height={ARROW_SIZE} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="2">
      <path d="M7 17 v-7 q0 -6 6 0 l2 2 m0 0 v-3 l-3 3" />
    </svg>
  );
}

function SharpLeftSvg({ color = "#333" }) {
  return (
    <svg width={ARROW_SIZE} height={ARROW_SIZE} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="2" style={{ transform: "scaleX(-1)" }}>
      <path d="M7 17 v-7 q0 -6 6 0 l2 2 m0 0 v-3 l-3 3" />
    </svg>
  );
}

function UturnSvg({ color = "#333", flip = false }) {
  return (
    <svg width={ARROW_SIZE} height={ARROW_SIZE} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="2" style={flip ? { transform: "scaleX(-1)" } : undefined}>
      <path d="M4 17 v-7 a4.5 4.5 0 0 1 9 0 v5 m2.5 -2 l-2.5 2.5 -2.5 -2.5" />
    </svg>
  );
}

function RoundaboutSvg({ color = "#333" }) {
  return (
    <svg width={ARROW_SIZE} height={ARROW_SIZE} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="2">
      <path d="M8 17 v-3 a 3 3 0 1 0 0 -6 3 3 0 1 0 0 6 m2 -4 l5 -5 m0 0 h-3 l3 3" />
    </svg>
  );
}

function ForkRightSvg({ color = "#333" }) {
  return (
    <svg width={ARROW_SIZE} height={ARROW_SIZE} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="2">
      <path d="M9 14 q0 -2 -2 -4 l-3 -3" opacity=".5" /><path d="M9 17 v-3 q0 -2 2 -4 l5 -5 m0 0 h-3 l3 3" />
    </svg>
  );
}

function ArriveSvg({ color = "#333" }) {
  return (
    <svg width={ARROW_SIZE} height={ARROW_SIZE} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="2">
      <circle cx="10" cy="10" r="3" fill={color} fillOpacity="0.15" /><rect x="8.5" y="11" width="3" height="8" rx="1" fill={color} fillOpacity="0.15" stroke={color} />
    </svg>
  );
}

function DepartSvg({ color = "#333" }) {
  return (
    <svg width={ARROW_SIZE} height={ARROW_SIZE} viewBox="0 0 20 20" fill="none" stroke={color} strokeWidth="2">
      <circle cx="10" cy="10" r="4" fill={color} fillOpacity="0.3" />
    </svg>
  );
}

const MANEUVER_SVG = {
  turn: { left: LeftSvg, right: RightSvg, "slight left": SlightLeftSvg, "slight right": SlightRightSvg, "sharp left": SharpLeftSvg, "sharp right": SharpRightSvg, straight: StraightSvg, uturn: UturnSvg },
  continue: { left: LeftSvg, right: RightSvg, straight: StraightSvg, default: StraightSvg },
  "new name": { default: StraightSvg },
  merge: { default: RightSvg },
  roundabout: { default: RoundaboutSvg },
  fork: { left: ForkRightSvg, right: ForkRightSvg, straight: StraightSvg, default: RightSvg },
  depart: { default: DepartSvg },
  arrive: { default: ArriveSvg },
};

function maneuverSvg(type, modifier, color) {
  const group = MANEUVER_SVG[type];
  if (!group) return <StraightSvg color={color} />;
  const Comp = group[modifier] || group.default;
  if (!Comp) return <StraightSvg color={color} />;
  return <Comp color={color} />;
}

function formatDistance(meters) {
  if (meters < 1000) return `${meters}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

function stripHtml(str) { return str.replace(/<[^>]*>/g, ""); }

export default function RouteSteps({ route, onClear, onOpenOSM }) {
  const [expanded, setExpanded] = useState(true);
  if (!route) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 flex items-center justify-between bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-2.5 cursor-pointer select-none" onClick={() => setExpanded((v) => !v)}>
          <svg className={`w-4 h-4 text-gray-400 transition-transform shrink-0 ${expanded ? "rotate-90" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
          </svg>
          <div>
            <span className="font-semibold text-gray-900">{route.distance_km} km</span>
            <span className="text-gray-400 mx-1.5">&middot;</span>
            <span className="text-sm text-gray-600">~{route.duration_min} min</span>
          </div>
        </div>
        <button onClick={onClear} className="text-gray-400 hover:text-gray-600 p-1 rounded transition-colors" title="Clear">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div role="button" tabIndex={0} onClick={() => setExpanded((v) => !v)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setExpanded((v) => !v); } }} className="px-4 py-2.5 border-b border-gray-100 bg-white flex items-center gap-3 cursor-pointer hover:bg-gray-50 transition-colors">
        <div className="w-5 shrink-0 flex justify-center">
          <DepartSvg color="#16a34a" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-500 font-medium">{stripHtml(route.steps?.[0]?.instruction || "Continue")}</p>
        </div>
        <span className="text-xs text-gray-500 font-medium">{route.steps?.[0] ? formatDistance(route.steps[0].distance_m) : ""}</span>
        <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform shrink-0 ${expanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {expanded && (route.steps?.length || 0) > 0 && (
        <div className="border-t border-gray-100">
          {route.steps.map((step, i) => {
            const isDeparture = i === 0;
            const isArrival = i === route.steps.length - 1;
            const iconColor = isDeparture ? "#16a34a" : isArrival ? "#6b7280" : "#374151";

            return (
              <div key={i} className={`flex items-center gap-3 px-4 py-2.5 border-b border-gray-50 hover:bg-gray-50 transition-colors ${isDeparture ? "bg-green-50/40" : ""}`}>
                <div className="w-5 shrink-0 flex justify-center">
                  {maneuverSvg(step.maneuver_type, step.maneuver_modifier, iconColor)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 leading-snug">{stripHtml(step.instruction)}</p>
                  {step.name && (
                    <p className="text-xs text-gray-500 truncate mt-0.5">{step.name}</p>
                  )}
                </div>
                <span className={`text-xs font-medium shrink-0 ${isArrival ? "text-gray-400" : "text-gray-600"}`}>{formatDistance(step.distance_m)}</span>
              </div>
            );
          })}
        </div>
      )}

      {onOpenOSM && (
        <div className="px-4 py-2.5 border-t border-gray-100">
          <a
            href="#"
            onClick={(e) => { e.preventDefault(); onOpenOSM(); }}
            className="text-xs text-gray-500 hover:text-green-600 transition-colors flex items-center gap-1"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Open in OpenStreetMap
          </a>
        </div>
      )}
    </div>
  );
}

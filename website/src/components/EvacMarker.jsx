import { useMemo } from "react";
import { Marker, Popup } from "react-leaflet";
import L from "leaflet";

const EVAC_COLOR = "#4f46e5";

const ICON = L.divIcon({
  className: "",
  html: `
    <div style="width:32px;height:44px;display:flex;flex-direction:column;align-items:center">
      <div style="width:28px;height:28px;border-radius:6px;background:${EVAC_COLOR};display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(79,70,229,0.5);border:2px solid #fff">
        <svg width="16" height="16" fill="none" stroke="#fff" stroke-width="2.5" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3 21h18M3 7v1h18V7M3 7l1-4h16l1 4M5 11v8m4-8v8m4-8v8m4-8v8"/>
        </svg>
      </div>
      <div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:8px solid ${EVAC_COLOR};margin-top:-1px"></div>
    </div>`,
  iconSize: [32, 44],
  iconAnchor: [16, 44],
  popupAnchor: [0, -44],
});

export default function EvacMarker({ lat, lng, name, description, capacity, onClick }) {
  const eventHandlers = useMemo(() => (onClick ? { click: onClick } : undefined), [onClick]);

  return (
    <Marker position={[lat, lng]} icon={ICON} eventHandlers={eventHandlers}>
      <Popup>
        <div className="text-sm min-w-[140px]">
          <p className="font-semibold text-gray-900">{name || "Evacuation Center"}</p>
          {description && (
            <p className="text-gray-500 text-xs mt-0.5">{description}</p>
          )}
          {capacity != null && (
            <p className="text-gray-400 text-[11px] mt-1">
              Capacity: {capacity.toLocaleString()} persons
            </p>
          )}
          <p className="text-gray-400 text-[11px]">{lat.toFixed(5)}, {lng.toFixed(5)}</p>
          {onClick && (
            <p className="text-indigo-600 text-[11px] font-medium mt-1">Click for directions</p>
          )}
        </div>
      </Popup>
    </Marker>
  );
}

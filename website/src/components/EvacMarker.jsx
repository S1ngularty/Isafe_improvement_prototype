import { useMemo } from "react";
import { Marker, Popup } from "react-leaflet";
import L from "leaflet";

const EVAC_COLOR = "#4f46e5";

function buildIcon(landmarkUrl) {
  const size = 36;
  const inner = 32;

  if (landmarkUrl) {
    return L.divIcon({
      className: "",
      html: `
        <div style="width:${size}px;height:${size + 8}px;display:flex;flex-direction:column;align-items:center">
          <div style="width:${inner}px;height:${inner}px;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(79,70,229,0.5);border:2.5px solid #fff;background:#f3f4f6;display:flex;align-items:center;justify-content:center">
            <img src="${landmarkUrl}" style="width:100%;height:100%;object-fit:cover" onerror="this.style.display='none'"/>
          </div>
          <div style="width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:9px solid ${EVAC_COLOR};margin-top:-2px"></div>
        </div>`,
      iconSize: [size, size + 8],
      iconAnchor: [size / 2, size + 8],
      popupAnchor: [0, -(size + 8)],
    });
  }

  return L.divIcon({
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
}

export default function EvacMarker({ lat, lng, name, description, capacity, landmark_url, onClick }) {
  const icon = useMemo(() => buildIcon(landmark_url), [landmark_url]);
  const eventHandlers = useMemo(() => (onClick ? { click: onClick } : undefined), [onClick]);

  return (
    <Marker position={[lat, lng]} icon={icon} eventHandlers={eventHandlers}>
      <Popup>
        <div className="text-sm min-w-[160px] max-w-[220px]">
          {landmark_url && (
            <img
              src={landmark_url}
              alt={name || "Evacuation center"}
              className="w-full h-28 object-cover rounded-lg mb-2 bg-gray-100"
              onError={(e) => { e.target.style.display = "none"; }}
            />
          )}
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

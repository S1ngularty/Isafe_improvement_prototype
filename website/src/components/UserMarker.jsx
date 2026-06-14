import { useMemo } from "react";
import { Marker, Popup, Circle } from "react-leaflet";
import L from "leaflet";

const COLORS = {
  safe: "#22c55e",
  help: "#eab308",
  emergency: "#ef4444",
};

export default function UserMarker({ lat, lng, status, accuracy }) {
  const color = COLORS[status] || COLORS.safe;

  const icon = useMemo(
    () =>
      L.divIcon({
        className: "",
        html: `
          <div style="position:relative;width:32px;height:42px;transform:translate(-16px,-42px)">
            <svg width="32" height="42" viewBox="0 0 32 42" fill="none">
              <path d="M16 0C7.164 0 0 7.164 0 16c0 10.5 16 26 16 26s16-15.5 16-26C32 7.164 24.836 0 16 0z" fill="${color}" stroke="#fff" stroke-width="2"/>
              <circle cx="16" cy="16" r="5" fill="#fff"/>
            </svg>
            <div style="position:absolute;bottom:-2px;left:50%;transform:translateX(-50%);width:8px;height:8px;background:${color};border-radius:50%;box-shadow:0 0 8px ${color}"></div>
          </div>`,
        iconSize: [32, 42],
        iconAnchor: [16, 42],
        popupAnchor: [0, -44],
      }),
    [color]
  );

  return (
    <>
      {accuracy && (
        <Circle
          center={[lat, lng]}
          radius={accuracy}
          pathOptions={{
            color,
            fillColor: color,
            fillOpacity: 0.12,
            weight: 1,
            dashArray: "4 2",
          }}
        />
      )}
      <Marker position={[lat, lng]} icon={icon}>
        <Popup>
          <div className="text-sm">
            <p className="font-semibold">You</p>
            <p className="text-gray-500 text-xs capitalize">Status: {status}</p>
            <p className="text-gray-400 text-[11px]">
              {lat.toFixed(5)}, {lng.toFixed(5)}
            </p>
            {accuracy && (
              <p className="text-gray-400 text-[11px]">Accuracy: ~{Math.round(accuracy)}m</p>
            )}
          </div>
        </Popup>
      </Marker>
    </>
  );
}

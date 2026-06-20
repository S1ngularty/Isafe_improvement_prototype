import { useMemo } from "react";
import { Marker, Popup, Circle } from "react-leaflet";
import L from "leaflet";

const COLORS = {
  safe: "#22c55e",
  help: "#eab308",
  emergency: "#ef4444",
};

export default function UserMarker({ lat, lng, status, accuracy, name, isSelf }) {
  const color = COLORS[status] || COLORS.safe;
  const size = isSelf ? 32 : 26;
  const svgSize = isSelf ? 32 : 26;
  const svgHeight = isSelf ? 42 : 34;

  const icon = useMemo(
    () =>
      L.divIcon({
        className: "",
        html: `
          <div style="position:relative;width:${svgSize}px;height:${svgHeight}px;transform:translate(-${svgSize / 2}px,-${svgHeight}px)">
            <svg width="${svgSize}" height="${svgHeight}" viewBox="0 0 ${svgSize} ${svgHeight}" fill="none">
              <path d="M${svgSize / 2} 0C${svgSize / 2 - 8} 0 0 ${svgSize / 2 - 8} 0 ${svgSize / 2}c0 10.5 ${svgSize / 2} 26 ${svgSize / 2} 26s${svgSize / 2}-15.5 ${svgSize / 2}-26C${svgSize} ${svgSize / 2 - 8} ${svgSize / 2 + 8} 0 ${svgSize / 2} 0z" fill="${color}" stroke="${isSelf ? "#fff" : color}" stroke-width="${isSelf ? 2 : 1}"/>
              <circle cx="${svgSize / 2}" cy="${svgSize / 2}" r="${isSelf ? 5 : 4}" fill="#fff"/>
            </svg>
            <div style="position:absolute;bottom:-2px;left:50%;transform:translateX(-50%);width:8px;height:8px;background:${color};border-radius:50%;box-shadow:0 0 8px ${color}"></div>
          </div>`,
        iconSize: [svgSize, svgHeight],
        iconAnchor: [svgSize / 2, svgHeight],
        popupAnchor: [0, -svgHeight - 2],
      }),
    [color, isSelf]
  );

  return (
    <>
      {isSelf && accuracy && (
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
            <p className="font-semibold">{isSelf ? "You" : name || "Member"}</p>
            <p className="text-gray-500 text-xs capitalize">Status: {status}</p>
            <p className="text-gray-400 text-[11px]">
              {lat.toFixed(5)}, {lng.toFixed(5)}
            </p>
            {isSelf && accuracy && (
              <p className="text-gray-400 text-[11px]">Accuracy: ~{Math.round(accuracy)}m</p>
            )}
          </div>
        </Popup>
      </Marker>
    </>
  );
}

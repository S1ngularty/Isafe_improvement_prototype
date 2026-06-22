import { useMemo } from "react";
import { Marker, Popup, Circle } from "react-leaflet";
import L from "leaflet";

const COLORS = { safe: "#22c55e", help: "#eab308", emergency: "#ef4444" };

export default function UserMarker({ lat, lng, status, accuracy, name, isSelf, avatarUrl, onClick, distanceInfo }) {
  const color = COLORS[status] || COLORS.safe;
  const size = isSelf ? 36 : 30;
  const ringWidth = isSelf ? 3 : 2;
  const initial = (name || "?")[0].toUpperCase();

  const icon = useMemo(() => {
    const hasAvatar = avatarUrl && avatarUrl.length > 0;
    const innerSize = size - ringWidth * 2;
    const avatarHtml = hasAvatar
      ? `<img src="${avatarUrl}" style="width:${innerSize}px;height:${innerSize}px;border-radius:50%;object-fit:cover;display:block;" onerror="this.parentElement.innerHTML='<div style=\\'width:${innerSize}px;height:${innerSize}px;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center\\'><span style=\\'color:#fff;font-weight:700;font-size:${isSelf ? 14 : 11}px\\'>${initial}</span></div>'"/>`
      : `<div style="width:${innerSize}px;height:${innerSize}px;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center"><span style="color:#fff;font-weight:700;font-size:${isSelf ? 14 : 11}px;font-family:sans-serif">${initial}</span></div>`;

    return L.divIcon({
      className: "",
      html: `
        <div style="width:${size + 8}px;height:${size + 20}px;display:flex;flex-direction:column;align-items:center;justify-content:flex-end">
          <div style="width:${size}px;height:${size}px;border-radius:50%;border:${ringWidth}px solid ${color};box-shadow:0 0 0 ${isSelf ? 3 : 1}px ${color}${isSelf ? "66" : "33"};display:flex;align-items:center;justify-content:center;background:#fff;overflow:hidden;flex-shrink:0">${avatarHtml}</div>
          <div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:8px solid ${color};flex-shrink:0;margin-top:-1px"></div>
        </div>`,
      iconSize: [size + 8, size + 20],
      iconAnchor: [(size + 8) / 2, size + 20],
      popupAnchor: [0, -(size + 22)],
    });
  }, [color, size, ringWidth, avatarUrl, initial, isSelf]);

  const eventHandlers = useMemo(() => (onClick ? { click: onClick } : undefined), [onClick]);

  return (
    <>
      {isSelf && accuracy && (
        <Circle center={[lat, lng]} radius={accuracy} pathOptions={{ color, fillColor: color, fillOpacity: 0.12, weight: 1, dashArray: "4 2" }} />
      )}
      <Marker position={[lat, lng]} icon={icon} eventHandlers={eventHandlers}>
        <Popup>
          <div className="text-sm">
            <p className="font-semibold">{isSelf ? "You" : name || "Member"}</p>
            <p className="text-gray-500 text-xs capitalize">Status: {status}</p>
            {distanceInfo && !isSelf && <p className="text-shield-700 text-xs font-medium mt-0.5">{distanceInfo}</p>}
            <p className="text-gray-400 text-[11px]">{lat.toFixed(5)}, {lng.toFixed(5)}</p>
            {isSelf && accuracy && <p className="text-gray-400 text-[11px]">Accuracy: ~{Math.round(accuracy)}m</p>}
          </div>
        </Popup>
      </Marker>
    </>
  );
}

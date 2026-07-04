import { useEffect, useRef, useState, useCallback } from "react";
import { MapContainer, TileLayer, GeoJSON, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "../../services/leaflet-setup.js";

const PH_CENTER = [13.99, 122.52];
const SATELLITE_URL = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

const RISK_COLORS = {
  "Very High": "#67000d",
  "High": "#a50f15",
  "Moderate": "#ef3b2d",
  "Low": "#fc9272",
  "None": "#fee0d2",
};

function MapBounds({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (!bounds || !bounds.isValid()) return;
    map.fitBounds(bounds, { padding: [10, 10] });
    map.setMaxBounds(bounds.pad(0.1));
    map.options.maxBoundsViscosity = 1.0;
  }, [map, bounds]);
  return null;
}

function FlyTo({ target }) {
  const map = useMap();
  useEffect(() => {
    if (!target) return;
    map.flyTo(target, 14, { duration: 0.8 });
  }, [map, target]);
  return null;
}

const LEGEND_ITEMS = [
  { color: "#67000d", label: "Very High" },
  { color: "#a50f15", label: "High" },
  { color: "#ef3b2d", label: "Moderate" },
  { color: "#fc9272", label: "Low" },
  { color: "#fee0d2", label: "None" },
];

function MapLegend() {
  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 px-3 py-2 text-[11px]">
      <p className="font-bold text-gray-700 mb-1.5 text-[10px] uppercase tracking-wider">Risk Level</p>
      <div className="space-y-1">
        {LEGEND_ITEMS.map(({ color, label }) => (
          <div key={label} className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: color }} />
            <span className="text-gray-600 font-medium">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function FloodHazardMap({ geojson, summary, onSelectBarangay, selectedBarangay, opacity, basemap }) {
  const [bounds, setBounds] = useState(null);
  const [flyTarget, setFlyTarget] = useState(null);
  const geoRef = useRef(null);

  const barangayStyle = useCallback(
    (feature) => {
      const name = feature?.properties?.barangay || feature?.properties?.NAME_3 || "";
      const s = summary?.find((r) => r.barangay === name);
      const color = s ? (RISK_COLORS[s.risk_level] || "#fee0d2") : "#fee0d2";
      const isSelected = selectedBarangay === name;
      return {
        fillColor: color,
        fillOpacity: opacity / 100,
        weight: isSelected ? 3 : 0.8,
        color: isSelected ? "#fff" : "#555",
        dashArray: isSelected ? "" : "1 1",
      };
    },
    [summary, selectedBarangay, opacity]
  );

  useEffect(() => {
    const layer = geoRef?.current;
    if (layer && geojson?.features?.length > 0) {
      try {
        const b = L.geoJSON(geojson).getBounds();
        if (b.isValid()) setBounds(b);
      } catch {}
    }
  }, [geojson]);

  useEffect(() => {
    if (!selectedBarangay || !geojson?.features) { setFlyTarget(null); return; }
    const feature = geojson.features.find(
      (f) => (f.properties?.barangay || f.properties?.NAME_3) === selectedBarangay
    );
    if (feature) {
      const layer = L.geoJSON(feature);
      const center = layer.getBounds().getCenter();
      setFlyTarget([center.lat, center.lng]);
    }
  }, [selectedBarangay, geojson]);

  function handleEachFeature(feature, leafletLayer) {
    const name = feature.properties?.barangay || feature.properties?.NAME_3 || "";
    const s = summary?.find((r) => r.barangay === name);

    leafletLayer.bindTooltip(
      `<div style="font-size:12px;line-height:1.4">
        <b style="font-size:13px">${name}</b><br/>
        Risk: <b>${s?.risk_level || "None"}</b><br/>
        Hazard: <b>${s?.pct_total_hazard?.toFixed(1) || "0.0"}%</b>
      </div>`,
      { sticky: true, direction: "top", offset: [0, -5] }
    );

    leafletLayer.on({
      click: () => {
        if (onSelectBarangay) onSelectBarangay(name);
      },
    });
  }

  const tileUrl = basemap === "satellite" ? SATELLITE_URL
    : basemap === "dark"
      ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

  const tileAttr = basemap === "satellite"
    ? "Esri, Maxar, Earthstar Geographics"
    : basemap === "dark"
      ? '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
      : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

  return (
    <div className="h-full w-full rounded-xl overflow-hidden border border-gray-200 shadow-sm relative">
      <MapContainer center={PH_CENTER} zoom={11} className="h-full w-full" scrollWheelZoom={true}>
        <TileLayer url={tileUrl} attribution={tileAttr} />
        <MapBounds bounds={bounds} />
        <FlyTo target={flyTarget} />
        {geojson?.features && (
          <GeoJSON
            ref={geoRef}
            data={geojson}
            style={barangayStyle}
            onEachFeature={handleEachFeature}
          />
        )}
      </MapContainer>

      <div className="absolute bottom-3 left-3 z-[1000]">
        <MapLegend />
      </div>

      {basemap === "dark" && (
        <div className="absolute top-3 right-3 z-[1000] bg-black/60 backdrop-blur-sm rounded-lg px-2.5 py-1 text-[10px] text-white/60">
          <a href="https://carto.com/" target="_blank" rel="noopener noreferrer" className="hover:text-white/90 transition-colors">CARTO</a>
        </div>
      )}
    </div>
  );
}

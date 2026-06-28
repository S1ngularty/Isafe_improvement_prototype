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

export default function FloodHazardMap({ geojson, summary, onSelectBarangay, selectedBarangay, opacity, basemap }) {
  const [bounds, setBounds] = useState(null);
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
        weight: isSelected ? 2.5 : 0.8,
        color: isSelected ? "#000" : "#555",
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

  function handleEachFeature(feature, leafletLayer) {
    leafletLayer.on({
      click: () => {
        const name = feature.properties?.barangay || feature.properties?.NAME_3 || "";
        if (onSelectBarangay) onSelectBarangay(name);
      },
    });
  }

  const tileUrl = basemap === "satellite" ? SATELLITE_URL : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
  const tileAttr = basemap === "satellite"
    ? "Esri, Maxar, Earthstar Geographics"
    : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

  return (
    <div className="h-full w-full rounded-xl overflow-hidden border border-gray-200 shadow-sm">
      <MapContainer center={PH_CENTER} zoom={11} className="h-full w-full" scrollWheelZoom={true}>
        <TileLayer url={tileUrl} attribution={tileAttr} />
        <MapBounds bounds={bounds} />

        {(geojson?.features) && (
          <GeoJSON
            ref={geoRef}
            data={geojson}
            style={barangayStyle}
            onEachFeature={handleEachFeature}
          />
        )}
      </MapContainer>
    </div>
  );
}

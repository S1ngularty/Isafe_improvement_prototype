import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "../services/leaflet-setup.js";

function MapController({ center, zoom, bounds, onMapClick, resetKey }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) {
      map.setMaxBounds(bounds);
      map.setMinZoom(5);
      map.options.maxBoundsViscosity = 1.0;
    }
  }, [map, bounds]);
  useEffect(() => {
    if (center) {
      map.setView(center, map.getZoom(), { animate: true });
    }
  }, [center, map]);
  useEffect(() => {
    if (zoom) map.setZoom(zoom);
  }, [zoom, map]);
  useEffect(() => {
    if (center && resetKey > 0) {
      map.setView(center, 16, { animate: true });
    }
  }, [resetKey]);
  useEffect(() => {
    if (!onMapClick) return;
    const handler = (e) => onMapClick(e.latlng);
    map.on("click", handler);
    return () => map.off("click", handler);
  }, [map, onMapClick]);
  return null;
}

export default function MapView({ center, zoom, children, className, onMapClick, resetKey }) {
  const phBounds = useMemo(() => L.latLngBounds([4.5, 116.0], [21.5, 127.5]), []);

  return (
    <MapContainer
      center={center || [12.8, 121.7]}
      zoom={zoom || 6}
      className={className || "h-full w-full rounded-xl"}
      scrollWheelZoom={true}
      zoomControl={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapController center={center} zoom={zoom} bounds={phBounds} onMapClick={onMapClick} resetKey={resetKey} />
      {children}
    </MapContainer>
  );
}

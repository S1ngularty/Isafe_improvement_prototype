import { useState, useEffect, useCallback } from "react";
import { Marker, Popup } from "react-leaflet";
import L from "leaflet";
import MapView from "./MapView";
import { fetchEvacuationAreas } from "../services/evac";

const CENTER_ICON = L.divIcon({
  className: "",
  html: `
    <div style="width:36px;height:50px;display:flex;flex-direction:column;align-items:center">
      <div style="width:32px;height:32px;border-radius:8px;background:#4f46e5;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 8px rgba(79,70,229,0.6);border:3px solid #fff">
        <svg width="18" height="18" fill="none" stroke="#fff" stroke-width="2.5" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3 21h18M3 7v1h18V7M3 7l1-4h16l1 4M5 11v8m4-8v8m4-8v8m4-8v8"/>
        </svg>
      </div>
      <div style="width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:9px solid #4f46e5;margin-top:-1px"></div>
    </div>`,
  iconSize: [36, 50],
  iconAnchor: [18, 50],
  popupAnchor: [0, -50],
});

function fmtCapacity(num) {
  if (num == null) return "—";
  return Number(num).toLocaleString();
}

export default function EvacuationCentersView({ onGetDirections }) {
  const [centers, setCenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const data = await fetchEvacuationAreas();
        if (!cancelled) setCenters(data);
      } catch {
        if (!cancelled) setCenters([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const handleSelect = useCallback((center) => {
    setSelected(center);
  }, []);

  const handleBack = useCallback(() => {
    setSelected(null);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-10 h-10 border-4 border-shield-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (centers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center">
        <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 21h18M3 7v1h18V7M3 7l1-4h16l1 4M5 11v8m4-8v8m4-8v8m4-8v8" />
        </svg>
        <p className="text-gray-500 font-medium">No evacuation centers found</p>
        <p className="text-sm text-gray-400 mt-1">Check back later for updates.</p>
      </div>
    );
  }

  if (selected) {
    return (
      <div className="h-full flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            title="Back to list"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 12H5m7-7l-7 7 7 7" />
            </svg>
          </button>
          <h2 className="text-xl font-bold text-gray-900 truncate">{selected.name}</h2>
        </div>

        <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0">
          <div className="lg:w-[55%] h-[300px] lg:h-auto rounded-xl overflow-hidden shadow-lg border border-gray-200">
            <MapView
              center={[selected.latitude, selected.longitude]}
              zoom={17}
              className="h-full w-full"
            >
              <Marker position={[selected.latitude, selected.longitude]} icon={CENTER_ICON}>
                <Popup>
                  <div className="text-sm min-w-[140px]">
                    <p className="font-semibold text-gray-900">{selected.name}</p>
                    <p className="text-gray-400 text-[11px]">{selected.latitude.toFixed(5)}, {selected.longitude.toFixed(5)}</p>
                  </div>
                </Popup>
              </Marker>
            </MapView>
          </div>

          <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-y-auto">
            <div className="p-5 space-y-4">
              {selected.landmark_url && (
                <img
                  src={selected.landmark_url}
                  alt={selected.name}
                  className="w-full h-52 object-cover rounded-xl bg-gray-100"
                  onError={(e) => { e.target.style.display = "none"; }}
                />
              )}

              <div>
                <h3 className="text-lg font-bold text-gray-900">{selected.name}</h3>
                {selected.description && (
                  <p className="text-sm text-gray-600 mt-1">{selected.description}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg px-4 py-3">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Capacity</p>
                  <p className="text-xl font-extrabold text-gray-900 mt-0.5">{fmtCapacity(selected.capacity)}</p>
                  <p className="text-xs text-gray-400">persons</p>
                </div>
                <div className="bg-gray-50 rounded-lg px-4 py-3">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Status</p>
                  <span className={`inline-block mt-1.5 px-3 py-1 text-xs font-semibold rounded-full ${
                    selected.status === "active" ? "bg-green-100 text-green-700" :
                    selected.status === "inactive" ? "bg-gray-100 text-gray-500" :
                    "bg-yellow-100 text-yellow-700"
                  }`}>
                    {selected.status}
                  </span>
                </div>
              </div>

              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Coordinates</p>
                <p className="text-sm text-gray-700 font-mono">
                  {selected.latitude.toFixed(5)}, {selected.longitude.toFixed(5)}
                </p>
              </div>

              {onGetDirections && (
                <button
                  onClick={() => onGetDirections(selected)}
                  className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                  Get Directions
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Evacuation Centers</h1>
        <p className="text-sm text-gray-500 mt-1">
          {centers.length} {centers.length === 1 ? "center" : "centers"} available
        </p>
      </div>

      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {centers.map((center) => (
          <button
            key={center.id}
            onClick={() => handleSelect(center)}
            className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden text-left hover:shadow-md hover:border-shield-300 transition-all group"
          >
            <div className="h-40 bg-gray-100 relative overflow-hidden">
              {center.landmark_url ? (
                <img
                  src={center.landmark_url}
                  alt={center.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => { e.target.style.display = "none"; }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300">
                  <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
              <div className="absolute top-2 right-2">
                <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full shadow-sm ${
                  center.status === "active" ? "bg-green-500 text-white" :
                  center.status === "inactive" ? "bg-gray-400 text-white" :
                  "bg-yellow-500 text-white"
                }`}>
                  {center.status}
                </span>
              </div>
            </div>
            <div className="p-4">
              <h3 className="font-bold text-gray-900 truncate">{center.name}</h3>
              {center.description && (
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{center.description}</p>
              )}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                <div className="flex items-center gap-1.5 text-sm text-gray-600">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="font-medium">{fmtCapacity(center.capacity)}</span>
                </div>
                <span className="text-xs text-indigo-600 font-semibold group-hover:underline">
                  View Details &rarr;
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

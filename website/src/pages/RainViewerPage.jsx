import { useState, useEffect, useRef, useCallback } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { fetchRadarFrames } from "../services/rainviewer";

const PH_CENTER = [12.8, 121.7];
const RADAR_MAX_ZOOM = 10;

const BASEMAPS = {
  satellite: {
    url: "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attr: "Esri, Maxar, Earthstar Geographics",
  },
  osm: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attr: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },
  dark: {
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attr: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
  },
};

function MapController({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [map, center, zoom]);
  return null;
}

export default function RainViewerPage() {
  const [frames, setFrames] = useState([]);
  const [host, setHost] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [opacity, setOpacity] = useState(60);
  const [basemap, setBasemap] = useState("dark");
  const layerRef = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const data = await fetchRadarFrames();
        if (cancelled || !data) return;
        setHost(data.host);
        setFrames(data.frames || []);
        setError(null);
      } catch {
        if (!cancelled) setError("Failed to load radar data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!playing || frames.length === 0) return;
    const id = setInterval(() => {
      setCurrentFrame((prev) => (prev + 1) % frames.length);
    }, 600);
    return () => clearInterval(id);
  }, [playing, frames.length]);

  const updateLayer = useCallback(() => {
    if (!layerRef.current || frames.length === 0 || currentFrame >= frames.length) return;
    const frame = frames[currentFrame];
    layerRef.current.setUrl(frame.tile_url);
    layerRef.current.setOpacity(opacity / 100);
  }, [frames, currentFrame, opacity]);

  useEffect(() => {
    updateLayer();
  }, [updateLayer]);

  function handleMapReady(map) {
    mapRef.current = map;
    const layer = L.tileLayer("", {
      opacity: opacity / 100,
      maxZoom: RADAR_MAX_ZOOM,
      maxNativeZoom: RADAR_MAX_ZOOM,
      zIndex: 10,
    });
    layer.addTo(map);
    layerRef.current = layer;
    if (frames.length > 0) layer.setUrl(frames[0].tile_url);
  }

  const pastCount = frames.filter((f) => f.time <= Date.now() / 1000).length;
  const bm = BASEMAPS[basemap] || BASEMAPS.dark;
  const currentFrameTime = frames.length > 0 && frames[currentFrame]
    ? new Date(frames[currentFrame].time * 1000)
    : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">RainViewer</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Live rain radar animation &mdash; {frames.length} frames
            {host && <span className="hidden sm:inline"> &middot; {host}</span>}
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      {loading ? (
        <div className="rounded-xl overflow-hidden border border-gray-200">
          <div className="h-[65vh] min-h-[450px] bg-gray-100 animate-pulse flex items-center justify-center">
            <div className="text-center space-y-3">
              <div className="w-10 h-10 border-4 border-shield-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm text-gray-400">Loading radar data...</p>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="rounded-xl overflow-hidden shadow-lg border border-gray-200 relative bg-gray-900">
            <MapContainer
              center={PH_CENTER}
              zoom={6}
              maxZoom={RADAR_MAX_ZOOM}
              className="h-[65vh] min-h-[450px] w-full"
              whenReady={(e) => handleMapReady(e.target)}
              scrollWheelZoom={true}
              zoomControl={false}
            >
              <MapController center={PH_CENTER} zoom={6} />
              <TileLayer url={bm.url} attribution={bm.attr} />
            </MapContainer>

            <div className="absolute top-4 left-4 z-[1000] space-y-2">
              <div className="bg-gray-900/80 backdrop-blur rounded-lg px-3 py-1.5 text-white text-xs font-medium">
                {currentFrameTime
                  ? currentFrameTime.toLocaleString("en-PH", {
                      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                    })
                  : "--:--"}
              </div>
              <select
                value={basemap}
                onChange={(e) => setBasemap(e.target.value)}
                className="text-xs rounded-lg border border-white/20 bg-gray-900/80 backdrop-blur text-white px-3 py-1.5 pr-8 appearance-none bg-no-repeat bg-[center_right_0.5rem] focus:ring-2 focus:ring-shield-500 outline-none cursor-pointer"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23ffffff' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`, backgroundSize: "1rem" }}
              >
                <option value="dark">Dark</option>
                <option value="satellite">Satellite</option>
                <option value="osm">Street</option>
              </select>
            </div>

            <div className="absolute top-4 right-4 z-[1000] bg-gray-900/80 backdrop-blur rounded-lg px-3 py-1 text-xs text-white/70">
              <a href="https://rainviewer.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">RainViewer</a>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-3">
              <button
                onClick={() => setPlaying(!playing)}
                className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                  playing ? "bg-gray-100 text-gray-600 hover:bg-gray-200" : "bg-shield-600 text-white hover:bg-shield-700"
                }`}
              >
                {playing ? (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/></svg>
                ) : (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                )}
              </button>

              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-xs text-gray-500 font-medium tabular-nums w-14 shrink-0">{currentFrame + 1} / {frames.length}</span>
                <input
                  type="range"
                  min={0}
                  max={frames.length - 1}
                  value={currentFrame}
                  onChange={(e) => { setCurrentFrame(Number(e.target.value)); setPlaying(false); }}
                  className="flex-1 h-1.5 rounded-full appearance-none bg-gray-200 cursor-pointer accent-shield-600"
                />
              </div>

              <div className="hidden sm:flex items-center gap-2 shrink-0">
                <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <input
                  type="range"
                  min={10}
                  max={100}
                  value={opacity}
                  onChange={(e) => setOpacity(Number(e.target.value))}
                  className="w-20 h-1.5 rounded-full appearance-none bg-gray-200 cursor-pointer accent-shield-600"
                />
                <span className="text-[10px] text-gray-400 w-7">{opacity}%</span>
              </div>
            </div>

            <div className="flex gap-2 px-5 py-3 overflow-x-auto">
              <div className="flex items-center gap-1.5 mr-3 shrink-0">
                <span className="w-2.5 h-2.5 rounded-sm bg-blue-400" />
                <span className="text-[10px] text-gray-400 font-medium">Past</span>
                <span className="w-2.5 h-2.5 rounded-sm bg-purple-400 ml-1" />
                <span className="text-[10px] text-gray-400 font-medium">Forecast</span>
              </div>
              {frames.slice(0, 48).map((f, i) => {
                const isPast = i < pastCount;
                const isCurrent = i === currentFrame;
                const d = new Date(f.time * 1000);
                const label = d.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" });
                return (
                  <button
                    key={f.time}
                    onClick={() => { setCurrentFrame(i); setPlaying(false); }}
                    className={`shrink-0 w-12 rounded-md py-1.5 text-center text-[9px] font-medium transition-all ${
                      isCurrent
                        ? "bg-shield-600 text-white ring-2 ring-shield-500/50 scale-110"
                        : isPast
                          ? "bg-blue-50 text-blue-700 hover:bg-blue-100"
                          : "bg-purple-50 text-purple-700 hover:bg-purple-100"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

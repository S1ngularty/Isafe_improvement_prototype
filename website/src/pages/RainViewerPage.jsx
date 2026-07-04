import { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { fetchRadarFrames } from "../services/rainviewer";

const PH_CENTER = [12.8, 121.7];
const RADAR_MAX_ZOOM = 10;
const TILE_SIZE = 256;
const TILE_OPTIONS = "1_1";
const COLOR_SCHEME = 2;

const ANIM_SPEEDS = [
  { value: 1200, label: "Slow" },
  { value: 600, label: "Normal" },
  { value: 300, label: "Fast" },
  { value: 150, label: "Ludicrous" },
];

const BASEMAPS = {
  dark: {
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attr: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
    label: "Dark",
  },
  satellite: {
    url: "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attr: "Esri, Maxar, Earthstar Geographics",
    label: "Satellite",
  },
  osm: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attr: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    label: "Street",
  },
};

const LEGEND_STOPS = [
  { color: "rgba(0,0,0,0)", label: "0", dBZ: -30 },
  { color: "#00ffff", label: "0.1", dBZ: 10 },
  { color: "#00e5ff", label: "0.5", dBZ: 15 },
  { color: "#00bfff", label: "1", dBZ: 20 },
  { color: "#0099ff", label: "2", dBZ: 25 },
  { color: "#00cc66", label: "4", dBZ: 30 },
  { color: "#33cc00", label: "8", dBZ: 35 },
  { color: "#ffff00", label: "16", dBZ: 40 },
  { color: "#ff9900", label: "32", dBZ: 45 },
  { color: "#ff3300", label: "64", dBZ: 50 },
  { color: "#cc0000", label: "128+", dBZ: 55 },
];

function MapController({ center, zoom }) {
  const map = useMap();
  useEffect(() => { map.setView(center, zoom); }, [map, center, zoom]);
  return null;
}

function formatDate(ts) {
  return new Date(ts * 1000).toLocaleString("en-PH", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function formatTime(ts) {
  return new Date(ts * 1000).toLocaleTimeString("en-PH", {
    hour: "2-digit", minute: "2-digit",
  });
}

function timeAgo(ts) {
  const sec = Math.floor((Date.now() / 1000) - ts);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  return `${Math.floor(min / 60)}h ${min % 60}m ago`;
}

export default function RainViewerPage() {
  const [frames, setFrames] = useState([]);
  const [host, setHost] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [opacity, setOpacity] = useState(70);
  const [basemap, setBasemap] = useState("dark");
  const [showCoverage, setShowCoverage] = useState(false);
  const [speed, setSpeed] = useState(600);
  const [showStats, setShowStats] = useState(true);
  const [generated, setGenerated] = useState(0);
  const [pastCount, setPastCount] = useState(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const data = await fetchRadarFrames();
        if (cancelled || !data) return;
        setHost(data.host);
        setFrames(data.frames || []);
        setGenerated(data.generated || 0);
        setPastCount(data.past_count || 0);
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
    intervalRef.current = setInterval(() => {
      setCurrentIdx((prev) => (prev + 1) % frames.length);
    }, speed);
    return () => clearInterval(intervalRef.current);
  }, [playing, frames.length, speed]);

  const frame = frames[currentIdx] || null;
  const radarUrl = frame && host
    ? `${host}${frame.path}/${TILE_SIZE}/{z}/{x}/{y}/${COLOR_SCHEME}/${TILE_OPTIONS}.png`
    : null;

  const coverageUrl = host
    ? `${host}/v2/coverage/0/${TILE_SIZE}/{z}/{x}/{y}/0/0_0.png`
    : null;

  const bm = BASEMAPS[basemap] || BASEMAPS.dark;
  const nowcastCount = frames.length - pastCount;
  const firstTime = frames.length > 0 ? frames[0].time : 0;
  const lastTime = frames.length > 0 ? frames[frames.length - 1].time : 0;
  const timeRange = firstTime && lastTime
    ? `${formatTime(firstTime)} – ${formatTime(lastTime)}`
    : "—";

  if (loading) {
    return (
      <div className="rounded-xl overflow-hidden border border-gray-800">
        <div className="h-[75vh] min-h-[500px] bg-gray-950 animate-pulse flex flex-col items-center justify-center gap-4">
          <div className="w-12 h-12 border-[3px] border-shield-500 border-t-transparent rounded-full animate-spin" />
          <div className="space-y-2 text-center">
            <p className="text-sm font-medium text-gray-300">Loading radar data...</p>
            <p className="text-xs text-gray-500">Fetching latest precipitation frames</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl overflow-hidden border border-red-900/50 bg-gray-950">
        <div className="h-[75vh] min-h-[500px] flex flex-col items-center justify-center gap-4">
          <svg className="w-16 h-16 text-red-400/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-lg font-semibold text-gray-300">Radar Unavailable</p>
          <p className="text-sm text-gray-500">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 px-5 py-2 bg-shield-600 hover:bg-shield-500 text-white rounded-lg text-sm font-semibold transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-600/20">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 16.58A5 5 0 0018 7h-1.26A8 8 0 104 15.25" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 19v2M8 13v2M16 19v2M16 13v2M12 21v2" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">RainViewer Radar</h1>
            <p className="text-xs text-gray-500 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Live
              <span className="text-gray-300">&middot;</span>
              {frames.length} frames
              {generated > 0 && (
                <>
                  <span className="text-gray-300 hidden sm:inline">&middot;</span>
                  <span className="hidden sm:inline">Updated {timeAgo(generated)}</span>
                </>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={basemap}
            onChange={(e) => setBasemap(e.target.value)}
            className="text-xs rounded-lg border border-gray-200 bg-white text-gray-700 px-3 py-1.5 pr-8 appearance-none bg-no-repeat bg-[center_right_0.5rem] focus:ring-2 focus:ring-shield-500 outline-none cursor-pointer font-medium"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%234b5563' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`, backgroundSize: "1rem" }}
          >
            {Object.entries(BASEMAPS).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <button
            onClick={() => setShowStats(!showStats)}
            className={`p-1.5 rounded-lg border transition-colors ${
              showStats ? "bg-shield-50 border-shield-200 text-shield-700" : "border-gray-200 text-gray-400 hover:text-gray-600 hover:bg-gray-50"
            }`}
            title="Toggle stats panel"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </button>
          <a href="https://rainviewer.com" target="_blank" rel="noopener noreferrer" className="text-xs text-gray-400 hover:text-shield-600 transition-colors font-medium">
            RainViewer &nearr;
          </a>
        </div>
      </div>

      <div className="flex gap-4">
        <div className="flex-1 min-w-0">
          <div className="rounded-xl overflow-hidden shadow-lg border border-gray-800 bg-gray-950 relative">
            <MapContainer
              center={PH_CENTER}
              zoom={6}
              maxZoom={RADAR_MAX_ZOOM}
              className="h-[55vh] min-h-[400px] w-full"
              scrollWheelZoom={true}
              zoomControl={false}
            >
              <MapController center={PH_CENTER} zoom={6} />
              <TileLayer url={bm.url} attribution={bm.attr} />
              {radarUrl && (
                <TileLayer
                  key={currentIdx}
                  url={radarUrl}
                  opacity={opacity / 100}
                  maxZoom={RADAR_MAX_ZOOM}
                  maxNativeZoom={RADAR_MAX_ZOOM}
                />
              )}
              {showCoverage && coverageUrl && (
                <TileLayer
                  url={coverageUrl}
                  opacity={0.35}
                  maxZoom={RADAR_MAX_ZOOM}
                  maxNativeZoom={RADAR_MAX_ZOOM}
                />
              )}
            </MapContainer>

            <div className="absolute top-3 left-3 z-[1000] flex items-center gap-2">
              <div className="bg-gray-950/80 backdrop-blur-md rounded-lg px-3 py-1.5 text-white text-xs font-semibold shadow-lg border border-white/10">
                {frame ? formatDate(frame.time) : "--:--"}
              </div>
            </div>

            <div className="absolute top-3 right-3 z-[1000] flex items-center gap-2">
              <button
                onClick={() => setShowCoverage((v) => !v)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all shadow-lg border backdrop-blur-md ${
                  showCoverage
                    ? "bg-shield-600 text-white border-shield-500"
                    : "bg-gray-950/80 text-white/70 border-white/10 hover:bg-gray-900 hover:text-white"
                }`}
                title="Toggle radar coverage mask"
              >
                <span className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                  Coverage
                </span>
              </button>
            </div>

            <div className="absolute bottom-3 left-3 z-[1000]">
              <div className="bg-gray-950/80 backdrop-blur-md rounded-lg px-3 py-2 shadow-lg border border-white/10">
                <LegendBar />
              </div>
            </div>

            <div className="absolute bottom-3 right-3 z-[1000]">
              <a href="https://rainviewer.com" target="_blank" rel="noopener noreferrer" className="text-[10px] text-white/40 hover:text-white/70 transition-colors">
                RainViewer
              </a>
            </div>
          </div>

          <div className="mt-3 bg-gray-950/90 backdrop-blur-md rounded-xl shadow-lg border border-gray-800 px-4 py-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setCurrentIdx(Math.max(0, currentIdx - 1))}
                className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                title="Previous frame"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
              </button>
              <button
                onClick={() => setPlaying(!playing)}
                className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-lg ${
                  playing
                    ? "bg-white/15 text-white hover:bg-white/25"
                    : "bg-shield-600 text-white hover:bg-shield-500"
                }`}
                title={playing ? "Pause" : "Play"}
              >
                {playing ? (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/></svg>
                ) : (
                  <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                )}
              </button>
              <button
                onClick={() => setCurrentIdx(Math.min(frames.length - 1, currentIdx + 1))}
                className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                title="Next frame"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18 6v12h-2V6zm-3.5 6l-8.5 6V6z"/></svg>
              </button>

              <div className="h-8 w-px bg-white/10 mx-1" />

              <span className="text-xs text-gray-400 font-medium tabular-nums w-16 shrink-0">
                {currentIdx + 1} / {frames.length}
              </span>

              <input
                type="range"
                min={0}
                max={frames.length - 1}
                value={currentIdx}
                onChange={(e) => { setCurrentIdx(Number(e.target.value)); setPlaying(false); }}
                className="flex-1 h-1 rounded-full appearance-none bg-white/15 cursor-pointer accent-shield-500 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-shield-500 [&::-webkit-slider-thumb]:shadow-lg"
              />

              <div className="h-8 w-px bg-white/10 mx-1 hidden sm:block" />

              <div className="hidden sm:flex items-center gap-1 shrink-0">
                {ANIM_SPEEDS.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => setSpeed(s.value)}
                    className={`px-2 py-1 rounded-md text-[10px] font-semibold transition-all ${
                      speed === s.value
                        ? "bg-shield-600 text-white"
                        : "text-gray-400 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              <div className="h-8 w-px bg-white/10 mx-1 hidden sm:block" />

              <div className="hidden sm:flex items-center gap-2 shrink-0">
                <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <input
                  type="range"
                  min={10}
                  max={100}
                  value={opacity}
                  onChange={(e) => setOpacity(Number(e.target.value))}
                  className="w-16 h-1 rounded-full appearance-none bg-white/15 cursor-pointer accent-shield-500 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow"
                />
                <span className="text-[10px] text-gray-400 w-6">{opacity}%</span>
              </div>
            </div>

            <div className="flex gap-1 mt-2 pt-2 border-t border-white/10 overflow-x-auto">
              <div className="flex items-center gap-2 mr-3 shrink-0">
                <span className="w-2 h-2 rounded-sm bg-blue-500/70" />
                <span className="text-[9px] text-gray-500 font-medium">Past</span>
                <span className="w-2 h-2 rounded-sm bg-purple-500/70 ml-0.5" />
                <span className="text-[9px] text-gray-500 font-medium">Forecast</span>
              </div>
              {frames.map((f, i) => {
                const isPast = i < pastCount;
                const isCurrent = i === currentIdx;
                return (
                  <button
                    key={f.time}
                    onClick={() => { setCurrentIdx(i); setPlaying(false); }}
                    className={`shrink-0 w-10 py-1 rounded text-center text-[8px] font-semibold transition-all ${
                      isCurrent
                        ? "bg-shield-600 text-white shadow-lg scale-110"
                        : isPast
                          ? "bg-blue-500/20 text-blue-300 hover:bg-blue-500/30"
                          : "bg-purple-500/20 text-purple-300 hover:bg-purple-500/30"
                    }`}
                  >
                    {formatTime(f.time)}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {showStats && (
          <div className="w-56 shrink-0 hidden xl:flex flex-col gap-3">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Radar Stats</h3>
              <div className="space-y-3">
                {[
                  { label: "Frames", value: frames.length, cls: "text-gray-900" },
                  { label: "Time Range", value: timeRange, cls: "text-gray-900" },
                  { label: "Past", value: pastCount, cls: "text-blue-600" },
                  { label: "Forecast", value: nowcastCount, cls: "text-purple-600" },
                  { label: "Updated", value: generated > 0 ? timeAgo(generated) : "—", cls: "text-gray-900" },
                  { label: "Coverage", value: "Philippines", cls: "text-green-600" },
                ].map(({ label, value, cls }) => (
                  <div key={label}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">{label}</span>
                      <span className={`text-sm font-bold ${cls}`}>{value}</span>
                    </div>
                    <div className="h-px bg-gray-100 mt-2" />
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Legend</h3>
              <div className="space-y-2">
                {LEGEND_STOPS.filter((_, i) => i % 2 === 0).map((s) => (
                  <div key={s.dBZ} className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-sm border border-gray-200" style={{ backgroundColor: s.color }} />
                    <span className="text-xs text-gray-600">{s.label} mm/hr</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="flex items-center justify-between text-[10px] text-gray-400">
                  <span>dBZ: -30</span>
                  <span className="font-medium text-gray-600">55+</span>
                </div>
                <div
                  className="h-2 mt-1 rounded-sm"
                  style={{ background: `linear-gradient(to right, ${LEGEND_STOPS.map((s) => s.color).join(",")})` }}
                />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Controls</h3>
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-gray-500">Opacity</span>
                    <span className="text-[10px] text-gray-400 font-medium">{opacity}%</span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={100}
                    value={opacity}
                    onChange={(e) => setOpacity(Number(e.target.value))}
                    className="w-full h-1.5 rounded-full appearance-none bg-gray-200 cursor-pointer accent-shield-600"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-gray-500">Speed</span>
                    <span className="text-[10px] text-gray-400 font-medium">
                      {ANIM_SPEEDS.find((s) => s.value === speed)?.label || "Normal"}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    {ANIM_SPEEDS.map((s) => (
                      <button
                        key={s.value}
                        onClick={() => setSpeed(s.value)}
                        className={`flex-1 py-1 rounded text-[9px] font-semibold transition-all ${
                          speed === s.value
                            ? "bg-shield-600 text-white"
                            : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => setShowCoverage((v) => !v)}
                  className={`w-full py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    showCoverage
                      ? "bg-shield-600 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {showCoverage ? "Hide Coverage" : "Show Coverage"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function LegendBar() {
  const gradient = LEGEND_STOPS.map((s) => s.color).join(",");
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-0.5">
        <span className="text-[10px] text-white/50 font-medium mr-1">mm/hr</span>
        <div className="h-2.5 w-40 rounded-sm" style={{ background: `linear-gradient(to right, ${gradient})` }} />
      </div>
      <div className="flex items-center gap-2 text-[9px] text-white/60 font-medium">
        <span>Light</span>
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
        <span>Moderate</span>
        <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
        <span>Heavy</span>
        <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
        <span>Extreme</span>
        <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
      </div>
    </div>
  );
}

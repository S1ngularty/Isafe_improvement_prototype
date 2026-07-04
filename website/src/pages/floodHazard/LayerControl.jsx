const BASEMAP_OPTIONS = [
  { id: "satellite", label: "Satellite", icon: "🛰" },
  { id: "dark", label: "Dark", icon: "🌙" },
  { id: "osm", label: "Street", icon: "🗺" },
];

export default function LayerControl({ opacity, setOpacity, basemap, setBasemap }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-4">
      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Map Layers</h3>

      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-600 font-medium">Hazard Opacity</span>
          <span className="text-[11px] text-gray-400 font-semibold tabular-nums">{opacity}%</span>
        </div>
        <input
          type="range"
          min="20"
          max="100"
          value={opacity}
          onChange={(e) => setOpacity(Number(e.target.value))}
          className="w-full h-1.5 rounded-full appearance-none bg-gray-200 cursor-pointer accent-shield-600"
        />
        <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
          <span>Faint</span>
          <span>Opaque</span>
        </div>
      </div>

      <div>
        <span className="text-xs text-gray-600 font-medium block mb-2">Basemap</span>
        <div className="grid grid-cols-3 gap-1.5">
          {BASEMAP_OPTIONS.map(({ id, label, icon }) => (
            <button
              key={id}
              onClick={() => setBasemap(id)}
              className={`flex flex-col items-center gap-1 py-2.5 rounded-lg text-[10px] font-semibold transition-all ${
                basemap === id
                  ? "bg-shield-600 text-white shadow-sm"
                  : "bg-gray-50 text-gray-500 hover:bg-gray-100"
              }`}
            >
              <span className="text-sm">{icon}</span>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="pt-2 border-t border-gray-100">
        <p className="text-[10px] text-gray-400 leading-relaxed">
          <strong>Risk colors:</strong> Dark red = Very High &rarr; Light pink = None
        </p>
      </div>
    </div>
  );
}

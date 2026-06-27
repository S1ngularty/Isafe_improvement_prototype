export default function LayerControl({ opacity, setOpacity, basemap, setBasemap }) {
  return (
    <div className="bg-white/95 backdrop-blur rounded-lg shadow border border-gray-200 p-3 space-y-3 text-xs">
      <div>
        <label className="text-[10px] text-gray-400 uppercase font-bold block mb-1">Opacity: {opacity}%</label>
        <input
          type="range"
          min="20"
          max="100"
          value={opacity}
          onChange={(e) => setOpacity(Number(e.target.value))}
          className="w-full h-1.5 rounded-full appearance-none bg-gray-200 cursor-pointer accent-shield-600"
        />
      </div>

      <div>
        <label className="text-[10px] text-gray-400 uppercase font-bold block mb-1">Basemap</label>
        <select
          value={basemap}
          onChange={(e) => setBasemap(e.target.value)}
          className="w-full rounded-md border-gray-200 text-xs py-1.5 px-2 focus:ring-1 focus:ring-shield-500 focus:border-shield-500"
        >
          <option value="satellite">Satellite</option>
          <option value="osm">OpenStreetMap</option>
        </select>
      </div>
    </div>
  );
}

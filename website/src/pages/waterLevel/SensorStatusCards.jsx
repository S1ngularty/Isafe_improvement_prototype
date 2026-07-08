import { useMemo } from "react";

const STATUS_COLORS = {
  SAFE: "bg-green-500",
  WARNING: "bg-amber-500",
  FLOOD_WARNING: "bg-red-500",
};

function getBorderColor(status) {
  if (status === "FLOOD_WARNING") return "border-red-500";
  if (status === "WARNING") return "border-amber-500";
  return "border-green-500";
}

function timeAgo(dateStr) {
  if (!dateStr) return "never";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  return `${hours}h ${mins % 60}m ago`;
}

export default function SensorStatusCards({ sensors }) {
  const sorted = useMemo(() => {
    if (!sensors) return [];
    return [...sensors].sort((a, b) => (b.is_active ? 1 : 0) - (a.is_active ? 1 : 0));
  }, [sensors]);

  if (!sensors || sensors.length === 0) {
    return (
      <div className="card py-8 text-center text-gray-400">
        <p className="text-sm">No sensors found</p>
      </div>
    );
  }

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {sorted.map((sensor) => (
        <div
          key={sensor.sensor_id}
          className={`card border-l-4 ${getBorderColor(sensor.last_status)}`}
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-gray-900 text-sm truncate">
              {sensor.sensor_id}
            </h3>
            <span
              className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                sensor.is_active
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  sensor.is_active ? "bg-green-500" : "bg-gray-400"
                }`}
              />
              {sensor.is_active ? "Active" : "Inactive"}
            </span>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-gray-500">Water Level</span>
              <span className="text-lg font-extrabold text-gray-900">
                {sensor.last_reading_cm != null
                  ? `${sensor.last_reading_cm} cm`
                  : "---"}
              </span>
            </div>

            {sensor.last_status && (
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">Status</span>
                <span
                  className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                    sensor.last_status === "FLOOD_WARNING"
                      ? "bg-red-100 text-red-700"
                      : sensor.last_status === "WARNING"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-green-100 text-green-700"
                  }`}
                >
                  {sensor.last_status}
                </span>
              </div>
            )}

            <div className="flex justify-between items-center text-xs text-gray-400 pt-1 border-t border-gray-50">
              <span>24h: {sensor.readings_24h} readings</span>
              <span>
                {sensor.unsafe_readings_24h > 0 ? (
                  <span className="text-red-500 font-medium">
                    {sensor.unsafe_readings_24h} unsafe
                  </span>
                ) : (
                  "0 unsafe"
                )}
              </span>
            </div>

            <p className="text-[10px] text-gray-400">
              Last seen {timeAgo(sensor.last_seen)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

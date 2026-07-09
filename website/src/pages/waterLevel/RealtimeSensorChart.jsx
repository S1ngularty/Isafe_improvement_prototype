import { useMemo } from "react";

const SENSOR_COLORS = [
  "#3b82f6",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#84cc16",
  "#ec4899",
  "#f97316",
];

const THRESHOLD_WARNING = 0.7;
const THRESHOLD_FLOOD = 0.5;

const LAYOUT = {
  font: { size: 11, color: "#374151" },
  margin: { l: 40, r: 10, t: 10, b: 30 },
  plot_bgcolor: "transparent",
  paper_bgcolor: "transparent",
  showlegend: true,
  legend: {
    orientation: "h",
    y: 1.12,
    x: 0.5,
    xanchor: "center",
    font: { size: 10 },
  },
  height: 250,
  hovermode: "x",
};

function DynamicPlot({ Plot, data, layout, config }) {
  if (!Plot) return <div className="h-64 bg-gray-50 rounded-xl animate-pulse" />;
  return (
    <Plot
      data={data}
      layout={layout}
      config={config || { displayModeBar: false, responsive: true }}
      style={{ width: "100%", height: 260 }}
    />
  );
}

function EmptyState() {
  return (
    <div className="card flex items-center justify-center h-64 text-gray-400">
      <div className="text-center">
        <svg className="w-8 h-8 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
        <p className="text-sm">Waiting for sensor data...</p>
      </div>
    </div>
  );
}

export default function RealtimeSensorChart({ readings, Plot }) {
  const { sensorIds, traces, domain } = useMemo(() => {
    if (!readings || readings.length === 0) {
      return { sensorIds: [], traces: [], domain: null };
    }

    const grouped = {};
    const order = [];
    for (const r of readings) {
      if (!grouped[r.sensor_id]) {
        grouped[r.sensor_id] = [];
        order.push(r.sensor_id);
      }
      grouped[r.sensor_id].push(r);
    }

    const colorMap = {};
    order.forEach((id, i) => {
      colorMap[id] = SENSOR_COLORS[i % SENSOR_COLORS.length];
    });

    const xs = readings.map((r) => r.recorded_at);
    const ys = readings.map((r) => r.water_level_cm / 100);

    const minX = xs.length > 0 ? xs[xs.length - 1] : null;
    const maxX = xs.length > 0 ? xs[0] : null;

    const traceData = order.map((sensorId) => {
      const pts = grouped[sensorId];
      return {
        type: "scatter",
        mode: "lines+markers",
        x: pts.map((p) => p.recorded_at),
        y: pts.map((p) => p.water_level_cm / 100),
        name: sensorId,
        line: { color: colorMap[sensorId], width: 1.5 },
        marker: {
          size: 4,
          color: pts.map((p) =>
            p.status === "FLOOD_WARNING"
              ? "#ef4444"
              : p.status === "WARNING"
                ? "#f59e0b"
                : colorMap[sensorId],
          ),
        },
        hovertemplate: `%{y:.2f} m<extra>${sensorId}</extra>`,
      };
    });

    const shapes = [
      {
        type: "rect",
        xref: "paper",
        yref: "y",
        x0: 0,
        x1: 1,
        y0: 0,
        y1: THRESHOLD_FLOOD,
        fillcolor: "rgba(239,68,68,0.08)",
        line: { width: 0 },
        layer: "below",
      },
      {
        type: "rect",
        xref: "paper",
        yref: "y",
        x0: 0,
        x1: 1,
        y0: THRESHOLD_FLOOD,
        y1: THRESHOLD_WARNING,
        fillcolor: "rgba(245,158,11,0.06)",
        line: { width: 0 },
        layer: "below",
      },
    ];

    const thresholdTraces = [
      {
        type: "scatter",
        mode: "lines",
        x: [minX, maxX],
        y: [THRESHOLD_FLOOD, THRESHOLD_FLOOD],
        name: "FLOOD WARNING",
        line: { color: "#ef4444", width: 2, dash: "dash" },
        hoverinfo: "skip",
      },
      {
        type: "scatter",
        mode: "lines",
        x: [minX, maxX],
        y: [THRESHOLD_WARNING, THRESHOLD_WARNING],
        name: "WARNING",
        line: { color: "#f59e0b", width: 2, dash: "dash" },
        hoverinfo: "skip",
      },
    ];

    return {
      sensorIds: order,
      traces: [...traceData, ...thresholdTraces],
      domain: { minX, maxX, shapes },
    };
  }, [readings]);

  if (!readings || readings.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="card">
      <DynamicPlot
        Plot={Plot}
        data={traces}
        layout={{
          ...LAYOUT,
          yaxis: { rangemode: "tozero", title: "m", fixedrange: false },
          xaxis: {
            tickfont: { size: 9 },
            range: [domain.minX, domain.maxX],
            autorange: true,
          },
          shapes: domain.shapes,
        }}
      />
    </div>
  );
}

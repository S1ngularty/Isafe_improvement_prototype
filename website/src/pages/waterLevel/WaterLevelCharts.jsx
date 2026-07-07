const GREEN = "#22c55e";
const AMBER = "#f59e0b";
const RED = "#ef4444";
const BLUE = "#3b82f6";
const GRAY = "#9ca3af";

const LAYOUT = {
  font: { size: 11, color: "#374151" },
  margin: { l: 40, r: 10, t: 30, b: 30 },
  plot_bgcolor: "transparent",
  paper_bgcolor: "transparent",
  showlegend: true,
  legend: { orientation: "h", y: 1.1, x: 0.5, xanchor: "center", font: { size: 10 } },
  height: 280,
};

function DynamicPlot({ Plot, data, layout, config, style }) {
  if (!Plot) return <div className="h-64 bg-gray-50 rounded-xl animate-pulse" />;
  return (
    <Plot
      data={data}
      layout={layout}
      config={config || { displayModeBar: false, responsive: true }}
      style={style || { width: "100%", height: 300 }}
    />
  );
}

function ChartCard({ title, subtitle, children }) {
  return (
    <div className="card">
      <h3 className="font-bold text-gray-900 mb-1">{title}</h3>
      {subtitle && <p className="text-xs text-gray-400 mb-4">{subtitle}</p>}
      {!subtitle && <div className="mb-4" />}
      {children}
    </div>
  );
}

function EmptyChartMessage({ message }) {
  return (
    <div className="h-64 flex items-center justify-center text-gray-400">
      <p className="text-sm">{message}</p>
    </div>
  );
}

export default function WaterLevelCharts({ analytics, Plot }) {
  if (!analytics) return null;

  const ts = analytics.time_series || [];
  const hp = analytics.hourly_patterns || [];
  const da = analytics.daily_aggregates || [];

  const hasTimeSeries = ts.length >= 2;
  const hasDaily = da.length > 0;
  const statusCounts = {
    safe: ts.filter((p) => p.status === "SAFE").length,
    warning: ts.filter((p) => p.status === "WARNING").length,
    flood: ts.filter((p) => p.status === "FLOOD_WARNING").length,
  };
  const hasAnyStatus = statusCounts.safe > 0 || statusCounts.warning > 0 || statusCounts.flood > 0;

  return (
    <div className="space-y-6">
      {/* Row 1: Time Series + Status Distribution */}
      <div className="grid lg:grid-cols-2 gap-6">
        <ChartCard title="Water Level Over Time" subtitle="All sensor readings with safety threshold zones">
          {hasTimeSeries ? (
            <DynamicPlot
              Plot={Plot}
              data={[
                {
                  type: "scatter",
                  mode: "lines+markers",
                  x: ts.map((p) => p.timestamp),
                  y: ts.map((p) => p.water_level_cm),
                  name: "Water Level",
                  line: { color: BLUE, width: 1.5 },
                  marker: {
                    size: 3,
                    color: ts.map((p) =>
                      p.status === "FLOOD_WARNING"
                        ? RED
                        : p.status === "WARNING"
                          ? AMBER
                          : GREEN
                    ),
                  },
                  hovertemplate: "%{y:.1f} cm<extra>%{x}</extra>",
                },
                {
                  type: "scatter",
                  mode: "lines",
                  x: [ts[0].timestamp, ts[ts.length - 1].timestamp],
                  y: [150, 150],
                  name: "FLOOD WARNING",
                  line: { color: RED, width: 2, dash: "dash" },
                  hoverinfo: "skip",
                },
                {
                  type: "scatter",
                  mode: "lines",
                  x: [ts[0].timestamp, ts[ts.length - 1].timestamp],
                  y: [100, 100],
                  name: "WARNING",
                  line: { color: AMBER, width: 2, dash: "dash" },
                  hoverinfo: "skip",
                },
              ]}
              layout={{
                ...LAYOUT,
                yaxis: { rangemode: "tozero", title: "cm" },
                xaxis: { tickfont: { size: 9 } },
                hovermode: "x",
                shapes: [
                  {
                    type: "rect",
                    xref: "paper",
                    yref: "y",
                    x0: 0,
                    x1: 1,
                    y0: 150,
                    y1: 300,
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
                    y0: 100,
                    y1: 150,
                    fillcolor: "rgba(245,158,11,0.06)",
                    line: { width: 0 },
                    layer: "below",
                  },
                ],
              }}
            />
          ) : (
            <EmptyChartMessage message="Not enough data points to render time series" />
          )}
        </ChartCard>

        <ChartCard title="Status Distribution" subtitle="SAFE vs WARNING vs FLOOD_WARNING">
          {hasAnyStatus ? (
            <DynamicPlot
              Plot={Plot}
              data={[
                {
                  type: "pie",
                  labels: ["SAFE", "WARNING", "FLOOD WARNING"],
                  values: [statusCounts.safe, statusCounts.warning, statusCounts.flood],
                  marker: { colors: [GREEN, AMBER, RED] },
                  hole: 0.45,
                  textinfo: "label+percent",
                  textposition: "outside",
                  textfont: { size: 10 },
                },
              ]}
              layout={{
                ...LAYOUT,
                height: 260,
                showlegend: false,
                margin: { l: 10, r: 10, t: 10, b: 10 },
              }}
            />
          ) : (
            <EmptyChartMessage message="No readings to display" />
          )}
        </ChartCard>
      </div>

      {/* Row 2: Hourly Pattern + Daily Aggregate */}
      <div className="grid lg:grid-cols-2 gap-6">
        <ChartCard title="Hourly Water Level Pattern" subtitle="Average water level by hour of day">
          <DynamicPlot
            Plot={Plot}
            data={[
              {
                type: "bar",
                x: hp.map((h) => `${h.hour}:00`),
                y: hp.map((h) => h.avg_water_level_cm),
                name: "Average",
                marker: {
                  color: hp.map((h) =>
                    h.avg_water_level_cm > 150 ? RED : h.avg_water_level_cm > 100 ? AMBER : BLUE
                  ),
                },
                hovertemplate: "Hour: %{x}<br>Avg: %{y:.1f} cm<br>Max: %{customdata[0]:.1f} cm<br>Min: %{customdata[1]:.1f} cm<extra></extra>",
                customdata: hp.map((h) => [h.max_water_level_cm, h.min_water_level_cm]),
              },
            ]}
            layout={{
              ...LAYOUT,
              yaxis: { rangemode: "tozero", title: "cm" },
              xaxis: { tickfont: { size: 8 }, tickangle: -45, dtick: 3 },
              hovermode: "x",
              showlegend: false,
            }}
          />
        </ChartCard>

        <ChartCard title="Daily Water Level Range" subtitle="Min / Avg / Max per day">
          {hasDaily ? (
            <DynamicPlot
              Plot={Plot}
              data={[
                {
                  type: "scatter",
                  mode: "lines+markers",
                  x: da.map((d) => d.date),
                  y: da.map((d) => d.avg_water_level_cm),
                  name: "Average",
                  line: { color: BLUE, width: 2 },
                  marker: { size: 5, color: BLUE },
                  fill: "tozeroy",
                  fillcolor: "rgba(59,130,246,0.1)",
                },
                {
                  type: "scatter",
                  mode: "markers",
                  x: da.map((d) => d.date),
                  y: da.map((d) => d.max_water_level_cm),
                  name: "Max",
                  line: { color: RED, width: 1, dash: "dot" },
                  marker: { size: 4, color: RED, symbol: "triangle-up" },
                },
                {
                  type: "scatter",
                  mode: "markers",
                  x: da.map((d) => d.date),
                  y: da.map((d) => d.min_water_level_cm),
                  name: "Min",
                  line: { color: GREEN, width: 1, dash: "dot" },
                  marker: { size: 4, color: GREEN, symbol: "triangle-down" },
                },
              ]}
              layout={{
                ...LAYOUT,
                yaxis: { rangemode: "tozero", title: "cm" },
                xaxis: { tickfont: { size: 9 } },
                hovermode: "x",
              }}
            />
          ) : (
            <EmptyChartMessage message="No daily aggregates available" />
          )}
        </ChartCard>
      </div>

      {/* Row 3: Unsafe Readings Count + Readings per Hour */}
      <div className="grid lg:grid-cols-2 gap-6">
        <ChartCard title="Unsafe Readings per Day" subtitle="Count of WARNING + FLOOD_WARNING readings">
          {hasDaily ? (
            <DynamicPlot
              Plot={Plot}
              data={[
                {
                  type: "bar",
                  x: da.map((d) => d.date),
                  y: da.map((d) => d.unsafe_count),
                  name: "Unsafe",
                  marker: {
                    color: da.map((d) => (d.unsafe_count > 0 ? RED : GREEN)),
                  },
                  hovertemplate: "%{x}<br>Unsafe readings: %{y}<extra></extra>",
                },
              ]}
              layout={{
                ...LAYOUT,
                yaxis: { rangemode: "tozero", dtick: 1 },
                xaxis: { tickfont: { size: 9 } },
                showlegend: false,
                hovermode: "x",
              }}
            />
          ) : (
            <EmptyChartMessage message="No daily data to display" />
          )}
        </ChartCard>

        <ChartCard title="Reading Count per Hour" subtitle="Sensor sampling frequency by hour">
          <DynamicPlot
            Plot={Plot}
            data={[
              {
                type: "bar",
                x: hp.map((h) => `${h.hour}:00`),
                y: hp.map((h) => h.reading_count),
                name: "Readings",
                marker: { color: GRAY },
                hovertemplate: "Hour: %{x}<br>Readings: %{y}<extra></extra>",
              },
            ]}
            layout={{
              ...LAYOUT,
              yaxis: { rangemode: "tozero", dtick: 1 },
              xaxis: { tickfont: { size: 8 }, tickangle: -45, dtick: 3 },
              showlegend: false,
              hovermode: "x",
            }}
          />
        </ChartCard>
      </div>
    </div>
  );
}

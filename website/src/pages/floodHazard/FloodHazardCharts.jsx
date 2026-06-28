import { useMemo, useState, useEffect } from "react";

const DARK_RED = "#5c1010";
const LIGHT_RED = "#b91c1c";
const ORANGE = "#ef6548";
const GREY = "#9ca3af";

export default function FloodHazardCharts({ summary, onSelectBarangay }) {
  const [Plot, setPlot] = useState(null);

  useEffect(() => {
    import("react-plotly.js").then((mod) => setPlot(() => mod.default));
  }, []);
  const top15 = useMemo(() => {
    if (!summary || summary.length === 0) return [];
    return [...summary].sort((a, b) => b.pct_total_hazard - a.pct_total_hazard).slice(0, 15).reverse();
  }, [summary]);

  const riskCounts = useMemo(() => {
    if (!summary || summary.length === 0) return {};
    const counts = {};
    summary.forEach((s) => {
      counts[s.risk_level] = (counts[s.risk_level] || 0) + 1;
    });
    return counts;
  }, [summary]);

  if (!Plot || !summary || summary.length === 0) {
    return <div className="h-64 bg-gray-50 rounded-xl animate-pulse" />;
  }

  const layout = {
    font: { size: 11, color: "#374151" },
    margin: { l: 10, r: 10, t: 35, b: 10 },
    plot_bgcolor: "transparent",
    paper_bgcolor: "transparent",
    showlegend: true,
    legend: { orientation: "h", y: 1.1, x: 0.5, xanchor: "center", font: { size: 10 } },
    height: 300,
  };

  const donutLayout = {
    ...layout,
    showlegend: true,
    legend: { font: { size: 10 } },
    height: 280,
    margin: { l: 10, r: 10, t: 30, b: 10 },
  };

  if (top15.length === 0) return null;

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <Plot
          data={[
            {
              type: "bar",
              x: top15.map((s) => s.barangay),
              y: top15.map((s) => s.pct_high),
              name: "High Hazard",
              marker: { color: DARK_RED },
              hovertemplate: "%{y:.1f}% High<extra></extra>",
            },
            {
              type: "bar",
              x: top15.map((s) => s.barangay),
              y: top15.map((s) => s.pct_medium),
              name: "Medium Hazard",
              marker: { color: LIGHT_RED },
              hovertemplate: "%{y:.1f}% Medium<extra></extra>",
            },
          ]}
          layout={{
            ...layout,
            barmode: "stack",
            title: "Top 15 Barangays — Flood Hazard Coverage",
              xaxis: { tickangle: -35, tickfont: { size: 9 }, automargin: true },
            yaxis: { title: "Area Coverage (%)", rangemode: "tozero" },
          }}
          config={{ displayModeBar: false, responsive: true }}
          style={{ width: "100%", height: 300 }}
          onClick={(e) => {
            const idx = e.points[0]?.pointIndex;
            if (idx != null && onSelectBarangay) {
              onSelectBarangay(top15[top15.length - 1 - idx]?.barangay);
            }
          }}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <Plot
            data={[{
              type: "pie",
              labels: ["Very High", "High", "Moderate", "Low", "None"],
              values: [
                riskCounts["Very High"] || 0,
                riskCounts["High"] || 0,
                riskCounts["Moderate"] || 0,
                riskCounts["Low"] || 0,
                riskCounts["None"] || 0,
              ],
              marker: { colors: ["#67000d", DARK_RED, ORANGE, LIGHT_RED, GREY] },
              hole: 0.45,
              textinfo: "label+value",
              textposition: "outside",
              textfont: { size: 10 },
            }]}
            layout={{ ...donutLayout, title: "Risk Distribution" }}
            config={{ displayModeBar: false, responsive: true }}
            style={{ width: "100%", height: 280 }}
          />
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <Plot
            data={[{
              type: "bar",
              x: ["Very High", "High", "Moderate", "Low", "None"],
              y: [
                riskCounts["Very High"] || 0,
                riskCounts["High"] || 0,
                riskCounts["Moderate"] || 0,
                riskCounts["Low"] || 0,
                riskCounts["None"] || 0,
              ],
              marker: { color: ["#67000d", DARK_RED, ORANGE, LIGHT_RED, GREY] },
              text: [
                riskCounts["Very High"] || 0,
                riskCounts["High"] || 0,
                riskCounts["Moderate"] || 0,
                riskCounts["Low"] || 0,
                riskCounts["None"] || 0,
              ],
              textposition: "outside",
              textfont: { size: 11, color: "#374151" },
            }]}
            layout={{
              ...layout,
              title: "Barangay Count by Risk Level",
              xaxis: { tickfont: { size: 9 } },
              yaxis: { title: "Barangays", rangemode: "tozero" },
            }}
            config={{ displayModeBar: false, responsive: true }}
            style={{ width: "100%", height: 280 }}
          />
        </div>
      </div>
    </div>
  );
}

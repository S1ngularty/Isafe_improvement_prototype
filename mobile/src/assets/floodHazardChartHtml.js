const FLOOD_HAZARD_CHART_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <script src="https://cdn.plot.ly/plotly-2.32.0.min.js"></script>
  <style>
    body { margin: 0; padding: 16px; background-color: #f9fafb; font-family: -apple-system, system-ui, sans-serif; }
    .chart-container { background: #fff; border-radius: 12px; padding: 12px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .chart { width: 100%; height: 300px; }
    .chart-placeholder { display: flex; align-items: center; justify-content: center; height: 300px; color: #9ca3af; font-size: 13px; }
  </style>
</head>
<body>
  <div class="chart-container">
    <div id="bar-chart" class="chart"><div class="chart-placeholder">Loading chart data...</div></div>
  </div>
  <div class="chart-container">
    <div id="donut-chart" class="chart"><div class="chart-placeholder">Loading chart data...</div></div>
  </div>
  <div class="chart-container">
    <div id="count-chart" class="chart"><div class="chart-placeholder">Loading chart data...</div></div>
  </div>

  <script>
    const DARK_RED = "#5c1010";
    const LIGHT_RED = "#b91c1c";
    const ORANGE = "#ef6548";
    const GREY = "#9ca3af";

    const layout = {
      font: { size: 10, color: "#374151" },
      margin: { l: 30, r: 10, t: 30, b: 40 },
      plot_bgcolor: "transparent",
      paper_bgcolor: "transparent",
      showlegend: true,
      legend: { orientation: "h", y: -0.2, x: 0.5, xanchor: "center", font: { size: 10 } },
    };

    function renderCharts(summaryInput) {
      const summary = typeof summaryInput === "string" ? JSON.parse(summaryInput) : summaryInput;
      if (!summary || summary.length === 0) return;

      // Remove loading placeholders
      document.querySelectorAll(".chart-placeholder").forEach(el => el.remove());

      const top15 = [...summary].sort((a, b) => b.pct_total_hazard - a.pct_total_hazard).slice(0, 15);
      
      const riskCounts = {};
      summary.forEach(s => {
        riskCounts[s.risk_level] = (riskCounts[s.risk_level] || 0) + 1;
      });

      // Top 15 Stacked Bar
      Plotly.newPlot("bar-chart", [
        {
          type: "bar",
          x: top15.map(s => s.barangay),
          y: top15.map(s => s.pct_high),
          name: "High Hazard",
          marker: { color: DARK_RED }
        },
        {
          type: "bar",
          x: top15.map(s => s.barangay),
          y: top15.map(s => s.pct_medium),
          name: "Medium Hazard",
          marker: { color: LIGHT_RED }
        }
      ], {
        ...layout,
        barmode: "stack",
        title: { text: "Top 15 Barangays — Hazard %", font: { size: 12 } },
        xaxis: { tickangle: -45, tickfont: { size: 8 } },
        yaxis: { title: { text: "Coverage %", font: { size: 10 } }, rangemode: "tozero" },
        legend: { orientation: "h", y: -0.3, x: 0.5, xanchor: "center" }
      }, { displayModeBar: false, responsive: true });

      // Risk Distribution Donut
      const riskLabels = ["Very High", "High", "Moderate", "Low", "None"];
      const riskVals = riskLabels.map(l => riskCounts[l] || 0);
      const riskColors = ["#67000d", DARK_RED, ORANGE, LIGHT_RED, GREY];

      Plotly.newPlot("donut-chart", [{
        type: "pie",
        labels: riskLabels,
        values: riskVals,
        marker: { colors: riskColors },
        hole: 0.45,
        textinfo: "percent",
        textposition: "inside"
      }], {
        ...layout,
        title: { text: "Risk Distribution", font: { size: 12 } },
        margin: { l: 10, r: 10, t: 30, b: 10 },
        legend: { orientation: "h", y: -0.1, x: 0.5, xanchor: "center", font: { size: 9 } }
      }, { displayModeBar: false, responsive: true });

      // Count by Risk Level
      Plotly.newPlot("count-chart", [{
        type: "bar",
        x: riskLabels,
        y: riskVals,
        marker: { color: riskColors },
        text: riskVals,
        textposition: "outside"
      }], {
        ...layout,
        title: { text: "Barangay Count by Risk Level", font: { size: 12 } },
        xaxis: { tickfont: { size: 9 } },
        yaxis: { title: "Barangays", rangemode: "tozero" },
        showlegend: false
      }, { displayModeBar: false, responsive: true });
    }

    // Listen for messages from React Native
    document.addEventListener("message", function(event) {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "RENDER_CHARTS") {
          renderCharts(data.summary);
        }
      } catch (err) {
        console.error("Error parsing message", err);
      }
    });
    window.addEventListener("message", function(event) {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "RENDER_CHARTS") {
          renderCharts(data.summary);
        }
      } catch (err) {
        console.error("Error parsing message", err);
      }
    });
  </script>
</body>
</html>
`;

export default FLOOD_HAZARD_CHART_HTML;

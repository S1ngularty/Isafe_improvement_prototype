// Water Level Charts – Plotly.js WebView HTML bundle
// Renders: Time Series, Status Distribution, Hourly Pattern, Daily Range, Unsafe per Day
// Receives data via postMessage({ type: "LOAD_DATA", payload: { analytics } })

const WATER_LEVEL_CHART_HTML = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<script src="https://cdn.plot.ly/plotly-2.27.0.min.js"></script>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: transparent;
    padding: 0 4px;
    -webkit-user-select: none;
    user-select: none;
  }
  .chart-card {
    background: #fff;
    border-radius: 12px;
    margin-bottom: 12px;
    padding: 12px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  }
  .chart-title {
    font-size: 14px;
    font-weight: 700;
    color: #111827;
    margin-bottom: 2px;
  }
  .chart-sub {
    font-size: 11px;
    color: #9ca3af;
    margin-bottom: 8px;
  }
  .chart-container { width: 100%; }
  .empty-msg {
    height: 180px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #9ca3af;
    font-size: 13px;
  }
  .loading {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 300px;
    color: #9ca3af;
    font-size: 14px;
  }
</style>
</head>
<body>
<div id="root" class="loading">Loading charts...</div>

<script>
var GREEN = '#22c55e', AMBER = '#f59e0b', RED = '#ef4444', BLUE = '#3b82f6', GRAY = '#9ca3af';
var THRESHOLD_WARNING = 0.7, THRESHOLD_FLOOD = 0.5;

var LAYOUT_BASE = {
  font: { size: 10, color: '#374151' },
  margin: { l: 36, r: 8, t: 8, b: 28 },
  plot_bgcolor: 'transparent',
  paper_bgcolor: 'transparent',
  showlegend: true,
  legend: { orientation: 'h', y: 1.15, x: 0.5, xanchor: 'center', font: { size: 9 } },
  height: 240,
};

var CONFIG = { displayModeBar: false, responsive: true, staticPlot: false };

function renderCharts(analytics) {
  var ts = analytics.time_series || [];
  var hp = analytics.hourly_patterns || [];
  var da = analytics.daily_aggregates || [];
  var hasTS = ts.length >= 2;
  var hasDaily = da.length > 0;

  var statusCounts = {
    safe: ts.filter(function(p){ return p.status === 'SAFE'; }).length,
    warning: ts.filter(function(p){ return p.status === 'WARNING'; }).length,
    flood: ts.filter(function(p){ return p.status === 'FLOOD_WARNING'; }).length,
  };
  var hasAnyStatus = statusCounts.safe > 0 || statusCounts.warning > 0 || statusCounts.flood > 0;

  var html = '';

  // 1. Time Series
  html += '<div class="chart-card"><div class="chart-title">Water Level Over Time</div>';
  html += '<div class="chart-sub">All sensor readings with safety threshold zones</div>';
  if (hasTS) {
    html += '<div id="chart-ts" class="chart-container"></div>';
  } else {
    html += '<div class="empty-msg">Not enough data points</div>';
  }
  html += '</div>';

  // 2. Status Distribution
  html += '<div class="chart-card"><div class="chart-title">Status Distribution</div>';
  html += '<div class="chart-sub">SAFE vs WARNING vs FLOOD_WARNING</div>';
  if (hasAnyStatus) {
    html += '<div id="chart-status" class="chart-container"></div>';
  } else {
    html += '<div class="empty-msg">No readings to display</div>';
  }
  html += '</div>';

  // 3. Hourly Pattern
  html += '<div class="chart-card"><div class="chart-title">Hourly Water Level Pattern</div>';
  html += '<div class="chart-sub">Average water level by hour of day</div>';
  html += '<div id="chart-hourly" class="chart-container"></div></div>';

  // 4. Daily Range
  html += '<div class="chart-card"><div class="chart-title">Daily Water Level Range</div>';
  html += '<div class="chart-sub">Min / Avg / Max per day</div>';
  if (hasDaily) {
    html += '<div id="chart-daily" class="chart-container"></div>';
  } else {
    html += '<div class="empty-msg">No daily aggregates</div>';
  }
  html += '</div>';

  // 5. Unsafe per Day
  html += '<div class="chart-card"><div class="chart-title">Unsafe Readings per Day</div>';
  html += '<div class="chart-sub">Count of WARNING + FLOOD_WARNING</div>';
  if (hasDaily) {
    html += '<div id="chart-unsafe" class="chart-container"></div>';
  } else {
    html += '<div class="empty-msg">No daily data</div>';
  }
  html += '</div>';

  document.getElementById('root').innerHTML = html;

  // Render Time Series
  if (hasTS) {
    Plotly.newPlot('chart-ts', [
      {
        type: 'scatter', mode: 'lines+markers',
        x: ts.map(function(p){ return p.timestamp; }),
        y: ts.map(function(p){ return p.water_level_cm / 100; }),
        name: 'Water Level',
        line: { color: BLUE, width: 1.5 },
        marker: {
          size: 3,
          color: ts.map(function(p){
            return p.status === 'FLOOD_WARNING' ? RED : p.status === 'WARNING' ? AMBER : GREEN;
          }),
        },
        hovertemplate: '%{y:.2f} m<extra>%{x}</extra>',
      },
      {
        type: 'scatter', mode: 'lines',
        x: [ts[0].timestamp, ts[ts.length-1].timestamp],
        y: [THRESHOLD_FLOOD, THRESHOLD_FLOOD],
        name: 'CRITICAL', line: { color: RED, width: 2, dash: 'dash' }, hoverinfo: 'skip',
      },
      {
        type: 'scatter', mode: 'lines',
        x: [ts[0].timestamp, ts[ts.length-1].timestamp],
        y: [THRESHOLD_WARNING, THRESHOLD_WARNING],
        name: 'WARNING', line: { color: AMBER, width: 2, dash: 'dash' }, hoverinfo: 'skip',
      },
    ], Object.assign({}, LAYOUT_BASE, {
      yaxis: { rangemode: 'tozero', title: { text: 'm', font: { size: 10 } } },
      xaxis: { tickfont: { size: 8 } },
      hovermode: 'x',
      shapes: [
        { type: 'rect', xref: 'paper', yref: 'y', x0: 0, x1: 1, y0: 0, y1: THRESHOLD_FLOOD, fillcolor: 'rgba(239,68,68,0.08)', line: { width: 0 }, layer: 'below' },
        { type: 'rect', xref: 'paper', yref: 'y', x0: 0, x1: 1, y0: THRESHOLD_FLOOD, y1: THRESHOLD_WARNING, fillcolor: 'rgba(245,158,11,0.06)', line: { width: 0 }, layer: 'below' },
      ],
    }), CONFIG);
  }

  // Render Status Distribution
  if (hasAnyStatus) {
    Plotly.newPlot('chart-status', [{
      type: 'pie',
      labels: ['SAFE', 'WARNING', 'FLOOD WARNING'],
      values: [statusCounts.safe, statusCounts.warning, statusCounts.flood],
      marker: { colors: [GREEN, AMBER, RED] },
      hole: 0.45,
      textinfo: 'label+percent',
      textposition: 'outside',
      textfont: { size: 9 },
    }], Object.assign({}, LAYOUT_BASE, {
      height: 220,
      showlegend: false,
      margin: { l: 10, r: 10, t: 10, b: 10 },
    }), CONFIG);
  }

  // Render Hourly Pattern
  if (hp.length > 0) {
    Plotly.newPlot('chart-hourly', [{
      type: 'bar',
      x: hp.map(function(h){ return h.hour + ':00'; }),
      y: hp.map(function(h){ return h.avg_water_level_cm / 100; }),
      name: 'Average',
      marker: {
        color: hp.map(function(h){
          var v = h.avg_water_level_cm / 100;
          return v <= THRESHOLD_FLOOD ? RED : v <= THRESHOLD_WARNING ? AMBER : BLUE;
        }),
      },
    }], Object.assign({}, LAYOUT_BASE, {
      yaxis: { rangemode: 'tozero', title: { text: 'm', font: { size: 10 } } },
      xaxis: { tickfont: { size: 7 }, tickangle: -45, dtick: 3 },
      showlegend: false,
      hovermode: 'x',
    }), CONFIG);
  }

  // Render Daily Range
  if (hasDaily) {
    Plotly.newPlot('chart-daily', [
      {
        type: 'scatter', mode: 'lines+markers',
        x: da.map(function(d){ return d.date; }),
        y: da.map(function(d){ return d.avg_water_level_cm / 100; }),
        name: 'Average', line: { color: BLUE, width: 2 },
        marker: { size: 5, color: BLUE },
        fill: 'tozeroy', fillcolor: 'rgba(59,130,246,0.1)',
      },
      {
        type: 'scatter', mode: 'markers',
        x: da.map(function(d){ return d.date; }),
        y: da.map(function(d){ return d.max_water_level_cm / 100; }),
        name: 'Max', marker: { size: 4, color: RED, symbol: 'triangle-up' },
      },
      {
        type: 'scatter', mode: 'markers',
        x: da.map(function(d){ return d.date; }),
        y: da.map(function(d){ return d.min_water_level_cm / 100; }),
        name: 'Min', marker: { size: 4, color: GREEN, symbol: 'triangle-down' },
      },
    ], Object.assign({}, LAYOUT_BASE, {
      yaxis: { rangemode: 'tozero', title: { text: 'm', font: { size: 10 } } },
      xaxis: { tickfont: { size: 8 } },
      hovermode: 'x',
    }), CONFIG);
  }

  // Render Unsafe per Day
  if (hasDaily) {
    Plotly.newPlot('chart-unsafe', [{
      type: 'bar',
      x: da.map(function(d){ return d.date; }),
      y: da.map(function(d){ return d.unsafe_count; }),
      name: 'Unsafe',
      marker: {
        color: da.map(function(d){ return d.unsafe_count > 0 ? RED : GREEN; }),
      },
    }], Object.assign({}, LAYOUT_BASE, {
      yaxis: { rangemode: 'tozero' },
      xaxis: { tickfont: { size: 8 } },
      showlegend: false,
      hovermode: 'x',
    }), CONFIG);
  }

  // Notify RN that rendering is done
  try {
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'CHARTS_READY' }));
  } catch(e) {}
}

// Listen for data from React Native
document.addEventListener('message', function(e) {
  try {
    var msg = JSON.parse(typeof e.data === 'string' ? e.data : '{}');
    if (msg.type === 'LOAD_DATA' && msg.payload && msg.payload.analytics) {
      renderCharts(msg.payload.analytics);
    }
  } catch(err) {
    console.error('Chart message error:', err);
  }
});

// Also listen on window for iOS compatibility
window.addEventListener('message', function(e) {
  try {
    var msg = JSON.parse(typeof e.data === 'string' ? e.data : '{}');
    if (msg.type === 'LOAD_DATA' && msg.payload && msg.payload.analytics) {
      renderCharts(msg.payload.analytics);
    }
  } catch(err) {}
});

// Signal ready
document.addEventListener('DOMContentLoaded', function() {
  try {
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'WEBVIEW_READY' }));
  } catch(e) {}
});
</script>
</body>
</html>
`;

export default WATER_LEVEL_CHART_HTML;

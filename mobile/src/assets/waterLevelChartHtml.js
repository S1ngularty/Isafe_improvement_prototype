// Water Level Charts – Plotly.js WebView HTML bundle
// Renders: Time Series, Status Distribution, Hourly Pattern, Daily Range, Unsafe per Day
// Receives data via postMessage({ type: "LOAD_DATA", payload: { analytics } })

const WATER_LEVEL_CHART_HTML = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<script src="https://cdn.plot.ly/plotly-2.27.0.min.js"></script>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: #f9fafb;
    padding: 16px 12px;
    -webkit-user-select: none;
    user-select: none;
    max-width: 100vw;
    overflow-x: hidden;
  }
  .chart-card {
    background: #fff;
    border-radius: 14px;
    margin-bottom: 20px;
    padding: 16px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    width: 100%;
    display: flex;
    flex-direction: column;
  }
  .chart-header {
    margin-bottom: 12px;
    border-bottom: 1px solid #f3f4f6;
    padding-bottom: 8px;
  }
  .chart-title {
    font-size: 15px;
    font-weight: 700;
    color: #111827;
    margin-bottom: 4px;
  }
  .chart-sub {
    font-size: 11px;
    color: #6b7280;
    line-height: 1.4;
  }
  .chart-container { 
    width: 100%; 
    min-height: 280px;
    position: relative;
  }
  .empty-msg {
    min-height: 200px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #9ca3af;
    font-size: 13px;
    background: #f9fafb;
    border-radius: 8px;
    margin-top: 8px;
  }
  .loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 400px;
    color: #9ca3af;
    font-size: 14px;
  }
  .loading-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid #e5e7eb;
    border-top: 3px solid #3b82f6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 12px;
  }
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  @media (max-width: 400px) {
    body { padding: 12px 8px; }
    .chart-card { padding: 12px; margin-bottom: 16px; }
    .chart-title { font-size: 14px; }
  }
</style>
</head>
<body>
<div id="root" class="loading">
  <div class="loading-spinner"></div>
  <span>Loading charts...</span>
</div>

<script>
var COLORS = {
  green: '#22c55e',
  amber: '#f59e0b',
  red: '#ef4444',
  blue: '#3b82f6',
  gray: '#9ca3af',
  darkGray: '#374151',
  lightGray: '#f3f4f6'
};

var THRESHOLD_WARNING = 0.7;
var THRESHOLD_FLOOD = 0.5;

function getLayout(title, customOptions) {
  var base = {
    font: { size: 11, color: '#374151' },
    margin: { l: 50, r: 20, t: 10, b: 50 },
    plot_bgcolor: '#fafbfc',
    paper_bgcolor: '#ffffff',
    showlegend: true,
    legend: { 
      orientation: 'h', 
      y: -0.2, 
      x: 0.5, 
      xanchor: 'center',
      font: { size: 10 },
      bgcolor: 'rgba(255,255,255,0.8)',
      bordercolor: '#e5e7eb',
      borderwidth: 1
    },
    height: 300,
    hovermode: 'closest',
    hoverlabel: {
      bgcolor: '#1f2937',
      font: { color: '#ffffff', size: 11 },
      bordercolor: '#1f2937'
    }
  };
  
  return Object.assign({}, base, customOptions || {});
}

var CONFIG = { 
  displayModeBar: false, 
  responsive: true,
  staticPlot: false,
  displaylogo: false,
  toImageButtonOptions: {
    format: 'png',
    filename: 'water_level_chart',
    height: 500,
    width: 700,
    scale: 2
  }
};

function renderCharts(analytics) {
  var root = document.getElementById('root');
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

  // 1. Time Series Chart
  html += '<div class="chart-card">';
  html += '<div class="chart-header">';
  html += '<div class="chart-title">Water Level Trends</div>';
  html += '<div class="chart-sub">Real-time sensor readings with safety threshold indicators</div>';
  html += '</div>';
  if (hasTS) {
    html += '<div id="chart-ts" class="chart-container"></div>';
  } else {
    html += '<div class="empty-msg">Not enough data points to display trend</div>';
  }
  html += '</div>';

  // 2. Status Distribution
  html += '<div class="chart-card">';
  html += '<div class="chart-header">';
  html += '<div class="chart-title">Status Distribution</div>';
  html += '<div class="chart-sub">Current sensor status breakdown (SAFE, WARNING, FLOOD)</div>';
  html += '</div>';
  if (hasAnyStatus) {
    html += '<div id="chart-status" class="chart-container"></div>';
  } else {
    html += '<div class="empty-msg">No status data available</div>';
  }
  html += '</div>';

  // 3. Hourly Pattern
  html += '<div class="chart-card">';
  html += '<div class="chart-header">';
  html += '<div class="chart-title">Hourly Water Level Pattern</div>';
  html += '<div class="chart-sub">Average water level by hour of day across all sensors</div>';
  html += '</div>';
  html += '<div id="chart-hourly" class="chart-container"></div>';
  html += '</div>';

  // 4. Daily Range
  html += '<div class="chart-card">';
  html += '<div class="chart-header">';
  html += '<div class="chart-title">Daily Water Level Range</div>';
  html += '<div class="chart-sub">Minimum, average, and maximum water levels per day</div>';
  html += '</div>';
  if (hasDaily) {
    html += '<div id="chart-daily" class="chart-container"></div>';
  } else {
    html += '<div class="empty-msg">No daily aggregate data available</div>';
  }
  html += '</div>';

  // 5. Unsafe Readings per Day
  html += '<div class="chart-card">';
  html += '<div class="chart-header">';
  html += '<div class="chart-title">Unsafe Readings per Day</div>';
  html += '<div class="chart-sub">Daily count of WARNING and FLOOD_WARNING readings</div>';
  html += '</div>';
  if (hasDaily) {
    html += '<div id="chart-unsafe" class="chart-container"></div>';
  } else {
    html += '<div class="empty-msg">No unsafe reading data available</div>';
  }
  html += '</div>';

  // 6. Float Switch History
  var fsData = ts.filter(function(p){ return p.float_switch_1m !== null || p.float_switch_2m !== null; });
  var hasFS = fsData.length > 0;
  html += '<div class="chart-card">';
  html += '<div class="chart-header">';
  html += '<div class="chart-title">Float Switch History</div>';
  html += '<div class="chart-sub">1m and 2m float switch state over time</div>';
  html += '</div>';
  if (hasFS) {
    html += '<div id="chart-float-switch" class="chart-container"></div>';
  } else {
    html += '<div class="empty-msg">No float switch data available</div>';
  }
  html += '</div>';

  root.innerHTML = html;

  // Render Time Series
  if (hasTS) {
    var tsTrace1 = {
      type: 'scatter', 
      mode: 'lines+markers',
      x: ts.map(function(p){ return p.timestamp; }),
      y: ts.map(function(p){ return p.water_level_cm / 100; }),
      name: 'Water Level (m)',
      line: { color: COLORS.blue, width: 2.5 },
      marker: {
        size: 5,
        color: ts.map(function(p){
          return p.status === 'FLOOD_WARNING' ? COLORS.red : 
                 p.status === 'WARNING' ? COLORS.amber : COLORS.green;
        }),
        line: { width: 1, color: '#ffffff' }
      },
      hovertemplate: '<b>%{y:.3f}m</b><br>%{x}<extra></extra>',
    };

    var tsTrace2 = {
      type: 'scatter', 
      mode: 'lines',
      x: [ts[0].timestamp, ts[ts.length-1].timestamp],
      y: [THRESHOLD_FLOOD, THRESHOLD_FLOOD],
      name: 'Critical Level',
      line: { color: COLORS.red, width: 2, dash: 'dash' }, 
      hoverinfo: 'text',
      hovertext: 'Critical threshold: ' + THRESHOLD_FLOOD + 'm'
    };

    var tsTrace3 = {
      type: 'scatter', 
      mode: 'lines',
      x: [ts[0].timestamp, ts[ts.length-1].timestamp],
      y: [THRESHOLD_WARNING, THRESHOLD_WARNING],
      name: 'Warning Level',
      line: { color: COLORS.amber, width: 2, dash: 'dash' }, 
      hoverinfo: 'text',
      hovertext: 'Warning threshold: ' + THRESHOLD_WARNING + 'm'
    };

    Plotly.newPlot('chart-ts', [tsTrace1, tsTrace2, tsTrace3], getLayout('Time Series', {
      yaxis: { 
        title: { text: 'Water Level (m)', font: { size: 12, weight: 'bold' } },
        rangemode: 'tozero',
        gridcolor: '#e5e7eb',
        zerolinecolor: '#d1d5db',
        tickfont: { size: 10 }
      },
      xaxis: { 
        title: { text: 'Time', font: { size: 12, weight: 'bold' } },
        tickfont: { size: 10 }, 
        gridcolor: '#e5e7eb',
        tickangle: -30
      },
      shapes: [
        { 
          type: 'rect', xref: 'paper', yref: 'y', 
          x0: 0, x1: 1, y0: 0, y1: THRESHOLD_FLOOD, 
          fillcolor: 'rgba(239,68,68,0.08)', 
          line: { width: 0 }, layer: 'below' 
        },
        { 
          type: 'rect', xref: 'paper', yref: 'y', 
          x0: 0, x1: 1, y0: THRESHOLD_FLOOD, y1: THRESHOLD_WARNING, 
          fillcolor: 'rgba(245,158,11,0.06)', 
          line: { width: 0 }, layer: 'below' 
        },
      ],
      annotations: [
        {
          x: ts[Math.floor(ts.length/2)].timestamp,
          y: THRESHOLD_FLOOD,
          text: 'Critical',
          showarrow: false,
          font: { size: 9, color: COLORS.red },
          xanchor: 'center',
          yanchor: 'bottom'
        },
        {
          x: ts[Math.floor(ts.length/2)].timestamp,
          y: THRESHOLD_WARNING,
          text: 'Warning',
          showarrow: false,
          font: { size: 9, color: COLORS.amber },
          xanchor: 'center',
          yanchor: 'bottom'
        }
      ]
    }), CONFIG);
  }

  // Render Status Distribution
  if (hasAnyStatus) {
    Plotly.newPlot('chart-status', [{
      type: 'pie',
      labels: ['SAFE', 'WARNING', 'FLOOD WARNING'],
      values: [statusCounts.safe, statusCounts.warning, statusCounts.flood],
      marker: { 
        colors: [COLORS.green, COLORS.amber, COLORS.red],
        line: { color: '#ffffff', width: 2 }
      },
      hole: 0.5,
      textinfo: 'label+percent',
      textposition: 'outside',
      textfont: { size: 11 },
      pull: [0, 0.05, 0.1],
      hoverinfo: 'label+value+percent',
      hovertemplate: '<b>%{label}</b><br>Count: %{value}<br>Percentage: %{percent}<extra></extra>'
    }], getLayout('Status', {
      height: 320,
      showlegend: false,
      margin: { l: 20, r: 20, t: 20, b: 20 },
      annotations: [{
        font: { size: 16, weight: 'bold' },
        showarrow: false,
        text: 'SENSOR<br>STATUS',
        x: 0.5,
        y: 0.5
      }]
    }), CONFIG);
  }

  // Render Hourly Pattern
  if (hp.length > 0) {
    var hourlyColors = hp.map(function(h){
      var v = h.avg_water_level_cm / 100;
      return v <= THRESHOLD_FLOOD ? COLORS.red : 
             v <= THRESHOLD_WARNING ? COLORS.amber : COLORS.blue;
    });

    Plotly.newPlot('chart-hourly', [{
      type: 'bar',
      x: hp.map(function(h){ 
        return String(h.hour).padStart(2, '0') + ':00'; 
      }),
      y: hp.map(function(h){ return h.avg_water_level_cm / 100; }),
      name: 'Average Water Level',
      marker: {
        color: hourlyColors,
        line: { color: '#ffffff', width: 1 }
      },
      text: hp.map(function(h){ 
        return (h.avg_water_level_cm / 100).toFixed(3) + 'm'; 
      }),
      textposition: 'outside',
      textfont: { size: 9 },
      hovertemplate: '<b>%{x}</b><br>Level: %{y:.3f}m<extra></extra>',
    }], getLayout('Hourly', {
      yaxis: { 
        title: { text: 'Water Level (m)', font: { size: 12, weight: 'bold' } },
        rangemode: 'tozero',
        gridcolor: '#e5e7eb',
        tickfont: { size: 10 }
      },
      xaxis: { 
        title: { text: 'Hour of Day', font: { size: 12, weight: 'bold' } },
        tickfont: { size: 10 }, 
        tickangle: -45, 
        dtick: 3,
        gridcolor: '#e5e7eb'
      },
      showlegend: false,
      shapes: [
        {
          type: 'line',
          xref: 'paper',
          x0: 0,
          x1: 1,
          y0: THRESHOLD_WARNING,
          y1: THRESHOLD_WARNING,
          line: { color: COLORS.amber, width: 1.5, dash: 'dash' },
          layer: 'above'
        },
        {
          type: 'line',
          xref: 'paper',
          x0: 0,
          x1: 1,
          y0: THRESHOLD_FLOOD,
          y1: THRESHOLD_FLOOD,
          line: { color: COLORS.red, width: 1.5, dash: 'dash' },
          layer: 'above'
        }
      ]
    }), CONFIG);
  } else {
    document.getElementById('chart-hourly').innerHTML = '<div class="empty-msg">No hourly pattern data available</div>';
  }

  // Render Daily Range
  if (hasDaily) {
    Plotly.newPlot('chart-daily', [
      {
        type: 'scatter', 
        mode: 'lines+markers',
        x: da.map(function(d){ return d.date; }),
        y: da.map(function(d){ return d.avg_water_level_cm / 100; }),
        name: 'Average Level',
        line: { color: COLORS.blue, width: 3 },
        marker: { size: 7, color: COLORS.blue, symbol: 'circle' },
        fill: 'tozeroy', 
        fillcolor: 'rgba(59,130,246,0.15)',
        hovertemplate: '<b>Average: %{y:.3f}m</b><br>%{x}<extra></extra>',
      },
      {
        type: 'scatter', 
        mode: 'markers+lines',
        x: da.map(function(d){ return d.date; }),
        y: da.map(function(d){ return d.max_water_level_cm / 100; }),
        name: 'Maximum Level',
        marker: { size: 8, color: COLORS.red, symbol: 'triangle-up' },
        line: { color: COLORS.red, width: 1, dash: 'dot' },
        hovertemplate: '<b>Maximum: %{y:.3f}m</b><br>%{x}<extra></extra>',
      },
      {
        type: 'scatter', 
        mode: 'markers+lines',
        x: da.map(function(d){ return d.date; }),
        y: da.map(function(d){ return d.min_water_level_cm / 100; }),
        name: 'Minimum Level',
        marker: { size: 8, color: COLORS.green, symbol: 'triangle-down' },
        line: { color: COLORS.green, width: 1, dash: 'dot' },
        hovertemplate: '<b>Minimum: %{y:.3f}m</b><br>%{x}<extra></extra>',
      },
    ], getLayout('Daily', {
      yaxis: { 
        title: { text: 'Water Level (m)', font: { size: 12, weight: 'bold' } },
        rangemode: 'tozero',
        gridcolor: '#e5e7eb',
        tickfont: { size: 10 }
      },
      xaxis: { 
        title: { text: 'Date', font: { size: 12, weight: 'bold' } },
        tickfont: { size: 10 },
        gridcolor: '#e5e7eb',
        tickangle: -30
      },
    }), CONFIG);
  }

  // Render Unsafe per Day
  if (hasDaily) {
    Plotly.newPlot('chart-unsafe', [{
      type: 'bar',
      x: da.map(function(d){ return d.date; }),
      y: da.map(function(d){ return d.unsafe_count || 0; }),
      name: 'Unsafe Readings',
      marker: {
        color: da.map(function(d){ 
          return (d.unsafe_count || 0) > 0 ? COLORS.red : COLORS.green; 
        }),
        line: { color: '#ffffff', width: 1 }
      },
      text: da.map(function(d){ return d.unsafe_count || 0; }),
      textposition: 'outside',
      textfont: { size: 11, weight: 'bold' },
      hovertemplate: '<b>Unsafe: %{y}</b><br>%{x}<extra></extra>',
    }], getLayout('Unsafe', {
      yaxis: { 
        title: { text: 'Count', font: { size: 12, weight: 'bold' } },
        rangemode: 'tozero',
        tickformat: 'd',
        gridcolor: '#e5e7eb',
        tickfont: { size: 10 }
      },
      xaxis: { 
        title: { text: 'Date', font: { size: 12, weight: 'bold' } },
        tickfont: { size: 10 },
        gridcolor: '#e5e7eb',
        tickangle: -30
      },
      showlegend: false,
    }), CONFIG);
  }

  // Render Float Switch History
  if (hasFS) {
    var fsTrace1 = {
      type: 'scatter',
      mode: 'lines+markers',
      x: fsData.map(function(p){ return p.timestamp; }),
      y: fsData.map(function(p){ return p.float_switch_1m ? 1 : 0; }),
      name: '1m Switch',
      line: { shape: 'hv', color: '#6366f1', width: 2 },
      marker: {
        size: 5,
        color: fsData.map(function(p){
          return p.float_switch_1m ? COLORS.red : COLORS.gray;
        }),
        line: { width: 1, color: '#ffffff' },
      },
      hovertemplate: '<b>1m: %{customdata}</b><br>%{x}<extra></extra>',
      customdata: fsData.map(function(p){
        return p.float_switch_1m ? 'Triggered' : 'At Rest';
      }),
    };

    var fsTrace2 = {
      type: 'scatter',
      mode: 'lines+markers',
      x: fsData.map(function(p){ return p.timestamp; }),
      y: fsData.map(function(p){ return p.float_switch_2m ? 3 : 2; }),
      name: '2m Switch',
      line: { shape: 'hv', color: COLORS.red, width: 2 },
      marker: {
        size: 5,
        color: fsData.map(function(p){
          return p.float_switch_2m ? COLORS.red : COLORS.gray;
        }),
        symbol: 'diamond',
        line: { width: 1, color: '#ffffff' },
      },
      hovertemplate: '<b>2m: %{customdata}</b><br>%{x}<extra></extra>',
      customdata: fsData.map(function(p){
        return p.float_switch_2m ? 'Triggered' : 'At Rest';
      }),
    };

    Plotly.newPlot('chart-float-switch', [fsTrace1, fsTrace2], getLayout('Float Switch', {
      yaxis: {
        tickvals: [0, 1, 2, 3],
        ticktext: ['1m At Rest', '1m Triggered', '2m At Rest', '2m Triggered'],
        range: [-0.15, 3.15],
        gridcolor: '#e5e7eb',
        tickfont: { size: 10 }
      },
      xaxis: {
        title: { text: 'Time', font: { size: 12, weight: 'bold' } },
        tickfont: { size: 10 },
        gridcolor: '#e5e7eb',
        tickangle: -30,
      },
      hovermode: 'x unified',
    }), CONFIG);
  }

  // Calculate total height and notify React Native
  setTimeout(function() {
    var totalHeight = root.scrollHeight + 40;
    try {
      window.ReactNativeWebView.postMessage(JSON.stringify({ 
        type: 'CHARTS_READY',
        height: totalHeight
      }));
    } catch(e) {}
  }, 500);
}

// Listen for data from React Native
function handleMessage(event) {
  try {
    var msg = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
    if (msg.type === 'LOAD_DATA' && msg.payload && msg.payload.analytics) {
      renderCharts(msg.payload.analytics);
    }
  } catch(err) {
    console.error('Chart message error:', err);
  }
}

document.addEventListener('message', handleMessage);
window.addEventListener('message', handleMessage);

// Signal ready
window.addEventListener('load', function() {
  try {
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'WEBVIEW_READY' }));
  } catch(e) {}
});

// Handle orientation changes
window.addEventListener('resize', function() {
  var chartIds = ['chart-ts', 'chart-status', 'chart-hourly', 'chart-daily', 'chart-unsafe', 'chart-float-switch'];
  chartIds.forEach(function(id) {
    var el = document.getElementById(id);
    if (el && el._fullLayout) {
      Plotly.relayout(id, {
        'xaxis.tickangle': window.innerWidth < 400 ? -45 : -30,
        'xaxis.tickfont.size': window.innerWidth < 400 ? 8 : 10
      });
    }
  });
});
</script>
</body>
</html>
`;

export default WATER_LEVEL_CHART_HTML;
/**
 * Self-contained Leaflet HTML for rendering flood hazard GeoJSON polygons.
 * Uses the Leaflet CDN for the map library.
 * Communicates with React Native via postMessage / addEventListener('message').
 */
const FLOOD_HAZARD_MAP_HTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script>
<style>
  body { margin:0; padding:0; background:#1a1a1a; }
  #map { position:absolute; top:0; bottom:0; width:100%; }
  .leaflet-control-zoom a { background:#1a1a1a; color:#fff; border-color:#333; }
  .leaflet-control-zoom a:hover { background:#333; }
  .info-popup { font-size:12px; line-height:1.5; }
  .info-popup b { font-size:13px; }
</style>
</head>
<body>
<div id="map"></div>
<script>
var RISK_COLORS = {
  "Very High": "#67000d",
  "High": "#a50f15",
  "Moderate": "#ef3b2d",
  "Low": "#fc9272",
  "None": "#fee0d2"
};

var SATELLITE_URL = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
var OSM_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

var map = L.map("map", {
  center: [13.99, 122.52],
  zoom: 11,
  zoomControl: true,
  attributionControl: false
});

var basemapLayer = L.tileLayer(SATELLITE_URL, { maxZoom: 18 }).addTo(map);

var geoLayer = null;
var summaryData = null;
var selectedBarangay = null;
var currentOpacity = 0.65;
var currentBasemap = "satellite";

function getStyle(feature) {
  var name = (feature.properties && (feature.properties.barangay || feature.properties.NAME_3)) || "";
  var s = null;
  if (summaryData) {
    for (var i = 0; i < summaryData.length; i++) {
      if (summaryData[i].barangay === name) { s = summaryData[i]; break; }
    }
  }
  var color = s ? (RISK_COLORS[s.risk_level] || "#fee0d2") : "#fee0d2";
  var isSelected = selectedBarangay === name;
  return {
    fillColor: color,
    fillOpacity: currentOpacity,
    weight: isSelected ? 3 : 0.8,
    color: isSelected ? "#fff" : "#555",
    dashArray: isSelected ? "" : "1 1"
  };
}

function onEachFeature(feature, layer) {
  var name = (feature.properties && (feature.properties.barangay || feature.properties.NAME_3)) || "Unknown";
  layer.on("click", function() {
    selectedBarangay = (selectedBarangay === name) ? null : name;
    if (geoLayer) geoLayer.setStyle(getStyle);
    try {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: "SELECT_BARANGAY", name: selectedBarangay }));
    } catch(e) {}
  });

  // Tooltip
  var s = null;
  if (summaryData) {
    for (var i = 0; i < summaryData.length; i++) {
      if (summaryData[i].barangay === name) { s = summaryData[i]; break; }
    }
  }
  var pct = s && s.pct_total_hazard !== null ? s.pct_total_hazard.toFixed(1) + "%" : "N/A";
  var risk = s ? s.risk_level : "Unknown";
  layer.bindTooltip("<div class='info-popup'><b>" + name + "</b><br/>Risk: " + risk + "<br/>Hazard: " + pct + "</div>", { sticky: true });
}

function loadData(payload) {
  summaryData = payload.summary || [];
  var geojson = payload.geojson;

  if (geoLayer) {
    map.removeLayer(geoLayer);
    geoLayer = null;
  }

  if (geojson && geojson.features && geojson.features.length > 0) {
    geoLayer = L.geoJSON(geojson, {
      style: getStyle,
      onEachFeature: onEachFeature
    }).addTo(map);

    var bounds = geoLayer.getBounds();
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [10, 10] });
    }
  }
}

function selectBarangay(name) {
  selectedBarangay = name;
  if (geoLayer) geoLayer.setStyle(getStyle);
}

function setOpacity(opacity) {
  currentOpacity = opacity;
  if (geoLayer) geoLayer.setStyle(getStyle);
}

function setBasemap(type) {
  currentBasemap = type;
  if (basemapLayer) map.removeLayer(basemapLayer);
  var url = type === "street" ? OSM_URL : SATELLITE_URL;
  basemapLayer = L.tileLayer(url, { maxZoom: 18 }).addTo(map);
  // Re-add geoLayer to ensure it's on top
  if (geoLayer) {
    geoLayer.bringToFront();
  }
}

// Listen for messages from React Native
document.addEventListener("message", function(e) {
  try {
    var msg = JSON.parse(e.data);
    if (msg.type === "LOAD_DATA") loadData(msg.payload);
    if (msg.type === "SELECT") selectBarangay(msg.name);
    if (msg.type === "SET_OPACITY") setOpacity(msg.opacity);
    if (msg.type === "SET_BASEMAP") setBasemap(msg.basemap);
  } catch(err) {}
});
window.addEventListener("message", function(e) {
  try {
    var msg = JSON.parse(e.data);
    if (msg.type === "LOAD_DATA") loadData(msg.payload);
    if (msg.type === "SELECT") selectBarangay(msg.name);
    if (msg.type === "SET_OPACITY") setOpacity(msg.opacity);
    if (msg.type === "SET_BASEMAP") setBasemap(msg.basemap);
  } catch(err) {}
});
</script>
</body>
</html>`;

export default FLOOD_HAZARD_MAP_HTML;

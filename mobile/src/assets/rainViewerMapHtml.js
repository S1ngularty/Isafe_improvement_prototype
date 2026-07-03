/**
 * Self-contained Leaflet HTML for rendering RainViewer radar animation.
 * Uses Leaflet CDN. Dark basemap centered on Philippines.
 * Communicates with React Native via postMessage / addEventListener('message').
 */
const RAIN_VIEWER_MAP_HTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script>
<style>
  body { margin:0; padding:0; background:#111; }
  #map { position:absolute; top:0; bottom:0; width:100%; }
  .leaflet-control-zoom a { background:#1a1a1a; color:#fff; border-color:#333; }
  .leaflet-control-zoom a:hover { background:#333; }
</style>
</head>
<body>
<div id="map"></div>
<script>
var DARK_URL = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
var map = L.map("map", {
  center: [12.8, 121.7],
  zoom: 6,
  maxZoom: 10,
  zoomControl: true,
  attributionControl: false
});
L.tileLayer(DARK_URL, { maxZoom: 10 }).addTo(map);

var radarLayer = null;
var frames = [];
var currentFrame = 0;
var playing = true;
var opacity = 0.6;
var intervalId = null;

function updateRadar() {
  if (!radarLayer || frames.length === 0 || currentFrame >= frames.length) return;
  radarLayer.setUrl(frames[currentFrame].tile_url);
  radarLayer.setOpacity(opacity);
  sendStatus();
}

function sendStatus() {
  try {
    var f = frames[currentFrame];
    window.ReactNativeWebView.postMessage(JSON.stringify({
      type: "FRAME_UPDATE",
      currentFrame: currentFrame,
      totalFrames: frames.length,
      timestamp: f ? f.time : 0,
      playing: playing
    }));
  } catch(e) {}
}

function startAnimation() {
  stopAnimation();
  if (frames.length === 0) return;
  intervalId = setInterval(function() {
    currentFrame = (currentFrame + 1) % frames.length;
    updateRadar();
  }, 600);
  playing = true;
  sendStatus();
}

function stopAnimation() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  playing = false;
  sendStatus();
}

function loadFrames(data) {
  frames = data.frames || [];
  currentFrame = 0;

  if (radarLayer) {
    map.removeLayer(radarLayer);
    radarLayer = null;
  }

  if (frames.length > 0) {
    radarLayer = L.tileLayer(frames[0].tile_url, {
      opacity: opacity,
      maxZoom: 10,
      maxNativeZoom: 10,
      zIndex: 10
    }).addTo(map);
    startAnimation();
  }
}

function handleMessage(msg) {
  switch(msg.type) {
    case "LOAD_FRAMES":
      loadFrames(msg.payload);
      break;
    case "PLAY":
      startAnimation();
      break;
    case "PAUSE":
      stopAnimation();
      break;
    case "SEEK":
      currentFrame = Math.max(0, Math.min(msg.frame, frames.length - 1));
      updateRadar();
      break;
    case "SET_OPACITY":
      opacity = msg.value;
      if (radarLayer) radarLayer.setOpacity(opacity);
      break;
  }
}

document.addEventListener("message", function(e) {
  try { handleMessage(JSON.parse(e.data)); } catch(err) {}
});
window.addEventListener("message", function(e) {
  try { handleMessage(JSON.parse(e.data)); } catch(err) {}
});
<\/script>
</body>
</html>`;

export default RAIN_VIEWER_MAP_HTML;

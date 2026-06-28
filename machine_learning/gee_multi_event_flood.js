// ─────────────────────────────────────────────────────────────
// Google Earth Engine — Multi-event flood dataset generator
// Paste into code.earthengine.google.com and run
// ─────────────────────────────────────────────────────────────

// 1. Tagkawayan bounding area (approximate)
var tagkawayan = ee.Geometry.Polygon([[
  [122.30, 13.90], [122.55, 13.90], [122.55, 14.10], [122.30, 14.10]
]]);

// 2. Known typhoon dates (add more from PAGASA archives)
var events = [
  { name: "Kristine",  start: "2024-10-22", end: "2024-10-27" },
  { name: "Enteng",    start: "2024-09-01", end: "2024-09-04" },
  { name: "Carina",    start: "2024-07-21", end: "2024-07-25" },
  { name: "Goring",    start: "2023-08-24", end: "2023-08-30" },
  { name: "Paeng",     start: "2022-10-28", end: "2022-10-30" },
  { name: "Karding",   start: "2022-09-25", end: "2022-09-27" },
  { name: "Odette",    start: "2021-12-16", end: "2021-12-18" },
  { name: "Ulysses",   start: "2020-11-11", end: "2020-11-13" },
  { name: "Rolly",     start: "2020-10-31", end: "2020-11-02" },
];

// 3. Setup — load elevation once
var elevImg = ee.Image("USGS/SRTMGL1_003").select("elevation");

// 4. Flood mapping — returns image with bands [elevation, slope, aspect, EventName]
function mapEventFlood(event, idx) {
  var pre = ee.ImageCollection("COPERNICUS/S1_GRD")
    .filterBounds(tagkawayan)
    .filterDate(ee.Date(event.start).advance(-14, "day"), event.start)
    .filter(ee.Filter.listContains("transmitterReceiverPolarisation", "VV"))
    .filter(ee.Filter.eq("instrumentMode", "IW"))
    .select("VV");

  var post = ee.ImageCollection("COPERNICUS/S1_GRD")
    .filterBounds(tagkawayan)
    .filterDate(event.start, event.end)
    .filter(ee.Filter.listContains("transmitterReceiverPolarisation", "VV"))
    .filter(ee.Filter.eq("instrumentMode", "IW"))
    .select("VV");

  // Fallback if no imagery — avoids crash
  var preMosaic = ee.Image(ee.Algorithms.If(
    pre.size().gt(0), pre.mosaic(), ee.Image.constant(0).rename("VV")
  ));
  var postMosaic = ee.Image(ee.Algorithms.If(
    post.size().gt(0), post.mosaic(), ee.Image.constant(0).rename("VV")
  ));

  var diff = ee.Image(preMosaic).subtract(ee.Image(postMosaic));
  var flood = diff.gt(2.5).rename(event.name);

  var slope = ee.Terrain.slope(elevImg).rename("slope");
  var aspect = ee.Terrain.aspect(elevImg).rename("aspect");

  return elevImg.addBands(slope).addBands(aspect).addBands(flood).clip(tagkawayan);
}

// 5. Build composite — one band per event
var images = events.map(function(e, i) { return mapEventFlood(e, i); });
var composite = images[0];
for (var i = 1; i < images.length; i++) {
  composite = composite.addBands(images[i]);
}

// 6. Summary flood labels
var floodBandNames = events.map(function(e) { return e.name; });
var floodCount = composite.select(floodBandNames).reduce(ee.Reducer.sum()).rename("flood_count");
var anyFlood = floodCount.gte(1).rename("flood_label");
var finalImage = composite.addBands(floodCount).addBands(anyFlood);

// 7. Sample 2000 points across Tagkawayan
var samples = finalImage.sample({
  region: tagkawayan,
  scale: 30,
  numPixels: 2000,
  geometries: true
});

// 8. Export
Export.table.toDrive({
  collection: samples,
  description: "tagkawayan_multievent_training",
  fileFormat: "CSV",
  folder: "EarthEngine",
  selectors: [".geo", "elevation", "slope", "aspect"].concat(floodBandNames).concat(["flood_count", "flood_label"])
});

print("Total samples:", samples.size());
print("Flood bands:", floodBandNames);
print("\u2705 CSV will be sent to Google Drive > EarthEngine folder");

// Uncomment to preview:
// Map.centerObject(tagkawayan, 11);
// Map.addLayer(tagkawayan, {}, "Tagkawayan");
// Map.addLayer(composite.select("Kristine").selfMask(), {palette: "red"}, "Kristine flood");

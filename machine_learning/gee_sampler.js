// ─────────────────────────────────────────────────────────────
// GEE — Sample terrain features for Tagkawayan
// Paste into code.earthengine.google.com and Run
// Output: Google Drive > EarthEngine > tagkawayan_terrain_samples.csv
// ─────────────────────────────────────────────────────────────

var bounds = ee.Geometry.Polygon([[
  [122.35, 13.80], [122.70, 13.80], [122.70, 14.15], [122.35, 14.15]
]]);

var srtm = ee.Image("USGS/SRTMGL1_003");

var stack = srtm.select("elevation")
  .addBands(ee.Terrain.slope(srtm).rename("slope"))
  .addBands(ee.Terrain.aspect(srtm).rename("aspect"))
  .addBands(ee.ImageCollection("UCSB-CHG/CHIRPS/DAILY")
    .filterDate("2024-01-01", "2024-12-31")
    .filterBounds(bounds)
    .max()
    .rename("rainfall_max"))
  .addBands(ee.ImageCollection("UCSB-CHG/CHIRPS/DAILY")
    .filterDate("2024-01-01", "2024-12-31")
    .filterBounds(bounds)
    .mean()
    .rename("rainfall_mean"))
  .addBands(ee.Image("ESA/WorldCover/v200/2024")
    .select("Map").rename("landcover"))
  .clip(bounds);

var samples = stack.sample({
  region: bounds,
  scale: 30,
  numPixels: 3000,
  seed: 42,
  geometries: true
});

Export.table.toDrive({
  collection: samples,
  description: "tagkawayan_terrain_samples",
  fileFormat: "CSV",
  folder: "EarthEngine",
  selectors: [".geo", "elevation", "slope", "aspect",
              "rainfall_max", "rainfall_mean", "landcover"]
});

print("Samples:", samples.size());
Map.centerObject(bounds, 11);
Map.addLayer(bounds, {color: "red"}, "Tagkawayan");

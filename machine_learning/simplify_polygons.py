import json, os, geopandas as gpd

barrios = gpd.read_file("tagkawayan_barangays.geojson")
hazard = gpd.read_file("PH045600000_FH_100yr.shp")

mh = hazard[hazard["Var"] >= 2].copy()
if mh.crs != barrios.crs:
    mh = mh.to_crs(barrios.crs)

clipped = gpd.clip(mh, barrios)
clipped["geometry"] = clipped.geometry.simplify(0.0001)
clipped["hazard_level"] = clipped["Var"].map({2: "Medium", 3: "High"})

gj = json.loads(clipped.to_json())
outpath = "../website/public/data/flood_hazard_polygons.json"
with open(outpath, "w") as f:
    json.dump(gj, f)

size_kb = os.path.getsize(outpath) / 1024
print(f"Simplified: {len(gj['features'])} features, {size_kb:.0f} KB")

import json, os, math
import pandas as pd
import geopandas as gpd

def safe_val(v):
    if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
        return None
    if isinstance(v, pd.Float64Dtype):
        return None if pd.isna(v) else v
    return None if v is None or v != v else v

# Summary
df = pd.read_csv("tagkawayan_flood_hazard_summary.csv")
records = []
for _, row in df.iterrows():
    rec = {}
    for c in df.columns:
        v = row[c]
        if isinstance(v, float):
            if math.isnan(v) or math.isinf(v):
                rec[c] = None
            else:
                rec[c] = v
        elif pd.isna(v):
            rec[c] = None
        else:
            rec[c] = v
    records.append(rec)

summary = {"data": records, "last_updated": None}
out = "../website/public/data/flood_hazard_summary.json"
with open(out, "w") as f:
    json.dump(summary, f)
print(f"Summary: {len(records)} rows -> {os.path.getsize(out) / 1024:.0f} KB")

# GeoJSON
barrios = gpd.read_file("tagkawayan_barangays.geojson")
barrios["barangay"] = barrios["NAME_3"]
gj = json.loads(barrios.to_json())
for f in gj["features"]:
    f["properties"]["barangay"] = f["properties"].get("NAME_3", "")

out = "../website/public/data/flood_hazard_geojson.json"
with open(out, "w") as f:
    json.dump(gj, f)
print(f"GeoJSON: {len(gj['features'])} features -> {os.path.getsize(out) / 1024:.0f} KB")

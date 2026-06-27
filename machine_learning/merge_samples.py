import json
import numpy as np
import pandas as pd
import geopandas as gpd
from shapely.geometry import Point

# 1. Load GEE terrain samples (from Google Drive)
print("Loading GEE terrain samples...")
terrain = pd.read_csv("tagkawayan_terrain_samples.csv")
print(f"  Terrain samples: {len(terrain)} rows")

# Parse coordinates from .geo column
geo = terrain[".geo"].apply(json.loads)
terrain["lng"] = geo.apply(lambda g: g["coordinates"][0])
terrain["lat"] = geo.apply(lambda g: g["coordinates"][1])

# 2. Load original flood dataset
print("Loading flood labels...")
flood = pd.read_csv("tagkawayan_flood_dataset_final.csv")
print(f"  Flood samples: {len(flood)} rows")

geo_f = flood[".geo"].apply(json.loads)
flood["lng"] = geo_f.apply(lambda g: g["coordinates"][0])
flood["lat"] = geo_f.apply(lambda g: g["coordinates"][1])

# 3. Load barangay polygons
print("Loading barangay polygons...")
barrios = gpd.read_file("tagkawayan_barangays.geojson")

# 4. Spatial join: assign each terrain point to nearest flood point
#    Use KDTree for efficient nearest-neighbor matching
from scipy.spatial import cKDTree

flood_coords = np.radians(flood[["lat", "lng"]].values)
terrain_coords = np.radians(terrain[["lat", "lng"]].values)

tree = cKDTree(flood_coords)
distances, indices = tree.query(terrain_coords, k=1)

terrain["flood"] = flood.iloc[indices]["flood"].values
terrain["dist_to_flood"] = distances * 111000  # convert radians to meters

# Only assign flood = 1 if within 60m of a known flood point
terrain["flood"] = np.where(terrain["dist_to_flood"] < 60, terrain["flood"], 0)

# 5. Spatial join to barangays
terrain_geo = gpd.GeoDataFrame(
    terrain,
    geometry=gpd.points_from_xy(terrain["lng"], terrain["lat"]),
    crs="EPSG:4326"
)

joined = gpd.sjoin(terrain_geo, barrios[["NAME_3", "geometry"]], how="left", predicate="within")
if "NAME_3" in joined.columns:
    print(f"  Assigned barangays: {joined['NAME_3'].notna().sum()} / {len(joined)}")

# 6. Final feature set
feature_cols = ["elevation", "slope", "aspect", "rainfall_max", "rainfall_mean", "landcover"]
final = joined[feature_cols + ["flood", "lat", "lng"]].dropna(subset=feature_cols).copy()

# Drop duplicates (same lat/lng points)
final = final.drop_duplicates(subset=["lat", "lng"])

print(f"\nFinal dataset: {len(final)} samples")
print(f"Flood distribution: {final['flood'].value_counts().to_dict()}")
print(f"Flood %: {100 * final['flood'].mean():.2f}%")

final.to_csv("tagkawayan_enriched_dataset.csv", index=False)
print("\nSaved: tagkawayan_enriched_dataset.csv")

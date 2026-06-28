import geopandas as gpd

# Load GADM Level 3 (change filename to match yours)
print("Loading GADM file... (may take a moment)")
gdf = gpd.read_file("gadm41_PHL_3.json")

# Check column names
print("Columns:", gdf.columns.tolist())
print("Sample names:", gdf[['NAME_1','NAME_2','NAME_3']].head(10))
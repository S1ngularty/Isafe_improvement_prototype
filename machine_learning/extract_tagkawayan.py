import geopandas as gpd

print("Loading GADM file...")
gdf = gpd.read_file("gadm41_PHL_3.json")

print(f"Loaded {len(gdf)} barangays")
print("Columns:", gdf.columns.tolist())
print("Sample:", gdf[['NAME_1','NAME_2','NAME_3']].head(5).to_string())

tagkawayan = gdf[gdf['NAME_2'].str.contains('Tagkawayan', case=False, na=False)]
print(f"\nFound {len(tagkawayan)} barangays in Tagkawayan")
print(tagkawayan[['NAME_3', 'NAME_2', 'NAME_1']].to_string())

tagkawayan.to_file("tagkawayan_barangays.geojson", driver="GeoJSON")
print("\nSaved: tagkawayan_barangays.geojson")

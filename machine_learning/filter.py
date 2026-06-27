# Filter to Tagkawayan barangays only
tagkawayan = gdf[gdf['NAME_2'].str.contains('Tagkawayan', case=False, na=False)]

print(f"Found {len(tagkawayan)} barangays in Tagkawayan")
print(tagkawayan['NAME_3'].tolist())

# Save filtered file — much smaller
tagkawayan.to_file("tagkawayan_barangays.geojson", driver="GeoJSON")
print("Saved: tagkawayan_barangays.geojson")
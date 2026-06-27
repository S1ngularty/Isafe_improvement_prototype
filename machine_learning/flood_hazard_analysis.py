import warnings
warnings.filterwarnings("ignore")

import numpy as np
import pandas as pd
import geopandas as gpd
import folium
from folium import plugins
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns

DARK_RED  = "#5c1010"
LIGHT_RED = "#b91c1c"

# ══════════════════════════════════════════════════════════════════════════════
# 1. Load
# ══════════════════════════════════════════════════════════════════════════════

print("Loading 100-year flood hazard...")
flood_hazard = gpd.read_file("PH045600000_FH_100yr.shp")
print(f"  Shapefile rows: {len(flood_hazard)}, CRS: {flood_hazard.crs}")

# Var: 1=Low, 2=Medium, 3=High
medium_high = flood_hazard[flood_hazard["Var"] >= 2].copy()
print(f"  Medium+High rows: {len(medium_high)}")

print("\nLoading Tagkawayan barangays...")
barrios = gpd.read_file("tagkawayan_barangays.geojson")
if barrios.crs != flood_hazard.crs:
    barrios = barrios.to_crs(flood_hazard.crs)
print(f"  Barangays: {len(barrios)}")

# Create a single dissolved Tagkawayan boundary for clipping
tagkawayan_boundary = barrios.unary_union

# ══════════════════════════════════════════════════════════════════════════════
# 2. Clip to Tagkawayan, then dissolve hazard by level
# ══════════════════════════════════════════════════════════════════════════════

print("\nClipping hazard zones to Tagkawayan...")
hazard_clipped_gdf = gpd.clip(medium_high, barrios)
print(f"  Clipped features: {len(hazard_clipped_gdf)}")

# Dissolve/union by Var (hazard level) for speed
hazard_union = hazard_clipped_gdf.dissolve(by="Var")
print(f"  Dissolved: {len(hazard_union)} polygons")

# ══════════════════════════════════════════════════════════════════════════════
# 3. Vectorized overlay: hazard_union vs barangays
# ══════════════════════════════════════════════════════════════════════════════

print("\nVectorized overlay with barangays...")
# Project to UTM Zone 51N for accurate area (covers Tagkawayan)
barrios_proj = barrios.to_crs("EPSG:32651")
overlay_proj = gpd.overlay(barrios_proj[["NAME_3", "geometry"]], hazard_union.to_crs("EPSG:32651").reset_index(), how="intersection")
overlay_proj["area_sqm"] = overlay_proj.geometry.area

print(f"  Overlay features: {len(overlay_proj)}")

# ══════════════════════════════════════════════════════════════════════════════
# 4. Aggregate per barangay
# ══════════════════════════════════════════════════════════════════════════════

barrios_proj["total_area_sqm"] = barrios_proj.geometry.area

agg = overlay_proj.groupby(["NAME_3", "Var"]).agg(hazard_area_sqm=("area_sqm", "sum")).reset_index()

# Pivot to wide format
pivot = agg.pivot(index="NAME_3", columns="Var", values="hazard_area_sqm").fillna(0)
pivot.columns = [f"area_var_{int(c)}_sqm" for c in pivot.columns]
pivot = pivot.reset_index()

# Merge with barangay total area
summary = barrios_proj[["NAME_3", "total_area_sqm"]].merge(pivot, on="NAME_3", how="left")

for col in ["area_var_2_sqm", "area_var_3_sqm"]:
    if col not in summary.columns:
        summary[col] = 0
    summary[col] = summary[col].fillna(0)

summary["pct_medium"] = (100 * summary["area_var_2_sqm"] / summary["total_area_sqm"]).round(2)
summary["pct_high"]   = (100 * summary["area_var_3_sqm"] / summary["total_area_sqm"]).round(2)
summary["pct_total_hazard"] = (summary["pct_medium"] + summary["pct_high"]).round(2)
summary["total_hazard_has"] = ((summary["area_var_2_sqm"] + summary["area_var_3_sqm"]) / 10000).round(2)
summary["barangay_area_has"] = (summary["total_area_sqm"] / 10000).round(2)

def classify_risk(v):
    if pd.isna(v) or v <= 0: return "None"
    if v >= 50: return "Very High"
    if v >= 30: return "High"
    if v >= 10: return "Moderate"
    if v > 0:   return "Low"
    return "None"

summary["risk_level"] = summary["pct_total_hazard"].apply(classify_risk)
summary = summary.rename(columns={"NAME_3": "barangay"})
summary = summary.sort_values("pct_total_hazard", ascending=False)

out_cols = ["barangay", "pct_high", "pct_medium", "pct_total_hazard", "risk_level", "total_hazard_has", "barangay_area_has"]
summary[out_cols].to_csv("tagkawayan_flood_hazard_summary.csv", index=False)
print(f"\nSaved: tagkawayan_flood_hazard_summary.csv  ({len(summary)} barangays)")

print("\nBarangay Flood Hazard Summary (top 10):")
print(summary[out_cols].head(10).to_string(index=False))

# ══════════════════════════════════════════════════════════════════════════════
# 5. Bar chart
# ══════════════════════════════════════════════════════════════════════════════

print("\nGenerating chart...")
top15 = summary.head(15).sort_values("pct_total_hazard")

fig, ax = plt.subplots(figsize=(8, 7))
y_pos = np.arange(len(top15))
ax.barh(y_pos, top15["pct_high"], color=DARK_RED, label="High Hazard")
ax.barh(y_pos, top15["pct_medium"], left=top15["pct_high"], color=LIGHT_RED, label="Medium Hazard")
ax.set_yticks(y_pos)
ax.set_yticklabels(top15["barangay"], fontsize=8)
ax.set_xlabel("Area Coverage (%)")
ax.set_title("Tagkawayan — 100-Year Flood Hazard Coverage", fontsize=11)
ax.legend(frameon=False, fontsize=9)
sns.despine()
plt.tight_layout()
plt.savefig("tagkawayan_flood_hazard_chart.png", dpi=200)
plt.close()
print("Saved: tagkawayan_flood_hazard_chart.png")

# ══════════════════════════════════════════════════════════════════════════════
# 6. Choropleth map
# ══════════════════════════════════════════════════════════════════════════════

print("Generating map...")
map_gdf = barrios.merge(summary, right_on="barangay", left_on="NAME_3", how="left")
for c in ["pct_total_hazard", "risk_level", "total_hazard_has", "barangay_area_has"]:
    map_gdf[c] = map_gdf[c].fillna(0)

if "risk_level" in map_gdf.columns:
    map_gdf["risk_level"] = map_gdf["risk_level"].fillna("None")
elif map_gdf["pct_total_hazard"].eq(0).all():
    map_gdf["risk_level"] = map_gdf["pct_total_hazard"].apply(classify_risk)

m = folium.Map(
    location=[13.99, 122.52], zoom_start=11,
    tiles="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attr="Esri, Maxar, Earthstar Geographics", control=False
)

folium.Choropleth(
    geo_data=map_gdf.__geo_interface__,
    data=summary,
    columns=["barangay", "pct_total_hazard"],
    key_on="feature.properties.barangay",
    fill_color="YlOrRd", fill_opacity=0.65,
    line_weight=1.5, line_color="#111111",
    bins=5,
    legend_name="Hazard Coverage (%)"
).add_to(m)

tooltip = folium.GeoJsonTooltip(
    fields=["barangay", "pct_high", "pct_medium", "pct_total_hazard", "risk_level"],
    aliases=["Barangay", "High %", "Medium %", "Total %", "Risk"],
    localize=True, sticky=False, max_width=220,
    style="background-color:#F0EFEF; border:1px solid #333; border-radius:3px; font-size:11px;"
)

folium.GeoJson(
    data=map_gdf.__geo_interface__, tooltip=tooltip,
    style_function=lambda x: {"fillOpacity": 0, "weight": 0.8, "color": "#333", "dashArray": "2 2"}
).add_to(m)

plugins.Fullscreen().add_to(m)
m.save("tagkawayan_flood_hazard_map.html")
print("Saved: tagkawayan_flood_hazard_map.html")

# ══════════════════════════════════════════════════════════════════════════════
# 7. Summary
# ══════════════════════════════════════════════════════════════════════════════

print("\n" + "=" * 60)
print("100-YEAR FLOOD HAZARD ANALYSIS — TAGKAWAYAN, QUEZON")
print("=" * 60)

rc = summary["risk_level"].value_counts()
print(f"\nBarangays with hazard exposure: {len(summary[summary['pct_total_hazard'] > 0])}")
print(f"Barangays with zero hazard:      {len(summary[summary['pct_total_hazard'] == 0])}")
for level in ["Very High", "High", "Moderate", "Low", "None"]:
    print(f"  {level}: {rc.get(level, 0)}")

print(f"\nTop 5 most at-risk:")
for _, r in summary.head(5).iterrows():
    print(f"  {r['barangay']}: {r['pct_total_hazard']:.1f}% (H:{r['pct_high']:.1f}% M:{r['pct_medium']:.1f}%)")

print(f"\nOutputs: tagkawayan_flood_hazard_summary.csv, .png, .html")

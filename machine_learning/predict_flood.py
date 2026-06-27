import warnings
warnings.filterwarnings("ignore")

import json
import time
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns
from math import pi
import unicodedata

# Geo
import geopandas as gpd
from shapely.geometry import Point

# ML
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import StratifiedKFold
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score, confusion_matrix
from xgboost import XGBClassifier

# SHAP
import shap

# Map
import folium
from folium import plugins

# ─── Colours ───────────────────────────────────────────────────────────────
SHIELD_RED = "#991b1b"
ALERT_RED  = "#b91c1c"
GREY       = "#6b7280"
LIGHT_GREY = "#d1d5db"

# ─── Helpers ───────────────────────────────────────────────────────────────

def fix_encoding(text):
    """Replace ñ→n, Ñ→N, and drop other non-ASCII for clean table output."""
    if not isinstance(text, str):
        return text
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
    return text

def make_name_col(s):
    """Return a clean barangay name from a GeoJSON property value."""
    return fix_encoding(str(s)).strip()

# ══════════════════════════════════════════════════════════════════════════════
# SECTION 1 — Load data
# ══════════════════════════════════════════════════════════════════════════════

print("=" * 60)
print("SECTION 1: Loading data")
print("=" * 60)

df = pd.read_csv("tagkawayan_flood_dataset_final.csv")
print(f"Dataset shape: {df.shape}")

# Parse coordinates from .geo column
geo_parsed = df[".geo"].apply(lambda s: json.loads(s)["coordinates"])
df["lng"] = geo_parsed.apply(lambda c: c[0])
df["lat"] = geo_parsed.apply(lambda c: c[1])

# Features and target
feature_cols = ["TWI", "aspect", "dist_river", "elevation", "landcover",
                "rainfall_max", "rainfall_mean", "slope"]
X = df[feature_cols].copy()
y = df["flood"].copy()

print(f"Features: {feature_cols}")
print(f"Target distribution:\n{y.value_counts()}")
print(f"Non-flood: {(y == 0).sum()}  |  Flood: {(y == 1).sum()}  ({100 * y.mean():.2f}%)")

# Load barangay polygons
barrios = gpd.read_file("tagkawayan_barangays.geojson")
barrios["NAME_3_clean"] = barrios["NAME_3"].apply(make_name_col)
print(f"Barangay boundaries loaded: {len(barrios)} polygons")

# ══════════════════════════════════════════════════════════════════════════════
# SECTION 2 — RF + XGBoost 5-fold cross-validation
# ══════════════════════════════════════════════════════════════════════════════

print("\n" + "=" * 60)
print("SECTION 2: 5-fold cross-validation (RF vs XGBoost)")
print("=" * 60)

cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

def cv_scores(model, model_name, X, y, cv):
    accs, precs, recs, f1s, aucs, times = [], [], [], [], [], []
    for train_idx, test_idx in cv.split(X, y):
        X_tr, X_te = X.iloc[train_idx], X.iloc[test_idx]
        y_tr, y_te = y.iloc[train_idx], y.iloc[test_idx]
        t0 = time.time()
        model.fit(X_tr, y_tr)
        elapsed = time.time() - t0
        pred = model.predict(X_te)
        prob = model.predict_proba(X_te)[:, 1]
        accs.append(accuracy_score(y_te, pred))
        precs.append(precision_score(y_te, pred, zero_division=0))
        recs.append(recall_score(y_te, pred, zero_division=0))
        f1s.append(f1_score(y_te, pred, zero_division=0))
        aucs.append(roc_auc_score(y_te, prob))
        times.append(elapsed)
    return {"model": model_name,
            "accuracy": np.mean(accs), "precision": np.mean(precs),
            "recall": np.mean(recs), "f1": np.mean(f1s),
            "roc_auc": np.mean(aucs), "time": np.mean(times)}

rf_base = RandomForestClassifier(n_estimators=300, max_depth=12, random_state=42, n_jobs=-1)
xgb_base = XGBClassifier(n_estimators=300, max_depth=6, learning_rate=0.1,
                          eval_metric="logloss", use_label_encoder=False, random_state=42)

scores_rf  = cv_scores(rf_base,  "Random Forest", X, y, cv)
scores_xgb = cv_scores(xgb_base, "XGBoost",       X, y, cv)

results_df = pd.DataFrame([scores_rf, scores_xgb]).set_index("model")
print("\nCross-validation results (mean across folds):")
print(results_df.round(4).to_string())

# Select best model by F1 * ROC-AUC composite
rf_composite  = scores_rf["f1"]  * scores_rf["roc_auc"]
xgb_composite = scores_xgb["f1"] * scores_xgb["roc_auc"]
if rf_composite >= xgb_composite:
    best_name = "Random Forest"
    best_model = RandomForestClassifier(n_estimators=300, max_depth=12, random_state=42, n_jobs=-1)
    alt_name = "XGBoost"
else:
    best_name = "XGBoost"
    best_model = XGBClassifier(n_estimators=300, max_depth=6, learning_rate=0.1,
                                eval_metric="logloss", use_label_encoder=False, random_state=42)
    alt_name = "Random Forest"

print(f"\nBest model by F1 * ROC-AUC: {best_name}  ({rf_composite:.4f} vs {xgb_composite:.4f})")

# Retrain best model and alt model on full data for plots + SHAP
best_model.fit(X, y)
rf_full  = RandomForestClassifier(n_estimators=300, max_depth=12, random_state=42, n_jobs=-1).fit(X, y)
xgb_full = XGBClassifier(n_estimators=300, max_depth=6, learning_rate=0.1,
                          eval_metric="logloss", use_label_encoder=False, random_state=42)
xgb_full.fit(X, y)

# ══════════════════════════════════════════════════════════════════════════════
# SECTION 3 — Model comparison bar chart
# ══════════════════════════════════════════════════════════════════════════════

print("\n" + "=" * 60)
print("SECTION 3: Model comparison chart")
print("=" * 60)

metrics = ["accuracy", "precision", "recall", "f1", "roc_auc"]
labels  = ["Accuracy", "Precision", "Recall", "F1 Score", "ROC-AUC"]
r_vals  = [scores_rf[m]  for m in metrics]
x_vals  = [scores_xgb[m] for m in metrics]

fig, ax = plt.subplots(figsize=(10, 5))
x_idx = np.arange(len(labels))
w = 0.35
bars1 = ax.bar(x_idx - w / 2, r_vals, w, label="Random Forest", color=SHIELD_RED, edgecolor="white")
bars2 = ax.bar(x_idx + w / 2, x_vals, w, label="XGBoost",       color=ALERT_RED,  edgecolor="white")

for bar in bars1:
    ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 0.01,
            f"{bar.get_height():.3f}", ha="center", va="bottom", fontsize=8, color=SHIELD_RED)
for bar in bars2:
    ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 0.01,
            f"{bar.get_height():.3f}", ha="center", va="bottom", fontsize=8, color=ALERT_RED)

ax.set_xticks(x_idx)
ax.set_xticklabels(labels)
ax.set_ylim(0, 1.02)
ax.set_ylabel("Score")
ax.set_title("RF vs XGBoost — 5-Fold Cross-Validation")
ax.legend(frameon=False)
sns.despine()
plt.tight_layout()
plt.savefig("model_comparison.png", dpi=200)
plt.close()
print("Saved: model_comparison.png")

# ══════════════════════════════════════════════════════════════════════════════
# SECTION 4 — Confusion matrices
# ══════════════════════════════════════════════════════════════════════════════

print("\n" + "=" * 60)
print("SECTION 4: Confusion matrices")
print("=" * 60)

_, (ax1, ax2) = plt.subplots(1, 2, figsize=(8, 3.5))

for ax, model, title in [(ax1, rf_full, "Random Forest"), (ax2, xgb_full, "XGBoost")]:
    preds = model.predict(X)
    cm = confusion_matrix(y, preds)
    sns.heatmap(cm, annot=True, fmt="d", cmap="Reds", ax=ax,
                xticklabels=["No Flood", "Flood"], yticklabels=["No Flood", "Flood"],
                cbar=False)
    ax.set_title(title)
    ax.set_xlabel("Predicted")
    ax.set_ylabel("Actual")

plt.tight_layout()
plt.savefig("confusion_matrices.png", dpi=200)
plt.close()
print("Saved: confusion_matrices.png")

# ══════════════════════════════════════════════════════════════════════════════
# SECTION 5 — SHAP analysis (best model)
# ══════════════════════════════════════════════════════════════════════════════

print("\n" + "=" * 60)
print(f"SECTION 5: SHAP analysis ({best_name})")
print("=" * 60)

explainer = shap.TreeExplainer(best_model)
shap_raw = explainer.shap_values(X)
# For binary classification, shap_raw may be a list [neg, pos] or a 3D array.
# The positive (flood) class values are used for interpretation.
if isinstance(shap_raw, list):
    shap_values = shap_raw[1]       # shape (n, 8)
elif shap_raw.ndim == 3:
    shap_values = shap_raw[:, :, 1]
else:
    shap_values = shap_raw

# Bar plot
shap.summary_plot(shap_values, X, plot_type="bar", show=False, max_display=8)
plt.gcf().set_size_inches(7, 4)
plt.title(f"Feature Importance (SHAP) — {best_name}", fontsize=11)
plt.tight_layout()
plt.savefig("shap_summary.png", dpi=200, bbox_inches="tight")
plt.close()
print("Saved: shap_summary.png")

# Beeswarm
shap.summary_plot(shap_values, X, show=False, max_display=8)
plt.gcf().set_size_inches(8, 4)
plt.title(f"SHAP Beeswarm — {best_name}", fontsize=11)
plt.tight_layout()
plt.savefig("shap_beeswarm.png", dpi=200, bbox_inches="tight")
plt.close()
print("Saved: shap_beeswarm.png")

# Top feature per sample for barangay aggregation
shap_df = pd.DataFrame(shap_values, columns=feature_cols)
top_feat_per_row = shap_df.abs().idxmax(axis=1)

# ══════════════════════════════════════════════════════════════════════════════
# SECTION 6 — Predict on all pixels
# ══════════════════════════════════════════════════════════════════════════════

print("\n" + "=" * 60)
print("SECTION 6: Pixel-level predictions")
print("=" * 60)

y_prob = best_model.predict_proba(X)[:, 1]
y_pred = best_model.predict(X)

pixels_out = pd.DataFrame({
    "index": df["system:index"],
    "lat": df["lat"],
    "lng": df["lng"],
    "flood_actual": y,
    "flood_prob": y_prob,
    "flood_pred": y_pred,
    "top_feature": top_feat_per_row,
})
pixels_out.to_csv("pixel_predictions.csv", index=False)
print(f"Saved: pixel_predictions.csv  ({len(pixels_out)} rows)")

# ══════════════════════════════════════════════════════════════════════════════
# SECTION 7 — Barangay-level summary via spatial join
# ══════════════════════════════════════════════════════════════════════════════

print("\n" + "=" * 60)
print("SECTION 7: Barangay-level summary")
print("=" * 60)

geo = gpd.points_from_xy(df["lng"], df["lat"], crs="EPSG:4326")
pixels_gdf = gpd.GeoDataFrame(pixels_out, geometry=geo)

joined = gpd.sjoin(pixels_gdf, barrios[["NAME_3_clean", "geometry"]],
                   how="left", predicate="within")

# Aggregation
summary = joined.groupby("NAME_3_clean").agg(
    total_pixels=("flood_actual", "count"),
    flood_pixels=("flood_actual", "sum"),
    mean_risk=("flood_prob", "mean"),
    std_risk=("flood_prob", "std"),
    top_feature=("top_feature", lambda s: s.value_counts().index[0]),
).reset_index()

# Assign flood % and round
summary["flood_pct"] = (100 * summary["flood_pixels"] / summary["total_pixels"]).round(2)
summary["mean_risk"] = summary["mean_risk"].round(4)
summary["std_risk"] = summary["std_risk"].round(4)
summary = summary.sort_values("mean_risk", ascending=False)

# Flood risk label — quantile-based
summary["risk_level"] = pd.qcut(summary["mean_risk"], 5,
                                 labels=["Very Low", "Low", "Moderate", "High", "Very High"],
                                 duplicates="drop")

summary.columns = [fix_encoding(c) if c == "NAME_3_clean" else c for c in summary.columns]
summary = summary.rename(columns={"NAME_3_clean": "barangay"})

summary.to_csv("tagkawayan_barangay_summary.csv", index=False)
print(f"Saved: tagkawayan_barangay_summary.csv  ({len(summary)} barangays)")

print("\nBarangay Summary (top 10):")
print(summary.head(10).to_string(index=False))

# ══════════════════════════════════════════════════════════════════════════════
# SECTION 8 — Choropleth map (quantile, satellite basemap)
# ══════════════════════════════════════════════════════════════════════════════

print("\n" + "=" * 60)
print("SECTION 8: Choropleth map")
print("=" * 60)

# Merge summary back to geometry for mapping
barrios_map = barrios.copy()
barrios_map["NAME_3_clean"] = barrios_map["NAME_3"].apply(make_name_col)
map_gdf = barrios_map.merge(summary, left_on="NAME_3_clean", right_on="barangay", how="left")
map_gdf["mean_risk"] = map_gdf["mean_risk"].fillna(0)
map_gdf["flood_pct"] = map_gdf["flood_pct"].fillna(0)
map_gdf["total_pixels"] = map_gdf["total_pixels"].fillna(0).astype(int)

center_lat, center_lng = 14.09, 122.43
m = folium.Map(location=[center_lat, center_lng], zoom_start=11,
               tiles="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
               attr="Esri, Maxar, Earthstar Geographics", control=False)

# Quantile choropleth
folium.Choropleth(
    geo_data=map_gdf.__geo_interface__,
    data=summary,
    columns=["barangay", "mean_risk"],
    key_on="feature.properties.NAME_3_clean",
    fill_color="YlOrRd",
    fill_opacity=0.65,
    line_weight=1.2,
    line_color="#333333",
    bins=5,
    legend_name="Flood Risk Probability (Quantile)",
    name="Flood Risk"
).add_to(m)

# Tooltip per barangay
tooltip = folium.GeoJsonTooltip(
    fields=["barangay", "total_pixels", "flood_pixels", "flood_pct", "mean_risk", "risk_level", "top_feature"],
    aliases=["Barangay", "Pixels", "Flood Pixels", "Flood %", "Mean Risk", "Risk Level", "Top Feature"],
    localize=True,
    sticky=False,
    labels=True,
    style="""
        background-color: #F0EFEF;
        border: 1px solid black;
        border-radius: 3px;
        box-shadow: 3px 3px 10px rgba(0,0,0,0.25);
        font-size: 11px;
    """,
    max_width=250,
)

folium.GeoJson(
    data=map_gdf.__geo_interface__,
    tooltip=tooltip,
    style_function=lambda x: {"fillOpacity": 0, "weight": 0.8, "color": "#333333"},
).add_to(m)

# Full-screen button
plugins.Fullscreen().add_to(m)

m.save("tagkawayan_flood_risk_map.html")
print("Saved: tagkawayan_flood_risk_map.html")

# ─── Final summary ───────────────────────────────────────────────────────────

print("\n" + "=" * 60)
print("ALL COMPLETE")
print("=" * 60)
print()
print("Output files:")
for f in ["model_comparison.png", "confusion_matrices.png",
          "shap_summary.png", "shap_beeswarm.png",
          "pixel_predictions.csv", "tagkawayan_barangay_summary.csv",
          "tagkawayan_flood_risk_map.html"]:
    print(f"  machine_learning/{f}")
print()
print(f"Best model: {best_name}")
print(f"RF  composite (F1 * AUC): {rf_composite:.4f}")
print(f"XGB composite (F1 * AUC): {xgb_composite:.4f}")
print()
print("Results table for paper:")
print(results_df.round(4).to_string())

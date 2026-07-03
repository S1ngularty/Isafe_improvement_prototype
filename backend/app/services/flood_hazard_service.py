import os
import json
import subprocess
from datetime import datetime

ML_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), "machine_learning")
SUMMARY_CSV = os.path.join(ML_DIR, "tagkawayan_flood_hazard_summary.csv")
GEOJSON_FILE = os.path.join(ML_DIR, "tagkawayan_barangays.geojson")
HAZARD_SHP = os.path.join(ML_DIR, "PH045600000_FH_100yr.shp")
ANALYSIS_SCRIPT = os.path.join(ML_DIR, "flood_hazard_analysis.py")

import pandas as pd
import geopandas as gpd


def read_summary():
    if not os.path.exists(SUMMARY_CSV):
        return {"data": [], "last_updated": None}

    df = pd.read_csv(SUMMARY_CSV)
    data = df.to_dict(orient="records")
    
    # Clean up NaNs to None for JSON serialization
    for row in data:
        for k, v in row.items():
            if pd.isna(v):
                row[k] = None

    mtime = os.path.getmtime(SUMMARY_CSV)
    last_updated = datetime.fromtimestamp(mtime).isoformat()

    return {"data": data, "last_updated": last_updated}


def read_geojson():
    if not os.path.exists(GEOJSON_FILE):
        return {"type": "FeatureCollection", "features": []}

    gdf = gpd.read_file(GEOJSON_FILE)
    if gdf.crs and gdf.crs.to_string() != "EPSG:4326":
        gdf = gdf.to_crs("EPSG:4326")

    return json.loads(gdf.to_json())


def read_hazard_polygons():
    if not os.path.exists(HAZARD_SHP):
        return {"type": "FeatureCollection", "features": []}

    hazard = gpd.read_file(HAZARD_SHP)
    medium_high = hazard[hazard["Var"] >= 2].copy()

    barrios = gpd.read_file(GEOJSON_FILE)
    if barrios.crs != hazard.crs:
        barrios = barrios.to_crs(hazard.crs)
    if medium_high.crs != hazard.crs:
        medium_high = medium_high.to_crs(hazard.crs)

    clipped = gpd.clip(medium_high, barrios)
    if clipped.crs and clipped.crs.to_string() != "EPSG:4326":
        clipped = clipped.to_crs("EPSG:4326")

    clipped["hazard_level"] = clipped["Var"].map({2: "Medium", 3: "High"})

    return json.loads(clipped.to_json())


def run_analysis():
    if not os.path.exists(ANALYSIS_SCRIPT):
        return {"status": "error", "message": "Analysis script not found"}

    try:
        result = subprocess.run(
            ["python", ANALYSIS_SCRIPT],
            cwd=ML_DIR,
            capture_output=True,
            text=True,
            timeout=120,
        )
        if result.returncode == 0:
            return {"status": "complete", "output": result.stdout[-500:]}
        return {"status": "error", "message": result.stderr[-500:]}
    except subprocess.TimeoutExpired:
        return {"status": "error", "message": "Analysis timed out"}

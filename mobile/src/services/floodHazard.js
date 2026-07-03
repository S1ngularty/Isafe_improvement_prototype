import { apiGet } from "./backend.js";
import { getBackendUrl } from "./backendConfig.js";

export async function fetchSummary() {
  try {
    const data = await apiGet("/api/flood-hazard/summary");
    return data;
  } catch (error) {
    console.error("[floodHazard] Failed to fetch summary:", error);
    return { data: [] };
  }
}

export async function fetchGeoJSON() {
  try {
    const url = `${getBackendUrl()}/api/flood-hazard/geojson`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`GeoJSON fetch failed (${res.status})`);
    return await res.json();
  } catch (error) {
    console.error("[floodHazard] Failed to fetch geojson:", error);
    return { type: "FeatureCollection", features: [] };
  }
}

export async function fetchAll() {
  const [summary, geojson] = await Promise.all([fetchSummary(), fetchGeoJSON()]);
  return { summary, geojson };
}

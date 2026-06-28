async function fetchJSON(url, label) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${label} (${res.status})`);
  const text = await res.text();
  console.log(`[floodHazardApi] ${label}:`, text.slice(0, 200));
  try {
    return JSON.parse(text);
  } catch (err) {
    console.error(`[floodHazardApi] JSON parse error for ${label}:`, err);
    console.error(`[floodHazardApi] Response text (first 1000 chars):`, text.slice(0, 1000));
    throw new Error(`Invalid JSON for ${label}: ${err.message}`);
  }
}

export async function fetchSummary() {
  return fetchJSON("/data/flood_hazard_summary.json", "summary");
}

export async function fetchGeoJSON() {
  return fetchJSON("/data/flood_hazard_geojson.json", "geojson");
}

export async function fetchAll() {
  const [summary, geojson] = await Promise.all([fetchSummary(), fetchGeoJSON()]);
  console.log("[floodHazardApi] fetchAll complete:", { summaryRows: summary?.data?.length, geojsonFeatures: geojson?.features?.length });
  return { summary, geojson, polygons: null };
}

export async function rerunAnalysis() {
  const res = await fetch("http://localhost:8000/api/flood-hazard/rerun", { method: "POST" });
  if (!res.ok) throw new Error("Failed to trigger analysis");
  return res.json();
}

export async function getRerunStatus() {
  const res = await fetch("http://localhost:8000/api/flood-hazard/rerun/status");
  if (!res.ok) throw new Error("Failed to get status");
  return res.json();
}

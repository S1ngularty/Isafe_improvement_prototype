const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

async function fetchJSON(url, label) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${label} (${res.status})`);
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch (err) {
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
  return { summary, geojson, polygons: null };
}

export async function rerunAnalysis() {
  const res = await fetch(`${BACKEND_URL}/api/flood-hazard/rerun`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to trigger analysis");
  return res.json();
}

export async function getRerunStatus() {
  const res = await fetch(`${BACKEND_URL}/api/flood-hazard/rerun/status`);
  if (!res.ok) throw new Error("Failed to get status");
  return res.json();
}

export async function fetchFloodAnalysis(barangay, data, language) {
  const res = await fetch(`${BACKEND_URL}/api/flood-hazard/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ barangay, data, language }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Request failed: ${res.status}`);
  }
  const envelope = await res.json();
  if (envelope.error) {
    throw new Error(envelope.error.message || "Unknown error");
  }
  return envelope.data;
}

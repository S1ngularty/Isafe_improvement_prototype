import { apiGet } from "./backend.js";

export async function searchAddress(query) {
  if (!query || query.trim().length < 3) return [];

  try {
    const results = await apiGet("/api/geocode/search", { q: query.trim() });
    return results.map((r) => ({
      lat: r.lat,
      lng: r.lng,
      display_name: r.display_name,
    }));
  } catch {
    throw new Error("Search unavailable");
  }
}

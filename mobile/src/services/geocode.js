import { apiGet } from "./backend.js";

export async function searchAddress(query) {
  if (!query || query.trim().length < 3) {
    return [];
  }

  try {
    const results = await apiGet("/api/geocode/search", { q: query });
    return results.map((r) => ({
      lat: r.lat,
      lng: r.lng,
      display_name: r.display_name,
    }));
  } catch (error) {
    console.error("[searchAddress] Error:", error);
    throw error;
  }
}

export async function reverseGeocode(lat, lng) {
  try {
    const result = await apiGet("/api/geocode/reverse", { lat, lng });
    return {
      lat: result.lat,
      lng: result.lng,
      address: result.display_name,
      display_name: result.display_name,
    };
  } catch (error) {
    console.error("[reverseGeocode] Error:", error);
    throw error;
  }
}

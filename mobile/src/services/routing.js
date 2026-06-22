import { apiGet } from "./backend.js";

export async function fetchRoute(fromLat, fromLng, toLat, toLng) {
  try {
    const data = await apiGet("/api/routing/route", { from_lat: fromLat, from_lng: fromLng, to_lat: toLat, to_lng: toLng, steps: true });
    return data;
  } catch { return null; }
}

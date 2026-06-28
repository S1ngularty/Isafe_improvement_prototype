import { apiGet } from "./backend.js";

export async function fetchNearestEvacuationAreas(lat, lng, limit = 5) {
  const data = await apiGet("/api/evacuation-areas/nearest", {
    lat,
    lng,
    limit,
  });
  return Array.isArray(data) ? data : [];
}

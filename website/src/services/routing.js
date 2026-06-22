import { apiGet } from "./backend.js";

export async function fetchRoute(fromLat, fromLng, toLat, toLng) {
  try {
    const data = await apiGet("/api/routing/route", {
      from_lat: fromLat,
      from_lng: fromLng,
      to_lat: toLat,
      to_lng: toLng,
      steps: true,
    });
    return data;
  } catch {
    return null;
  }
}

export function openOSMDirections(fromLat, fromLng, toLat, toLng) {
  const url = `https://www.openstreetmap.org/directions?from=${fromLat}%2C${fromLng}&to=${toLat}%2C${toLng}#map=15/${fromLat}/${fromLng}`;
  window.open(url, "_blank");
}

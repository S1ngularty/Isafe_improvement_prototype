import { apiGet } from "./backend.js";

export async function fetchRadarFrames() {
  try {
    return await apiGet("/api/weather/radar");
  } catch {
    return null;
  }
}

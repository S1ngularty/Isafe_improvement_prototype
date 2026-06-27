import { apiGet } from "./backend.js";

export async function fetchEvacuationAreas() {
  try {
    return await apiGet("/api/evacuation-areas");
  } catch {
    return [];
  }
}

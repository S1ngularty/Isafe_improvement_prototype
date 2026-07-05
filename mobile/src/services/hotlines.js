import { apiGet } from "./backend.js";

export async function fetchHotlines() {
  const data = await apiGet("/api/hotlines");
  return Array.isArray(data) ? data : [];
}

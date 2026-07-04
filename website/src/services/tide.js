import { apiGet, apiPost } from "./backend";

export async function getTideData() {
  return apiGet("/api/tide");
}

export async function refreshTideData() {
  return apiPost("/api/tide/refresh");
}

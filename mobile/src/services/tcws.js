import { apiGet } from "./backend.js";

export async function fetchActiveAlerts() {
  try {
    return await apiGet("/api/tcws/active");
  } catch {
    return [];
  }
}

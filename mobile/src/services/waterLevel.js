import { apiGet } from "./backend.js";

export async function fetchWaterLevelSummary() {
  return apiGet("/api/water-level/summary");
}

export async function fetchWaterLevelAnalytics(days = 7) {
  return apiGet("/api/water-level/analytics", { days });
}

export async function fetchUnsafeReadings({ sensorId, limit = 50 } = {}) {
  const params = { limit };
  if (sensorId) params.sensor_id = sensorId;
  return apiGet("/api/water-level/unsafe", params);
}

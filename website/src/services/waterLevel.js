import { apiGet } from "./backend.js";

export async function fetchWaterLevelSummary() {
  return apiGet("/api/water-level/summary");
}

export async function fetchWaterLevelReadings({
  sensorId,
  fromDate,
  toDate,
  status,
  page = 1,
  limit = 50,
} = {}) {
  const params = { page, limit };
  if (sensorId) params.sensor_id = sensorId;
  if (fromDate) params.from_date = fromDate;
  if (toDate) params.to_date = toDate;
  if (status) params.status = status;
  return apiGet("/api/water-level/readings", params);
}

export async function fetchSensorStatuses() {
  return apiGet("/api/water-level/sensors");
}

export async function fetchWaterLevelAnalytics(days = 7) {
  return apiGet("/api/water-level/analytics", { days });
}

export async function fetchUnsafeReadings({ sensorId, limit = 50 } = {}) {
  const params = { limit };
  if (sensorId) params.sensor_id = sensorId;
  return apiGet("/api/water-level/unsafe", params);
}

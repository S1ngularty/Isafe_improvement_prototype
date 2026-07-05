import { apiGet, apiPost } from "./backend.js";

export async function fetchKpiData() {
  return apiGet("/api/analytics/kpi");
}

export async function fetchTrendsData(days = 30) {
  return apiGet("/api/analytics/trends", { days });
}

export async function fetchHeatmapData(hours = 24) {
  return apiGet("/api/analytics/heatmap", { hours });
}

export async function fetchTemporalHeatmap() {
  return apiGet("/api/analytics/heatmap-temporal");
}

export async function fetchResponseTimes(days = 30) {
  return apiGet("/api/analytics/response-times", { days });
}

export async function fetchBarangayStats() {
  return apiGet("/api/analytics/barangay");
}

export async function fetchRescuerPerformance() {
  return apiGet("/api/analytics/rescuer-performance");
}

export async function fetchDemographics() {
  return apiGet("/api/analytics/demographics");
}

export async function fetchEvacuationStatus() {
  return apiGet("/api/analytics/evacuation-status");
}

export async function fetchRecentActivity(limit = 20) {
  return apiGet("/api/analytics/recent-activity", { limit });
}

export async function triggerBackfill() {
  return apiPost("/api/analytics/backfill");
}

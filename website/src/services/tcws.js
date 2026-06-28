import { apiGet, apiPost, apiPut, apiDelete } from "./backend.js";

export async function fetchActiveAlerts() {
  try {
    return await apiGet("/api/tcws/active");
  } catch {
    return [];
  }
}

export async function fetchAllAlerts() {
  try {
    return await apiGet("/api/tcws/admin");
  } catch {
    return [];
  }
}

export async function createAlert({ signal_level, description, wind_speed }) {
  return apiPost("/api/tcws", { signal_level, description, wind_speed });
}

export async function updateAlert(id, updates) {
  return apiPut(`/api/tcws/${id}`, updates);
}

export async function deleteAlert(id) {
  return apiDelete(`/api/tcws/${id}`);
}

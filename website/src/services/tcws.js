import { apiGet, apiPost, apiPut, apiDelete } from "./backend.js";

export async function fetchActiveAlerts() {
  try {
    return await apiGet("/api/tcws/active");
  } catch {
    return [];
  }
}

export async function fetchAllAlerts(page = 1, limit = 10, search = "", orderBy = null, orderDir = null, includeDeleted = false, deletedOnly = false) {
  try {
    const params = { page, limit, include_deleted: includeDeleted, deleted_only: deletedOnly };
    if (search) params.search = search;
    if (orderBy) params.order_by = orderBy;
    if (orderDir) params.order_dir = orderDir;
    return await apiGet("/api/tcws/admin", params);
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

export async function restoreAlert(id) {
  return apiPost(`/api/tcws/${id}/restore`);
}

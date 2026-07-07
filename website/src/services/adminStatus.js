import { apiGet, apiPut } from "./backend.js";

export async function fetchStatusOverview() {
  return apiGet("/api/admin/status-overview");
}

export async function fetchStatusUsers(status, search, page = 1, limit = 50, orderBy = null, orderDir = null) {
  const params = { page, limit };
  if (status && status !== "all") params.status = status;
  if (search) params.search = search;
  if (orderBy) params.order_by = orderBy;
  if (orderDir) params.order_dir = orderDir;
  return apiGet("/api/admin/status-users", params);
}

export async function fetchStatusHistory(userId, page = 1, limit = 50) {
  return apiGet(`/api/admin/status-history/${userId}`, { page, limit });
}

export async function fetchUserProfile(userId) {
  return apiGet(`/api/admin/profile/${userId}`);
}

export async function updateUserStatus(userId, status, resolutionNote) {
  return apiPut(`/api/admin/status/${userId}`, { status, resolution_note: resolutionNote || null });
}

import { apiGet, apiPut } from "./backend.js";

export async function fetchStatusOverview() {
  return apiGet("/api/admin/status-overview");
}

export async function fetchStatusUsers(status, search) {
  const params = {};
  if (status && status !== "all") params.status = status;
  if (search) params.search = search;
  return apiGet("/api/admin/status-users", params);
}

export async function fetchStatusHistory(userId) {
  return apiGet(`/api/admin/status-history/${userId}`);
}

export async function fetchUserProfile(userId) {
  return apiGet(`/api/admin/profile/${userId}`);
}

export async function updateUserStatus(userId, status, resolutionNote) {
  return apiPut(`/api/admin/status/${userId}`, { status, resolution_note: resolutionNote || null });
}

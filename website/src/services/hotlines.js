import { apiGet, apiPost, apiPut, apiDelete } from "./backend.js";

export async function fetchHotlines() {
  try {
    return await apiGet("/api/hotlines");
  } catch {
    return [];
  }
}

export async function fetchAllHotlines(page = 1, limit = 10, search = "", orderBy = null, orderDir = null, includeDeleted = false, deletedOnly = false) {
  const params = { page, limit, include_deleted: includeDeleted, deleted_only: deletedOnly };
  if (search) params.search = search;
  if (orderBy) params.order_by = orderBy;
  if (orderDir) params.order_dir = orderDir;
  return apiGet("/api/hotlines/admin", params);
}

export async function createHotline(formData) {
  return apiPost("/api/hotlines", formData);
}

export async function updateHotline(id, formData) {
  return apiPut(`/api/hotlines/${id}`, formData);
}

export async function deleteHotline(id) {
  return apiDelete(`/api/hotlines/${id}`);
}

export async function restoreHotline(id) {
  return apiPost(`/api/hotlines/${id}/restore`);
}

import { apiGet, apiPost, apiPut, apiDelete } from "./backend.js";

export async function fetchActiveAnnouncements() {
  try {
    return await apiGet("/api/announcements/active");
  } catch {
    return [];
  }
}

export async function fetchAllAnnouncements(page = 1, limit = 10, search = "", orderBy = null, orderDir = null, includeDeleted = false, deletedOnly = false) {
  try {
    const params = { page, limit, include_deleted: includeDeleted, deleted_only: deletedOnly };
    if (search) params.search = search;
    if (orderBy) params.order_by = orderBy;
    if (orderDir) params.order_dir = orderDir;
    return await apiGet("/api/announcements/admin", params);
  } catch {
    return [];
  }
}

export async function createAnnouncement({ title, short_description, long_description, image_url, file }) {
  const form = new FormData();
  form.append("title", title);
  form.append("short_description", short_description);
  if (long_description) form.append("long_description", long_description);
  if (file) form.append("file", file);
  if (image_url) form.append("image_url", image_url);
  return apiPost("/api/announcements", form);
}

export async function updateAnnouncement(id, { title, short_description, long_description, image_url, is_active, file }) {
  const form = new FormData();
  if (title !== undefined) form.append("title", title);
  if (short_description !== undefined) form.append("short_description", short_description);
  if (long_description !== undefined) form.append("long_description", long_description);
  if (image_url !== undefined) form.append("image_url", image_url);
  if (is_active !== undefined) form.append("is_active", String(is_active));
  if (file) form.append("file", file);
  return apiPut(`/api/announcements/${id}`, form);
}

export async function deleteAnnouncement(id) {
  return apiDelete(`/api/announcements/${id}`);
}

export async function restoreAnnouncement(id) {
  return apiPost(`/api/announcements/${id}/restore`);
}

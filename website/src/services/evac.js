import { apiGet, apiPost, apiPut, apiDelete } from "./backend.js";
import { supabase, getStorageUrl } from "./supabase";

export async function fetchEvacuationAreas() {
  try {
    return await apiGet("/api/evacuation-areas");
  } catch {
    return [];
  }
}

export async function fetchAllEvacuationAreas(page = 1, limit = 10, search = "", orderBy = null, orderDir = null, includeDeleted = false) {
  const params = { page, limit, include_deleted: includeDeleted };
  if (search) params.search = search;
  if (orderBy) params.order_by = orderBy;
  if (orderDir) params.order_dir = orderDir;
  return apiGet("/api/evacuation-areas/admin", params);
}

export async function createEvacuationArea(formData) {
  return apiPost("/api/evacuation-areas", formData);
}

export async function updateEvacuationArea(id, formData) {
  return apiPut(`/api/evacuation-areas/${id}`, formData);
}

export async function deleteEvacuationArea(id) {
  return apiDelete(`/api/evacuation-areas/${id}`);
}

export async function restoreEvacuationArea(id) {
  return apiPost(`/api/evacuation-areas/${id}/restore`);
}

export async function uploadLandmarkImage(file, evacId) {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `evacuation/${evacId}/landmark.${ext}`;
  const { error } = await supabase.storage
    .from("evacuation_landmarks")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw new Error(error.message);
  return getStorageUrl("evacuation_landmarks", path);
}

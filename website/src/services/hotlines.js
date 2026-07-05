import { apiGet, apiPost, apiPut, apiDelete } from "./backend.js";

export async function fetchHotlines() {
  try {
    return await apiGet("/api/hotlines");
  } catch {
    return [];
  }
}

export async function fetchAllHotlines() {
  return apiGet("/api/hotlines/admin");
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

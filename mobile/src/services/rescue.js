import { getBackendUrl } from "./backendConfig.js";
import { supabase } from "./supabase.js";

async function getAuthHeaders() {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) throw new Error("Not authenticated");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

async function apiCall(method, path, body = null, params = {}) {
  const url = new URL(path, getBackendUrl());
  Object.entries(params).forEach(([k, v]) => {
    if (v != null) url.searchParams.set(k, String(v));
  });

  const headers = await getAuthHeaders();
  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  const response = await fetch(url.toString(), options);
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body?.error?.message || body?.detail || `Request failed: ${response.status}`);
  }

  const envelope = await response.json();
  if (envelope.error) {
    throw new Error(envelope.error.message || "Unknown error");
  }
  return envelope.data;
}

export async function fetchInNeed(lat, lng) {
  return apiCall("GET", "/api/rescue/in-need", null, { lat, lng });
}

export async function claimAssignment(targetUserId) {
  return apiCall("POST", "/api/rescue/assignments", { target_user_id: targetUserId });
}

export async function updateAssignment(assignmentId, body) {
  return apiCall("PUT", `/api/rescue/assignments/${assignmentId}`, body);
}

export async function fetchMyAssignments(activeOnly = false) {
  return apiCall("GET", "/api/rescue/assignments", null, { active_only: activeOnly });
}

export async function fetchActiveForTarget(targetUserId) {
  try {
    const url = new URL(`/api/rescue/active-for-target/${targetUserId}`, getBackendUrl());
    const response = await fetch(url.toString());
    if (!response.ok) return null;
    const envelope = await response.json();
    if (envelope.error) return null;
    return envelope.data;
  } catch {
    return null;
  }
}

export async function fetchRescuerProfile() {
  return apiCall("GET", "/api/rescue/me");
}

export async function updateRescuerProfile(body) {
  return apiCall("PUT", "/api/rescue/me", body);
}

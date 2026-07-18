import { getSession } from "./auth";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

async function getAuthToken() {
  const session = await getSession();
  if (!session?.access_token) throw new Error("Not authenticated");
  return session.access_token;
}

async function apiCall(method, path, body = null, params = {}) {
  const token = await getAuthToken();
  const url = new URL(path, BACKEND_URL);
  Object.entries(params).forEach(([k, v]) => {
    if (v != null) url.searchParams.set(k, String(v));
  });

  const response = await fetch(url.toString(), {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data?.error?.message || data?.detail || `Request failed: ${response.status}`);
  }

  const envelope = await response.json();
  if (envelope.error) throw new Error(envelope.error.message || "Unknown error");
  return envelope.data;
}

export async function fetchAdminRescuers(search = "", page = 1, limit = 50, orderBy = null, orderDir = null) {
  const params = { search, page, limit };
  if (orderBy) params.order_by = orderBy;
  if (orderDir) params.order_dir = orderDir;
  return apiCall("GET", "/api/admin/rescuers", null, params);
}

export async function fetchRescueActivity(page = 1, limit = 50, state = null, orderBy = null, orderDir = null, includeDeleted = false, deletedOnly = false) {
  const params = { page, limit, include_deleted: includeDeleted, deleted_only: deletedOnly };
  if (state) params.state = state;
  if (orderBy) params.order_by = orderBy;
  if (orderDir) params.order_dir = orderDir;
  return apiCall("GET", "/api/admin/rescue-activity", null, params);
}

export async function adminUpdateRescuer(userId, body) {
  return apiCall("PUT", `/api/admin/rescuers/${userId}`, body);
}

export async function deleteRescueAssignment(assignmentId) {
  return apiCall("DELETE", `/api/admin/rescue-assignments/${assignmentId}`);
}

export async function restoreRescueAssignment(assignmentId) {
  return apiCall("POST", `/api/admin/rescue-assignments/${assignmentId}/restore`);
}

export async function fetchInNeed() {
  return apiCall("GET", "/api/rescue/in-need");
}

// Use updateUserRole from services/auth for role changes

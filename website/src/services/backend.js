const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

async function getAuthHeaders() {
  try {
    const { supabase } = await import("./supabase.js");
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      return { Authorization: `Bearer ${session.access_token}` };
    }
  } catch {}
  return {};
}

export async function apiGet(path, params = {}) {
  const url = new URL(path, BACKEND_URL);
  Object.entries(params).forEach(([k, v]) => {
    if (v != null) url.searchParams.set(k, v);
  });

  const headers = await getAuthHeaders();
  const res = await fetch(url.toString(), { headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Request failed: ${res.status}`);
  }

  const envelope = await res.json();
  if (envelope.error) {
    throw new Error(envelope.error.message || "Unknown error");
  }

  return envelope.data;
}

export async function apiPost(path, body) {
  const isFormData = body instanceof FormData;
  const headers = await getAuthHeaders();
  if (!isFormData) headers["Content-Type"] = "application/json";
  const res = await fetch(`${BACKEND_URL}${path}`, {
    method: "POST",
    headers,
    body: isFormData ? body : JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Request failed: ${res.status}`);
  }
  const envelope = await res.json();
  if (envelope.error) {
    throw new Error(envelope.error.message || "Unknown error");
  }
  return envelope.data;
}

export async function apiPut(path, body) {
  const isFormData = body instanceof FormData;
  const headers = await getAuthHeaders();
  if (!isFormData) headers["Content-Type"] = "application/json";
  const res = await fetch(`${BACKEND_URL}${path}`, {
    method: "PUT",
    headers,
    body: isFormData ? body : JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Request failed: ${res.status}`);
  }
  const envelope = await res.json();
  if (envelope.error) {
    throw new Error(envelope.error.message || "Unknown error");
  }
  return envelope.data;
}

export async function apiDelete(path) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${BACKEND_URL}${path}`, { method: "DELETE", headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Request failed: ${res.status}`);
  }
  const envelope = await res.json();
  if (envelope.error) {
    throw new Error(envelope.error.message || "Unknown error");
  }
  return null;
}

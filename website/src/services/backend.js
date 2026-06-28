const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:8000";

export async function apiGet(path, params = {}) {
  const url = new URL(path, BACKEND_URL);
  Object.entries(params).forEach(([k, v]) => {
    if (v != null) url.searchParams.set(k, v);
  });

  const res = await fetch(url.toString());
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
  const res = await fetch(`${BACKEND_URL}${path}`, {
    method: "POST",
    headers: isFormData ? {} : { "Content-Type": "application/json" },
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
  const res = await fetch(`${BACKEND_URL}${path}`, {
    method: "PUT",
    headers: isFormData ? {} : { "Content-Type": "application/json" },
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
  const res = await fetch(`${BACKEND_URL}${path}`, { method: "DELETE" });
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

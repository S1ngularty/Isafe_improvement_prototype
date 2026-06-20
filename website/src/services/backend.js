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

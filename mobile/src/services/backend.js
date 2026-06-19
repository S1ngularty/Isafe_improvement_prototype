const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || "http://localhost:8000";

export async function apiGet(path, params = {}) {
  const url = new URL(path, BACKEND_URL);
  Object.entries(params).forEach(([k, v]) => {
    if (v != null) url.searchParams.set(k, String(v));
  });

  const response = await fetch(url.toString());
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.detail || `Request failed: ${response.status}`);
  }

  const envelope = await response.json();
  if (envelope.error) {
    throw new Error(envelope.error.message || "Unknown error");
  }

  return envelope.data;
}

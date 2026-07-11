import { getBackendUrl } from "./backendConfig.js";

export async function apiGet(path, params = {}) {
  const url = new URL(path, getBackendUrl());
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

export async function apiPost(path, body = {}) {
  const url = new URL(path, getBackendUrl());
  const response = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `Request failed: ${response.status}`);
  }

  const envelope = await response.json();
  if (envelope.error) {
    throw new Error(envelope.error.message || "Unknown error");
  }

  return envelope.data;
}

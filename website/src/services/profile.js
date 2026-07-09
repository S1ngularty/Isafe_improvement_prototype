import { supabase, getStorageUrl } from "./supabase.js";

const API_URL = import.meta.env.VITE_BACKEND_URL || "http://192.168.1.11:8000";

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Not authenticated");
  return {
    "Content-Type": "application/json",
    "Accept": "application/json",
    "Authorization": `Bearer ${session.access_token}`,
  };
}

export async function sendPhoneOtp(phoneNumber) {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/api/profile/send-phone-otp`, {
    method: "POST",
    headers,
    body: JSON.stringify({ phone_number: phoneNumber }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || data.message || "Failed to send OTP");
  return data;
}

export async function verifyPhoneOtp(code) {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/api/profile/verify-phone`, {
    method: "POST",
    headers,
    body: JSON.stringify({ code }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || data.message || "Verification failed");
  return data;
}

export async function removePhone() {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/api/profile/phone`, {
    method: "DELETE",
    headers,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || data.message || "Failed to remove phone");
  return data;
}

export async function updateProfile(updates) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { error } = await supabase.from("profiles").update(updates).eq("id", user.id);
  if (error) throw new Error(error.message);
}

export async function uploadAvatar(file) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${user.id}/avatar.${ext}`;
  const { error: uploadErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
  if (uploadErr) throw new Error(uploadErr.message);
  const avatarUrl = getStorageUrl("avatars", path);
  await updateProfile({ avatar_url: avatarUrl });
  return avatarUrl;
}

export async function removeAvatar() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { data: profile } = await supabase.from("profiles").select("avatar_url").eq("id", user.id).maybeSingle();
  const path = extractPath(profile?.avatar_url);
  if (path) await supabase.storage.from("avatars").remove([path]);
  await updateProfile({ avatar_url: null });
}

function extractPath(url) {
  if (!url) return null;
  try { const parts = new URL(url).pathname.split("/public/avatars/"); return parts[1] || null; } catch { return null; }
}

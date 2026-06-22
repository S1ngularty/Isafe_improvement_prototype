import { supabase, getStorageUrl } from "./supabase.js";

export async function updateProfile(updates) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { error } = await supabase.from("profiles").update(updates).eq("id", user.id);
  if (error) throw new Error(error.message);
}

export async function uploadAvatar(uri) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const ext = uri.split(".").pop() || "jpg";
  const path = `${user.id}/avatar.${ext}`;
  const response = await fetch(uri);
  const blob = await response.blob();
  const { error: uploadErr } = await supabase.storage.from("avatars").upload(path, blob, { upsert: true, contentType: `image/${ext}` });
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
  try { const parts = url.split("/public/avatars/"); return parts[1] || null; } catch { return null; }
}

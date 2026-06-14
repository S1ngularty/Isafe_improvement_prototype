import { supabase } from "./supabase.js";

export async function signUp(email, password, metadata = {}) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: metadata },
  });
  if (error) throw error;
  return data;
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function verifyOtp(tokenHash, type = "signup") {
  const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
  if (error) throw error;
  return data;
}

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function getUserRole() {
  const user = await getCurrentUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .maybeSingle();
  if (error || !data) return "user";
  return data.role;
}

export async function getProfile() {
  const user = await getCurrentUser();
  console.log("[getProfile] user:", user?.id, user?.email);
  if (!user) {
    console.log("[getProfile] no user found, returning null");
    return null;
  }
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  console.log("[getProfile] query result:", data, "error:", error);
  if (error) {
    console.log("[getProfile] query error:", error);
    return null;
  }
  if (!data) {
    console.log("[getProfile] no profile row found for user — attempting insert");
    const { error: insertErr } = await supabase
      .from("profiles")
      .insert({ id: user.id, role: "user" });
    console.log("[getProfile] insert result error:", insertErr);
    if (insertErr) return null;
    return { id: user.id, role: "user", status: "safe", is_active: true };
  }
  console.log("[getProfile] profile data:", data);
  return data;
}

export async function updateProfile(updates) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Admin functions (for future admin panel on mobile)
export async function fetchAllProfiles() {
  const { data, error } = await supabase.rpc("get_all_profiles");
  if (error) throw error;
  return data;
}

export async function updateUserRole(userId, role) {
  const { error } = await supabase
    .from("profiles")
    .update({ role })
    .eq("id", userId);
  if (error) throw error;
}

export async function toggleUserActive(userId, isActive) {
  const { error } = await supabase
    .from("profiles")
    .update({ is_active: isActive })
    .eq("id", userId);
  if (error) throw error;
}

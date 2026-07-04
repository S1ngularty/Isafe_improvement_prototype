import { supabase } from "./supabase.js";

function isNetworkUnavailableError(error) {
  const message = error?.message?.toLowerCase?.() ?? "";
  return (
    error?.status === 0 ||
    error?.code === "NETWORK_ERROR" ||
    error?.name === "TypeError" ||
    message.includes("network") ||
    message.includes("fetch failed") ||
    message.includes("offline") ||
    message.includes("timeout")
  );
}

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
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function verifyOtp(token, type = "signup", email) {
  const { data, error } = await supabase.auth.verifyOtp({ email, token, type });
  if (error) throw error;
  return data;
}

export async function resendOtp(email, type = "signup") {
  const { data, error } = await supabase.auth.resend({ type, email });
  if (error) throw error;
  return data;
}

export async function getSession() {
  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();
    if (error) throw error;
    return session;
  } catch (error) {
    if (isNetworkUnavailableError(error)) {
      return null;
    }
    throw error;
  }
}

export async function getCurrentUser() {
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error) {
      if (
        error.name === "AuthSessionMissingError" ||
        error.status === 401 ||
        error.status === 403
      ) {
        return null;
      }
      if (isNetworkUnavailableError(error)) {
        return null;
      }
      throw error;
    }
    return user;
  } catch (error) {
    if (isNetworkUnavailableError(error)) {
      return null;
    }
    throw error;
  }
}

export async function getUserRole() {
  const user = await getCurrentUser();
  if (!user) return null;
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("role, is_active")
      .eq("id", user.id)
      .maybeSingle();
    if (error || !data) return "user";
    return data.role;
  } catch (error) {
    if (isNetworkUnavailableError(error)) {
      return "user";
    }
    throw error;
  }
}

export async function getProfile() {
  const user = await getCurrentUser();

  if (!user) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      return null;
    }
    if (!data) {
      const { error: insertErr } = await supabase
        .from("profiles")
        .insert({ id: user.id, role: "user" });

      if (insertErr) return null;
      return { id: user.id, role: "user", status: "safe", is_active: true };
    }

    return data;
  } catch (error) {
    if (isNetworkUnavailableError(error)) {
      return null;
    }
    throw error;
  }
}

export async function updateUserProfile(updates) {
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

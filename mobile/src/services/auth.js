// services/auth.js
import { supabase } from "./supabase.js";

// Use your Expo public environment variable
const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://192.168.1.11:8000';

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

// UPDATED: Sign up through backend
export async function signUp(email, password, metadata = {}) {
  try {
    const response = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        full_name: metadata.full_name || 'User',
        phone_number: metadata.phone_number || '',
        street_address: metadata.street_address || '',
        date_of_birth: metadata.date_of_birth || '',
        barangay_id: metadata.barangay_id,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      // Handle different error formats
      const errorMessage = data.detail || data.message || 'Registration failed';
      throw new Error(errorMessage);
    }
    
    return data; // Returns { success: true, message: "...", email: "...", requires_verification: true }
  } catch (error) {
    console.error('SignUp error:', error);
    throw error;
  }
}

// UPDATED: Verify OTP through backend
export async function verifyOtp(token, type = "signup", email) {
  try {
    const response = await fetch(`${API_URL}/api/auth/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        email,
        verification_code: token,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      const errorMessage = data.detail || data.message || 'Verification failed';
      throw new Error(errorMessage);
    }
    
    // After successful verification, we can optionally sign in the user automatically
    if (data.success && data.user_id) {
      // You might want to auto-sign in here, or let user sign in manually
      return data;
    }
    
    return data;
  } catch (error) {
    console.error('Verify OTP error:', error);
    throw error;
  }
}

// UPDATED: Resend OTP through backend
export async function resendOtp(email, type = "signup") {
  try {
    const response = await fetch(`${API_URL}/api/auth/resend-verification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      const errorMessage = data.detail || data.message || 'Failed to resend code';
      throw new Error(errorMessage);
    }
    
    return data;
  } catch (error) {
    console.error('Resend OTP error:', error);
    throw error;
  }
}

// UNCHANGED: Sign in directly with Supabase
export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

// UNCHANGED: Sign out
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// UNCHANGED: Get session
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

// UNCHANGED: Get current user
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

// UNCHANGED: Get user role
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

// UNCHANGED: Get profile
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

// UNCHANGED: Update user profile
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

// UNCHANGED: Admin functions
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
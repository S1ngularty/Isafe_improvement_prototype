// services/auth.js (Website)
import { supabase } from "./supabase.js";
import { apiGet } from "./backend.js";

// Use your backend URL from environment
const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://192.168.1.11:8000';

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
export async function verifyOtp(verificationCode, email) {
  try {
    const response = await fetch(`${API_URL}/api/auth/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        email,
        verification_code: verificationCode,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      const errorMessage = data.detail || data.message || 'Verification failed';
      throw new Error(errorMessage);
    }
    
    return data;
  } catch (error) {
    console.error('Verify OTP error:', error);
    throw error;
  }
}

// UPDATED: Resend OTP through backend
export async function resendOtp(email) {
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
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
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
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

// UNCHANGED: Get current user
export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// UNCHANGED: Get user role
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

// UNCHANGED: Get profile
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

// UNCHANGED: Admin functions
export async function fetchAllProfiles(page = 1, pageSize = 50, search = null, orderBy = null, orderDir = null) {
  const params = {
    page,
    limit: pageSize,
  };
  if (search) params.search = search;
  if (orderBy) params.order_by = orderBy;
  if (orderDir) params.order_dir = orderDir;
  return apiGet("/api/admin/profiles", params);
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

// UNCHANGED: Auth state change listener
export function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });
}
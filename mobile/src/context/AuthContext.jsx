import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { getSession, getCurrentUser, getUserRole, getProfile, signOut } from "../services/auth.js";
import { supabase } from "../services/supabase.js";

const AuthContext = createContext();
const PROFILE_TIMEOUT_MS = 8000;

function withTimeout(promise, label, timeoutMs = PROFILE_TIMEOUT_MS) {
  let timer;
  return Promise.race([
    promise.finally(() => clearTimeout(timer)),
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label} timed out`)), timeoutMs);
    }),
  ]);
}

async function hydrateUserData() {
  const [currentUserResult, roleResult, profileResult] = await Promise.allSettled([
    withTimeout(getCurrentUser(), "Loading current user"),
    withTimeout(getUserRole(), "Loading user role"),
    withTimeout(getProfile(), "Loading user profile"),
  ]);

  return {
    currentUser: currentUserResult.status === "fulfilled" ? currentUserResult.value : null,
    userRole: roleResult.status === "fulfilled" ? roleResult.value : null,
    userProfile: profileResult.status === "fulfilled" ? profileResult.value : null,
  };
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshSession = useCallback(async () => {
    try {
      const sess = await getSession();
      if (sess?.user) {
        const { currentUser, userRole, userProfile } = await hydrateUserData();
        setUser(currentUser);
        setRole(userRole);
        setProfile(userProfile);
        setSession(sess);
      } else {
        setSession(null);
        setUser(null);
        setRole(null);
        setProfile(null);
      }
    } catch (error) {
      console.error("[AuthContext] Error refreshing session:", error);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await refreshSession();
      } catch (error) {
        console.error("[AuthContext] Error loading session:", error);
      } finally {
        setLoading(false);
      }
    })();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log("[AuthContext] Auth state changed:", event);
        
        if (newSession?.user) {
          try {
            const { currentUser, userRole, userProfile } = await hydrateUserData();
            setUser(currentUser);
            setRole(userRole);
            setProfile(userProfile);
            setSession(newSession);
          } catch (error) {
            console.error("[AuthContext] Error updating user data:", error);
            setSession(newSession);
          }
        } else {
          setSession(null);
          setUser(null);
          setRole(null);
          setProfile(null);
        }
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const logout = useCallback(async () => {
    try {
      await signOut();
      setSession(null);
      setUser(null);
      setRole(null);
      setProfile(null);
    } catch (error) {
      console.error("[AuthContext] Logout error:", error);
      throw error;
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    if (data?.session?.user) {
      const userProfile = await getProfile();
      setProfile(userProfile);
    }
  }, []);

  const contextValue = useMemo(() => ({
    session, user, role, profile, loading, logout, refreshProfile, refreshSession
  }), [session, user, role, profile, loading, logout, refreshProfile, refreshSession]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

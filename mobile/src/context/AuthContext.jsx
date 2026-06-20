import React, { createContext, useContext, useState, useEffect } from "react";
import { getSession, getCurrentUser, getUserRole, getProfile, signOut } from "../services/auth.js";
import { supabase } from "../services/supabase.js";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshSession = async () => {
    try {
      const sess = await getSession();
      setSession(sess);
      if (sess?.user) {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
        const userRole = await getUserRole();
        setRole(userRole);
        const userProfile = await getProfile();
        setProfile(userProfile);
      } else {
        setSession(null);
        setUser(null);
        setRole(null);
        setProfile(null);
      }
    } catch (error) {
      console.error("[AuthContext] Error refreshing session:", error);
    }
  };

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
        setSession(newSession);
        
        if (newSession?.user) {
          try {
            const currentUser = await getCurrentUser();
            setUser(currentUser);
            const userRole = await getUserRole();
            setRole(userRole);
            const userProfile = await getProfile();
            setProfile(userProfile);
          } catch (error) {
            console.error("[AuthContext] Error updating user data:", error);
          }
        } else {
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

  const logout = async () => {
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
  };

  const refreshProfile = async () => {
    if (session?.user) {
      const userProfile = await getProfile();
      setProfile(userProfile);
    }
  };

  return (
    <AuthContext.Provider value={{ session, user, role, profile, loading, logout, refreshProfile, refreshSession }}>
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

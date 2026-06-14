import React, { createContext, useContext, useState, useEffect } from "react";
import { getSession, getCurrentUser, getUserRole, getProfile, signOut } from "../services/auth";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
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
        }
      } catch (error) {
        console.error("[AuthContext] Error loading session:", error);
      } finally {
        setLoading(false);
      }
    })();
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
    <AuthContext.Provider value={{ session, user, role, profile, loading, logout, refreshProfile }}>
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

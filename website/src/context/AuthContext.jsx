// context/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from "react";
import { getSession, onAuthStateChange, getUserRole, getProfile, signIn, signUp, signOut } from "../services/auth.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [role, setRole] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  async function refreshRole() {
    try {
      const r = await getUserRole();
      setRole(r);
      return r;
    } catch {
      setRole("user");
      return "user";
    }
  }

  async function refreshProfile() {
    try {
      const p = await getProfile();
      setProfile(p);
      return p;
    } catch {
      setProfile(null);
      return null;
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const s = await getSession();
        if (cancelled) return;
        setSession(s);
        if (s) {
          await refreshRole();
          await refreshProfile();
        }
      } catch {
        // session fetch failed — treat as logged out
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    init();

    const { data: { subscription } } = onAuthStateChange((s) => {
      setSession(s);
      if (s) {
        refreshRole();
        refreshProfile();
      } else {
        setRole(null);
        setProfile(null);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email, password) => {
    const { session: s } = await signIn(email, password);
    setSession(s);
    const p = await getProfile();
    if (p && p.is_active === false) {
      await signOut();
      setSession(null);
      setRole(null);
      setProfile(null);
      throw new Error("Your account has been deactivated. Contact an administrator.");
    }
    setProfile(p);
    const r = await refreshRole();
    return { session: s, role: r };
  };

  const signupFn = async (email, password, metadata = {}) => {
    // This now calls the backend API
    const result = await signUp(email, password, metadata);
    // Don't set session here - user needs to verify email first
    return result;
  };

  const logout = async () => {
    await signOut();
    setSession(null);
    setRole(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ session, role, profile, loading, login, signup: signupFn, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
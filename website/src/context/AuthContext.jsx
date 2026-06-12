import { createContext, useContext, useState, useEffect } from "react";
import { getSession, onAuthStateChange, getUserRole, getProfile, signIn, signUp, signOut } from "../js/auth.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [role, setRole] = useState(null);
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

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const s = await getSession();
        if (cancelled) return;
        setSession(s);
        if (s) await refreshRole();
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
      } else {
        setRole(null);
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
    const profile = await getProfile();
    if (profile && profile.is_active === false) {
      await signOut();
      setSession(null);
      setRole(null);
      throw new Error("Your account has been deactivated. Contact an administrator.");
    }
    const r = await refreshRole();
    return { session: s, role: r };
  };

  const signupFn = async (email, password, metadata = {}) => {
    const data = await signUp(email, password, metadata);
    setSession(data.session);
    if (data.session) await refreshRole();
    return data;
  };

  const logout = async () => {
    await signOut();
    setSession(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{ session, role, loading, login, signup: signupFn, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

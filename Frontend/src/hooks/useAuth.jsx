import {
  useState,
  useEffect,
  useCallback,
  useContext,
  createContext,
} from "react";
import { api } from "../services/api.js";

const AuthContext = createContext(null);

/**
 * Normalizes a user object from the API into a consistent shape.
 * Returns null if the data is missing or lacks an email (required field).
 */
function normalizeUser(data) {
  if (!data || typeof data !== "object") return null;
  const email = data.email;
  if (!email || typeof email !== "string") return null;

  return {
    id: data.id || data._id,
    _id: data._id || data.id,
    name: data.name,
    email: data.email,
    role: data.role,
    department: data.department,
    profileImage: data.profileImage || "",
  };
}

/**
 * Persists the user object to localStorage so auth survives page reloads.
 * Wrapped in try/catch to avoid errors in environments where localStorage
 * is unavailable (e.g., private browsing, SSR).
 */
function persistUser(user) {
  try {
    if (user) {
      localStorage.setItem("user", JSON.stringify(user));
    } else {
      localStorage.removeItem("user");
    }
  } catch {
    // localStorage may be unavailable — silently ignore
  }
}

/**
 * Reads the persisted user from localStorage on startup.
 * Returns null if no user is stored or if parsing fails.
 */
function getPersistedUser() {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    return normalizeUser(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getPersistedUser());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * checkAuth — Verifies the current session by calling /auth/me.
   * On success, normalizes and persists the user.
   * On failure (e.g., no session), clears user state.
   * Always clears loading when done.
   */
  const checkAuth = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getMe();
      const normalized = normalizeUser(res);
      if (!normalized) {
        setUser(null);
        persistUser(null);
        return;
      }
      setUser(normalized);
      persistUser(normalized);
    } catch {
      setUser(null);
      persistUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Only ask the server to revalidate a session when there's evidence
    // one might exist (a cached user from a previous login on this
    // browser). A brand-new / logged-out visitor has no cached user, so
    // skip the /auth/me call entirely — there's nothing to revalidate,
    // and calling it anyway just produces a guaranteed, meaningless 401.
    if (getPersistedUser()) {
      checkAuth();
    } else {
      setLoading(false);
    }

    // Listen for logout events dispatched from other tabs or components.
    const handleLogout = () => {
      setUser(null);
      persistUser(null);
    };
    window.addEventListener("auth:logout", handleLogout);

    return () => {
      window.removeEventListener("auth:logout", handleLogout);
    };
  }, [checkAuth]);

  /**
   * login — Authenticates with email/password.
   * On success, stores the normalized user in state and localStorage.
   * On failure, sets the error state and returns a result object.
   */
  const login = useCallback(async (email, password) => {
    // NOTE: deliberately does NOT touch `loading` — that flag drives
    // GuestRoute/ProtectedRoute's initial-session-check gate. Flipping it
    // here unmounts the Login page mid-submit (swapped for LoadingScreen)
    // and remounts a fresh one afterward, which throws away the error
    // this function is about to set. Login.jsx already tracks its own
    // local `loading` state for the submit button.
    setError(null);
    try {
      const res = await api.login(email, password);

      const normalized = normalizeUser(res.user);
      if (!normalized) {
        throw new Error("Invalid login response from server");
      }
      setUser(normalized);
      persistUser(normalized);
      return { success: true, user: normalized };
    } catch (err) {
      const msg = err.message || "Login failed";
      setError(msg);
      setUser(null);
      persistUser(null);
      return { success: false, error: msg };
    }
  }, []);

  /**
   * logout — Calls the server logout endpoint, then clears local state.
   * Silently ignores logout API failures so the user is still logged out locally.
   */
  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch (err) {
      console.warn("Logout request completed with error", err);
    }
    setUser(null);
    persistUser(null);
  }, []);

  const roleName =
    typeof user?.role === "object" ? user.role?.name : user?.role;

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user?.email,
        isAdmin: roleName?.toLowerCase() === "admin",
        loading,
        error,
        login,
        logout,
        refresh: checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/**
 * useAuth — Hook to access the AuthContext.
 * Throws if used outside of an AuthProvider.
 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
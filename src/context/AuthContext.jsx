import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { authApi } from "../api/auth.api";
import { AUTH_EVENTS } from "../utils/constants";
import { tokenStorage } from "../utils/tokenStorage";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  const [loading, setLoading] = useState(
    () => Boolean(tokenStorage.get())
  );

  // ==========================================
  // RESTORE SESSION
  // ==========================================

  const refreshUser = useCallback(async () => {
    try {
      const currentUser = await authApi.me();

      setUser(currentUser);

      return currentUser;
    } catch (error) {
      tokenStorage.clear();
      setUser(null);

      throw error;
    }
  }, []);

  // ==========================================
  // INITIAL SESSION CHECK
  // ==========================================

  useEffect(() => {
    const token = tokenStorage.get();

    if (!token) {
      setLoading(false);
      return;
    }

    refreshUser()
      .catch(() => {
        setUser(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [refreshUser]);

  // ==========================================
  // UNAUTHORIZED EVENT
  // ==========================================

  useEffect(() => {
    const handleUnauthorized = () => {
      tokenStorage.clear();
      setUser(null);
    };

    window.addEventListener(
      AUTH_EVENTS.UNAUTHORIZED,
      handleUnauthorized
    );

    return () => {
      window.removeEventListener(
        AUTH_EVENTS.UNAUTHORIZED,
        handleUnauthorized
      );
    };
  }, []);

  // ==========================================
  // LOGIN
  // ==========================================

  const login = useCallback(
    async ({ email, password, remember = true }) => {
      const response = await authApi.login({
        email,
        password,
      });

      // Save token
      if (response?.access_token) {
        tokenStorage.set(
          response.access_token,
          remember
        );
      }

      // IMPORTANT:
      // Login API already returns user.
      // So don't call /users/me here.

      if (response?.user) {
        setUser(response.user);
      }

      setLoading(false);

      return response;
    },
    []
  );

  // ==========================================
  // REGISTER
  // ==========================================

  const register = useCallback(
    async (payload) => {
      return await authApi.register(payload);
    },
    []
  );

  // ==========================================
  // GOOGLE / APPLE
  // ==========================================

  const loginWithProvider = useCallback(
    async () => {
      throw new Error(
        "Google/Apple login is not implemented yet."
      );
    },
    []
  );

  // ==========================================
  // LOGOUT
  // ==========================================

  const logout = useCallback(() => {
    tokenStorage.clear();
    setUser(null);
  }, []);

  // ==========================================
  // CONTEXT VALUE
  // ==========================================

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      loading,

      login,
      register,
      logout,

      loginWithProvider,

      refreshUser,
    }),
    [
      user,
      loading,
      login,
      register,
      logout,
      loginWithProvider,
      refreshUser,
    ]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
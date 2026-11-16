import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, setUnauthorizedHandler, tokenStore } from './api';
import { useToast } from './toast';

const AuthContext = createContext(null);

export const ROLE_HOME = { admin: '/admin/dashboard', recruiter: '/recruiter/dashboard', user: '/dashboard' };

export function AuthProvider({ children }) {
  const toast = useToast();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(() => Boolean(tokenStore.get()));

  const logout = useCallback((message) => {
    tokenStore.clear();
    setUser(null);
    if (typeof message === 'string' && message) toast.error(message);
  }, [toast]);

  useEffect(() => {
    setUnauthorizedHandler((message) => logout(/blocked|inactive/i.test(message) ? message : 'Your session expired. Please sign in again.'));
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  // Restore session on first load
  useEffect(() => {
    let cancelled = false;
    if (!tokenStore.get()) return undefined;
    api
      .get('/auth/me')
      .then((u) => !cancelled && setUser(u))
      .catch(() => !cancelled && tokenStore.clear())
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const finishAuth = useCallback((data, remember = true) => {
    // second step needed: hand the challenge back to the caller instead of signing in
    if (data && data.requires_2fa) return { requires_2fa: true, method: data.method, challenge_token: data.challenge_token, dev_code: data.dev_code };
    tokenStore.set(data.access_token, remember);
    setUser(data.user);
    return data.user;
  }, []);

  const login = useCallback(async (email, password, remember = true) => finishAuth(await api.post('/auth/login', { email, password }, { auth: false }), remember), [finishAuth]);
  const verify2fa = useCallback(async (challengeToken, code, remember = true) => finishAuth(await api.post('/auth/2fa/verify', { challenge_token: challengeToken, code: String(code).trim() }, { auth: false }), remember), [finishAuth]);
  const loginWithGoogle = useCallback(async (credential, remember = true, role = 'user') => {
    const r = await api.post('/auth/google', { access_token: credential, role }, { auth: false });
    if (r && r.requires_2fa) throw new Error('This account uses two-step verification. Please sign in with your email and password.');
    return finishAuth(r, remember);
  }, [finishAuth]);
  const register = useCallback(async (payload) => finishAuth(await api.post('/auth/register', payload, { auth: false })), [finishAuth]);
  const refreshUser = useCallback(async () => {
    const u = await api.get('/auth/me');
    setUser(u);
    return u;
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, verify2fa, loginWithGoogle, register, logout, refreshUser, isAuthenticated: Boolean(user) }),
    [user, loading, login, verify2fa, loginWithGoogle, register, logout, refreshUser],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

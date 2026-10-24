import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import authService from '../services/authService.js';

export const TOKEN_KEY = 'skillbridge.token';
export const USER_KEY = 'skillbridge.user';

const AuthContext = createContext(null);

function readToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function readStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function persist(token, user) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
  } catch {
    // storage unavailable: keep session in memory only
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => readToken());
  const [user, setUser] = useState(() => readStoredUser());
  const [initializing, setInitializing] = useState(Boolean(readToken()));

  useEffect(() => {
    let alive = true;
    if (!readToken()) {
      setInitializing(false);
      return undefined;
    }
    authService
      .me()
      .then((payload) => {
        if (!alive) return;
        const current = readToken();
        // /auth/me replies with the envelope { data: { user } }.
        const body = payload?.data ?? payload ?? {};
        const freshUser = body?.user ?? null;
        setUser(freshUser);
        setToken(current);
        persist(current, freshUser);
        setInitializing(false);
      })
      .catch((err) => {
        if (!alive) return;
        if (err?.status === 401) {
          persist(null, null);
          setToken(null);
          setUser(null);
        }
        setInitializing(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const applyAuth = useCallback(async (promise) => {
    // The auth endpoints return the envelope { data: { user, token } }.
    const payload = await promise;
    const body = payload?.data ?? payload ?? {};
    const nextToken = body?.token ?? null;
    const nextUser = body?.user ?? null;
    persist(nextToken, nextUser);
    setToken(nextToken);
    setUser(nextUser);
    return nextUser;
  }, []);

  const login = useCallback((email, password) => applyAuth(authService.login(email, password)), [applyAuth]);

  const register = useCallback((formPayload) => applyAuth(authService.register(formPayload)), [applyAuth]);

  const logout = useCallback(() => {
    persist(null, null);
    setToken(null);
    setUser(null);
  }, []);

  const updateUser = useCallback((nextUser) => {
    setUser(nextUser ?? null);
    persist(token, nextUser ?? null);
  }, [token]);

  const value = useMemo(
    () => ({ user, token, initializing, login, register, logout, setUser: updateUser }),
    [user, token, initializing, login, register, logout, updateUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthContext;

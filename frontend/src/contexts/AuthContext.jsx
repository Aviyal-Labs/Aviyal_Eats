import { useCallback, useEffect, useMemo, useState } from 'react';
import { authApi } from '../api/authApi';
import AuthContext from './AuthContextValue';
export function AuthProvider({ children }) {
  const [state, setState] = useState({ accessToken: null, user: null, restaurant: null, isAuthenticated: false, isBootstrapping: true });
  const clearSession = useCallback(() => setState({ accessToken: null, user: null, restaurant: null, isAuthenticated: false, isBootstrapping: false }), []);
  const broadcastLogout = useCallback(() => { if (typeof BroadcastChannel !== 'undefined') { const channel = new BroadcastChannel('loyalty-auth'); channel.postMessage({ type: 'logout' }); channel.close(); } }, []);
  const login = useCallback(async (credentials) => { const result = await authApi.login(credentials); setState({ ...result, isAuthenticated: true, isBootstrapping: false }); return result; }, []);
  const logout = useCallback(async () => { await authApi.logout(); clearSession(); broadcastLogout(); }, [broadcastLogout, clearSession]);
  const logoutAll = useCallback(async () => { await authApi.logoutAll(); clearSession(); broadcastLogout(); }, [broadcastLogout, clearSession]);
  const setSession = useCallback((data) => setState((current) => ({ ...current, ...data, isAuthenticated: true, isBootstrapping: false })), []);
  useEffect(() => { let active = true; authApi.restoreSession().then((session) => { if (active && session) setSession(session); }).catch(() => {}).finally(() => { if (active) setState((current) => ({ ...current, isBootstrapping: false })); }); return () => { active = false; }; }, [setSession]);
  useEffect(() => { if (typeof BroadcastChannel === 'undefined') return undefined; const channel = new BroadcastChannel('loyalty-auth'); channel.onmessage = (event) => { if (event.data?.type === 'logout') clearSession(); }; return () => channel.close(); }, [clearSession]);
  const value = useMemo(() => ({ ...state, login, logout, logoutAll, setSession }), [state, login, logout, logoutAll, setSession]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

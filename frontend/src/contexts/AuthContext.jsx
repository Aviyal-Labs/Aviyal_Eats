import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { authApi } from '../api/authApi';
import AuthContext from './AuthContextValue';
import { onSessionExpired, tokenStore } from '../api/client';

const emptySession = { accessToken: null, user: null, restaurant: null, isAuthenticated: false, isBootstrapping: false };

export function AuthProvider({ children }) {
  const [state, setState] = useState({ ...emptySession, isBootstrapping: true });
  const [bootstrapError, setBootstrapError] = useState('');
  const [restoreAttempt, setRestoreAttempt] = useState(0);
  const sessionVersion = useRef(0);
  const retrySession = useCallback(() => setRestoreAttempt((attempt) => attempt + 1), []);

  const clearSession = useCallback(() => {
    sessionVersion.current += 1;
    tokenStore.clear();
    setBootstrapError('');
    setState(emptySession);
  }, []);
  const setSession = useCallback((data) => {
    sessionVersion.current += 1;
    setBootstrapError('');
    setState((current) => ({ ...current, ...data, isAuthenticated: true, isBootstrapping: false }));
  }, []);
  const broadcastLogout = useCallback(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const channel = new BroadcastChannel('loyalty-auth');
    channel.postMessage({ type: 'logout' });
    channel.close();
  }, []);
  const login = useCallback(async (credentials) => {
    const session = await authApi.login(credentials);
    setSession(session);
    return session;
  }, [setSession]);
  const googleLogin = useCallback(async (credential) => {
    const session = await authApi.googleLogin(credential);
    setSession(session);
    return session;
  }, [setSession]);
  const googleSignup = useCallback(async (credential, values) => {
    const session = await authApi.googleSignup(credential, values);
    setSession(session);
    return session;
  }, [setSession]);
  const logout = useCallback(async () => {
    await authApi.logout();
    clearSession();
    broadcastLogout();
  }, [broadcastLogout, clearSession]);
  const logoutAll = useCallback(async () => {
    await authApi.logoutAll();
    clearSession();
    broadcastLogout();
  }, [broadcastLogout, clearSession]);
  const refreshProfile = useCallback(async () => {
    const profile = await authApi.me();
    setSession(profile);
    return profile;
  }, [setSession]);
  const resetPassword = useCallback(async (values) => {
    const result = await authApi.resetPassword(values);
    clearSession();
    broadcastLogout();
    return result;
  }, [clearSession, broadcastLogout]);

  useEffect(() => {
    let active = true;
    const version = sessionVersion.current;
    setBootstrapError('');
    setState((current) => ({ ...current, isBootstrapping: true }));
    authApi.restoreSession().then((session) => {
      if (active && version === sessionVersion.current && session) setSession(session);
    }).catch(() => {
      if (active && version === sessionVersion.current) setBootstrapError('Unable to restore your session. Check your connection and try again.');
    }).finally(() => {
      if (active && version === sessionVersion.current) setState((current) => ({ ...current, isBootstrapping: false }));
    });
    return () => { active = false; };
  }, [setSession, restoreAttempt]);
  useEffect(() => onSessionExpired(clearSession), [clearSession]);
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return undefined;
    const channel = new BroadcastChannel('loyalty-auth');
    channel.onmessage = (event) => { if (event.data?.type === 'logout') clearSession(); };
    return () => channel.close();
  }, [clearSession]);

  const value = useMemo(() => ({ ...state, bootstrapError, retrySession, login, googleLogin, googleSignup, logout, logoutAll, resetPassword, refreshProfile, setSession }),
    [state, bootstrapError, retrySession, login, googleLogin, googleSignup, logout, logoutAll, resetPassword, refreshProfile, setSession]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
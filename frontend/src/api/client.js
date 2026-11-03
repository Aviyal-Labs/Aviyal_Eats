import axios from 'axios';
import { endpoints } from './endpoints.js';
export const apiClient = axios.create({ baseURL: import.meta.env?.VITE_API_BASE_URL || 'http://localhost:8000', timeout: 30000, withCredentials: true });
let accessToken = null;
let sessionVersion = 0;
export const tokenStore = {
  get: () => accessToken,
  set(token) { accessToken = token; },
  start(token) { accessToken = token; sessionVersion += 1; },
  clear() { accessToken = null; sessionVersion += 1; },
};
let csrfToken = null;
let csrfPromise = null;
let refreshPromise = null;
const sessionListeners = new Set();
const authUrls = new Set(Object.values(endpoints.auth).filter((url) => url !== endpoints.auth.me));

export function onSessionExpired(listener) {
  sessionListeners.add(listener);
  return () => sessionListeners.delete(listener);
}

export async function initializeCsrf() {
  if (csrfToken) return csrfToken;
  if (!csrfPromise) {
    csrfPromise = apiClient.get(endpoints.auth.csrf).then(({ data }) => {
      csrfToken = data.data.csrf_token;
      return csrfToken;
    }).finally(() => { csrfPromise = null; });
  }
  return csrfPromise;
}

export async function refreshAccessToken() {
  if (!refreshPromise) {
    const version = sessionVersion;
    refreshPromise = (async () => {
      const csrf = await initializeCsrf();
      const { data } = await apiClient.post(endpoints.auth.refresh, null, {
        headers: { 'X-CSRFToken': csrf },
      });
      if (version !== sessionVersion) throw new Error('Session changed. Please sign in again.');
      tokenStore.set(data.data.access_token);
      return data.data.access_token;
    })().catch((error) => {
      if (error.response?.status === 401 && version === sessionVersion) {
        tokenStore.clear();
        sessionListeners.forEach((listener) => listener());
      }
      throw error;
    }).finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

apiClient.interceptors.request.use((config) => {
  if (accessToken && !authUrls.has(config.url)) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

apiClient.interceptors.response.use((response) => response, async (error) => {
  const config = error.config;
  if (error.response?.status === 401 && config?.sessionRetried && !authUrls.has(config.url)) {
    tokenStore.clear();
    sessionListeners.forEach((listener) => listener());
    throw error;
  }
  if (error.response?.status !== 401 || !config || authUrls.has(config.url)
    || config.sessionRetried || !accessToken) throw error;
  config.sessionRetried = true;
  if (config.headers.Authorization === `Bearer ${accessToken}`) await refreshAccessToken();
  // Do not automatically replay a write. The user can explicitly retry it.
  if (!['get', 'head', 'options'].includes(config.method)) throw error;
  return apiClient.request(config);
});
export { default as mapApiError } from './errorMapper.js';

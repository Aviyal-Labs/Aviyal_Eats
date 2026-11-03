import axios from 'axios';
export const apiClient = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000', timeout: 30000, withCredentials: true });
let accessToken = null;
export const tokenStore = { get: () => accessToken, set: (token) => { accessToken = token; }, clear: () => { accessToken = null; } };
apiClient.interceptors.request.use((config) => { const token = tokenStore.get(); if (token) config.headers.Authorization = `Bearer ${token}`; return config; });
export function mapApiError(error) { const response = error?.response; const data = response?.data || {}; const headers = response?.headers; const requestId = headers?.['x-request-id'] || headers?.get?.('x-request-id') || null; const fields = data.errors && typeof data.errors === 'object' ? data.errors : response?.status === 400 && data && typeof data === 'object' ? Object.fromEntries(Object.entries(data).filter(([key]) => !['detail', 'message', 'code', 'errors'].includes(key))) : {}; return { status: response?.status, code: data.code, message: data.message || data.detail || error?.message || 'Something went wrong.', fields, requestId }; }

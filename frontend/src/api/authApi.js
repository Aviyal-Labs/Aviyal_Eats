import { apiClient, tokenStore } from './client';
import { endpoints } from './endpoints';
import { mockAuthApi } from './mocks/mockAuthApi';
const useMocks = import.meta.env.VITE_USE_MOCKS !== 'false';
export const authApi = {
  async login(data) { const result = useMocks ? await mockAuthApi.login(data) : (await apiClient.post(endpoints.auth.login, data)).data.data; tokenStore.set(result.accessToken || result.access_token); return { ...result, accessToken: result.accessToken || result.access_token }; },
  async logout() { tokenStore.clear(); return useMocks ? mockAuthApi.logout() : apiClient.post(endpoints.auth.logout); },
  async logoutAll() { tokenStore.clear(); return useMocks ? mockAuthApi.logoutAll() : apiClient.post(endpoints.auth.logoutAll); },
  async restoreSession() { const result = useMocks ? await mockAuthApi.restoreSession() : null; if (result?.accessToken) tokenStore.set(result.accessToken); return result; },
  register: (data) => useMocks ? mockAuthApi.register(data) : apiClient.post(endpoints.auth.register, data).then((r) => r.data.data),
  verifyEmail: (data) => useMocks ? mockAuthApi.verifyEmail(data) : apiClient.post(endpoints.auth.verifyEmail, data).then((r) => r.data.data),
  resendOtp: (data) => useMocks ? mockAuthApi.resendOtp(data) : apiClient.post(endpoints.auth.resendOtp, data).then((r) => r.data.data),
  requestPasswordReset: (data) => useMocks ? mockAuthApi.requestPasswordReset(data) : apiClient.post(endpoints.auth.passwordResetRequest, data).then((r) => r.data),
  resetPassword: (data) => useMocks ? mockAuthApi.resetPassword(data) : apiClient.post(endpoints.auth.passwordResetConfirm, data).then((r) => r.data),
};

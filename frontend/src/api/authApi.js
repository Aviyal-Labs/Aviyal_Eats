import { apiClient, initializeCsrf, refreshAccessToken, tokenStore } from './client.js';
import { endpoints } from './endpoints.js';

let restorePromise = null;

function acceptLoginResult(result) {
  tokenStore.start(result.access_token);
  return { ...result, accessToken: result.access_token };
}

export function isUnregisteredGoogleAccount(error) {
  const response = error.response;
  return error.config?.url === endpoints.auth.googleLogin
    && response?.status === 404
    && (response.data?.code === 'GOOGLE_ACCOUNT_NOT_REGISTERED'
      || response.data?.detail === 'Google account is not registered. Please complete restaurant signup.');
}

async function endSession(allDevices) {
  await refreshAccessToken();
  const csrf = await initializeCsrf();
  await apiClient.post(allDevices ? endpoints.auth.logoutAll : endpoints.auth.logout, null, {
    headers: { Authorization: `Bearer ${tokenStore.get()}`, 'X-CSRFToken': csrf },
  });
  tokenStore.clear();
}

export const authApi = {
  async login(credentials) {
    const { data } = await apiClient.post(endpoints.auth.login, credentials);
    return acceptLoginResult(data.data);
  },
  async googleLogin(credential) {
    const { data } = await apiClient.post(endpoints.auth.googleLogin, { credential });
    return acceptLoginResult(data.data);
  },
  async googleSignup(credential, values) {
    const { mobile, restaurant_name, restaurant_phone, city, requested_slug } = values;
    const { data } = await apiClient.post(endpoints.auth.googleSignup, {
      credential, mobile, restaurant_name, restaurant_phone, city, requested_slug,
    });
    return acceptLoginResult(data.data);
  },
  async me() {
    const { data } = await apiClient.get(endpoints.auth.me);
    return data.data;
  },
  logout: () => endSession(false),
  logoutAll: () => endSession(true),
  restoreSession() {
    // Share the rotating refresh request across concurrent bootstrap calls.
    if (!restorePromise) {
      restorePromise = (async () => {
        try {
          await refreshAccessToken();
          const session = await authApi.me();
          return { ...session, accessToken: tokenStore.get() };
        } catch (error) {
          if (error.response?.status === 401) return null;
          throw error;
        }
      })().finally(() => { restorePromise = null; });
    }
    return restorePromise;
  },
  async register(values) {
    const { owner_full_name, email, mobile, password, restaurant_name, restaurant_phone, city, slug } = values;
    const { data } = await apiClient.post(endpoints.auth.register, {
      owner_full_name, email, mobile, password, restaurant_name, restaurant_phone, city, slug,
    });
    return data.data;
  },
  async verifyEmail({ email, otp }) {
    return (await apiClient.post(endpoints.auth.verifyEmail, { email, otp })).data.data;
  },
  async resendOtp({ email }) {
    return (await apiClient.post(endpoints.auth.resendOtp, { email })).data.data;
  },
  async requestPasswordReset({ email }) {
    return (await apiClient.post(endpoints.auth.passwordResetRequest, { email })).data;
  },
  async resetPassword({ email, otp, new_password }) {
    return (await apiClient.post(endpoints.auth.passwordResetConfirm, { email, otp, new_password })).data;
  },
};

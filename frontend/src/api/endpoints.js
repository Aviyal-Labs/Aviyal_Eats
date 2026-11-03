const adminRestaurant = (id) => `/api/v1/admin/restaurants/${encodeURIComponent(id)}/`;

export const endpoints = {
  auth: {
    register: '/api/v1/auth/register/',
    verifyEmail: '/api/v1/auth/register/verify-otp/',
    resendOtp: '/api/v1/auth/register/resend-otp/',
    login: '/api/v1/auth/login/',
    me: '/api/v1/auth/me/',
    csrf: '/api/v1/auth/csrf/',
    refresh: '/api/v1/auth/refresh/',
    logout: '/api/v1/auth/logout/',
    logoutAll: '/api/v1/auth/logout-all/',
    passwordResetRequest: '/api/v1/auth/password-reset/request/',
    passwordResetConfirm: '/api/v1/auth/password-reset/confirm/',
    googleLogin: '/api/v1/auth/google/login/',
    googleSignup: '/api/v1/auth/google/signup/',
  },
  owner: {
    restaurant: '/api/v1/owner/restaurant/',
    resubmit: '/api/v1/owner/restaurant/resubmit/',
  },
  admin: {
    restaurants: '/api/v1/admin/restaurants/',
    restaurant: adminRestaurant,
    approve: (id) => `${adminRestaurant(id)}approve/`,
    reject: (id) => `${adminRestaurant(id)}reject/`,
  },
};

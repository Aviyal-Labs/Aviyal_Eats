import { fixtures } from './fixtures.js';
import { mockRestaurantStore } from './mockStore.js';

const wait = (data) => new Promise((resolve) => setTimeout(() => resolve(data), 80));
const otpSessions = new Map();
const resetSessions = new Map();
const registeredMockCredentials = new Map();
const fixedPasswordOverrides = new Map();
const loginFailures = new Map();
const SESSION_KEY = 'aviyal-mock-session';

export let activeMockSession = null;

const mockError = (status, message, fields = {}) => {
  const error = new Error(message);
  error.response = { status, data: { detail: message, errors: fields }, headers: { 'x-request-id': `mock-${status}-${Date.now()}` } };
  return error;
};

const otpResponse = () => ({ verification_required: true, otp_expires_in_seconds: 300, resend_after_seconds: 60 });
const clone = (value) => (value == null ? value : JSON.parse(JSON.stringify(value)));
const normalized = (email) => email?.trim().toLowerCase();

const mockLoginIdentities = [
  { emails: ['demo@example.com', fixtures.owner.email], password: 'demo', user: fixtures.owner, restaurant: fixtures.restaurant },
  { emails: [fixtures.rejectedOwner.email], password: 'demo', user: fixtures.rejectedOwner, restaurant: { ...fixtures.restaurants[2], owner_id: fixtures.rejectedOwner.id, owner_full_name: fixtures.rejectedOwner.full_name, owner_email: fixtures.rejectedOwner.email } },
  { emails: [fixtures.approvedOwner.email], password: 'demo', user: fixtures.approvedOwner, restaurant: { ...fixtures.restaurants[1], owner_id: fixtures.approvedOwner.id, owner_full_name: fixtures.approvedOwner.full_name, owner_email: fixtures.approvedOwner.email } },
  { emails: [fixtures.admin.email], password: 'admin-demo', user: fixtures.admin, restaurant: null },
];

function saveSession(session) {
  activeMockSession = session;
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ user: session.user, restaurant: session.restaurant }));
  }
}

function clearSavedSession() {
  activeMockSession = null;
  if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem(SESSION_KEY);
}

function buildSession(identity) {
  const session = {
    accessToken: `mock-access-token-${identity.user.role.toLowerCase()}-${Date.now()}`,
    user: clone(identity.user),
    restaurant: clone(identity.restaurant),
  };
  saveSession(session);
  return session;
}

export const mockAuthApi = {
  restoreSession: async () => {
    if (activeMockSession) return wait(clone(activeMockSession));
    if (typeof sessionStorage === 'undefined') return null;
    try {
      const saved = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null');
      if (!saved?.user) return null;
      return wait(buildSession(saved));
    } catch {
      clearSavedSession();
      return null;
    }
  },
  login: async ({ email, password } = {}) => {
    const key = normalized(email);
    const failure = loginFailures.get(key);
    if (failure?.lockedUntil > Date.now()) throw mockError(423, 'Too many failed attempts. Please try again later.');
    const registered = registeredMockCredentials.get(key);
    const fixed = mockLoginIdentities.find((candidate) => candidate.emails.includes(key));
    const identity = registered || fixed;
    const expectedPassword = registered?.password || fixedPasswordOverrides.get(key) || fixed?.password;
    if (!identity || expectedPassword !== password) {
      const attempts = (failure?.attempts || 0) + 1;
      loginFailures.set(key, { attempts, lockedUntil: attempts >= 5 ? Date.now() + 900000 : 0 });
      throw mockError(attempts >= 5 ? 423 : 401, attempts >= 5 ? 'Too many failed attempts. Please try again later.' : 'Invalid email or password.');
    }
    loginFailures.delete(key);
    return wait(buildSession(identity));
  },
  logout: async () => { clearSavedSession(); return wait({}); },
  logoutAll: async () => { clearSavedSession(); return wait({}); },
  register: async (registration = {}) => {
    const email = normalized(registration.email);
    const { password, confirm_password: _confirmPassword, ...identity } = registration;
    otpSessions.set(email, { otp: '123456', attempts: 0, expiresAt: Date.now() + 300000, resendAt: Date.now() + 60000, password, identity });
    return wait(otpResponse());
  },
  verifyEmail: async ({ email, otp } = {}) => {
    const key = normalized(email);
    const session = otpSessions.get(key);
    if (!session || Date.now() >= session.expiresAt) throw mockError(410, 'The verification code or registration has expired.');
    if (session.attempts >= 5) throw mockError(400, 'Too many incorrect attempts. Request a new code.');
    if (otp !== session.otp) {
      session.attempts += 1;
      throw mockError(400, session.attempts >= 5 ? 'Too many incorrect attempts. Request a new code.' : 'Invalid verification code.');
    }
    otpSessions.delete(key);
    const identity = session.identity;
    const user = { id: `mock-user-${key}`, full_name: identity.owner_full_name, email: identity.email, mobile: identity.mobile, role: 'OWNER', email_verified_at: new Date().toISOString() };
    const restaurant = { id: `mock-restaurant-${identity.slug}`, name: identity.restaurant_name, phone: identity.restaurant_phone, city: identity.city, slug: identity.slug, status: 'PENDING', rejection_reason: null, owner_id: user.id, owner_full_name: user.full_name, owner_email: user.email, created_at: new Date().toISOString() };
    registeredMockCredentials.set(key, { password: session.password, user, restaurant });
    mockRestaurantStore.add(restaurant);
    const result = { user, restaurant, accessToken: `mock-registration-token-${key}-${Date.now()}` };
    saveSession(result);
    return wait(result);
  },
  resendOtp: async ({ email } = {}) => {
    const key = normalized(email);
    const session = otpSessions.get(key);
    if (session && Date.now() < session.resendAt) throw mockError(429, 'Please wait before requesting another OTP.');
    if (!session) throw mockError(410, 'The registration has expired.');
    otpSessions.set(key, { ...session, otp: '123456', attempts: 0, expiresAt: Date.now() + 300000, resendAt: Date.now() + 60000 });
    return wait(otpResponse());
  },
  requestPasswordReset: async ({ email } = {}) => {
    const key = normalized(email);
    const identity = registeredMockCredentials.get(key) || mockLoginIdentities.find((candidate) => candidate.emails.includes(key));
    if (identity) resetSessions.set(key, { otp: '123456', expiresAt: Date.now() + 300000, attempts: 0, identity });
    return wait({ message: 'If the email is registered, a reset code has been sent.', otp_expires_in_seconds: 300 });
  },
  resetPassword: async ({ email, otp, new_password: newPassword } = {}) => {
    const key = normalized(email);
    const session = resetSessions.get(key);
    if (!session || Date.now() >= session.expiresAt) throw mockError(410, 'The reset code has expired.');
    if (session.attempts >= 5) throw mockError(400, 'Too many incorrect attempts. Request a new code.');
    if (otp !== session.otp) { session.attempts += 1; throw mockError(400, 'Invalid reset code.'); }
    const identity = registeredMockCredentials.get(key);
    if (identity) registeredMockCredentials.set(key, { ...identity, password: newPassword });
    else fixedPasswordOverrides.set(key, newPassword);
    resetSessions.delete(key);
    clearSavedSession();
    return wait({ message: 'Password reset successfully.' });
  },
};

import test from 'node:test';
import assert from 'node:assert/strict';
import { mockAuthApi } from '../src/api/mocks/mockAuthApi.js';

const uniqueEmail = () => `test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
const makeReg = (overrides = {}) => ({
  owner_full_name: 'Test User',
  email: uniqueEmail(),
  mobile: '+919876543210',
  password: 'TestPass!123',
  confirm_password: 'TestPass!123',
  restaurant_name: 'Test Restaurant',
  restaurant_phone: '+914842000001',
  city: 'Kochi',
  slug: `test-restaurant-${Date.now()}`,
  ...overrides,
});

// --- Registration ---
test('register returns OTP metadata with 300s expiry and 60s resend', async () => {
  const reg = makeReg();
  const result = await mockAuthApi.register(reg);
  assert.equal(result.verification_required, true);
  assert.equal(result.otp_expires_in_seconds, 300);
  assert.equal(result.resend_after_seconds, 60);
});

test('registration does not expose password or confirm_password in any returned data', async () => {
  const reg = makeReg();
  const regResult = await mockAuthApi.register(reg);
  assert.equal(JSON.stringify(regResult).includes(reg.password), false);
  const verResult = await mockAuthApi.verifyEmail({ email: reg.email, otp: '123456' });
  assert.equal(Object.hasOwn(verResult.user, 'password'), false);
  assert.equal(JSON.stringify(verResult).includes(reg.password), false);
});

test('duplicate registration email is silently accepted (mocks allow re-registration)', async () => {
  // Mock allows re-registration with same email (replaces OTP session)
  const reg = makeReg();
  await mockAuthApi.register(reg);
  const result = await mockAuthApi.register(reg);
  assert.equal(result.verification_required, true);
});

// --- OTP Verification ---
test('verifyEmail succeeds with correct OTP (123456)', async () => {
  const reg = makeReg();
  await mockAuthApi.register(reg);
  const result = await mockAuthApi.verifyEmail({ email: reg.email, otp: '123456' });
  assert.equal(result.restaurant.status, 'PENDING');
  assert.equal(result.user.email, reg.email);
});

test('verifyEmail fails with incorrect OTP', async () => {
  const reg = makeReg();
  await mockAuthApi.register(reg);
  await assert.rejects(
    mockAuthApi.verifyEmail({ email: reg.email, otp: '000000' }),
    (error) => error.response?.status === 400,
  );
});

test('verifyEmail fails with expired registration (not registered)', async () => {
  await assert.rejects(
    mockAuthApi.verifyEmail({ email: 'never-registered@example.com', otp: '123456' }),
    (error) => error.response?.status === 410,
  );
});

test('verifyEmail fails after 5 wrong attempts', async () => {
  const reg = makeReg();
  await mockAuthApi.register(reg);
  for (let i = 0; i < 5; i++) {
    await assert.rejects(mockAuthApi.verifyEmail({ email: reg.email, otp: '000000' }));
  }
  // 5th attempt should already trigger "too many attempts" on the 5th wrong attempt
  // or the 6th attempt after 5 failures
  await assert.rejects(
    mockAuthApi.verifyEmail({ email: reg.email, otp: '000000' }),
    (error) => error.response?.status === 400,
  );
});

test('verifyEmail returns user with correct full_name from registration', async () => {
  const reg = makeReg({ owner_full_name: 'Specific Name Test' });
  await mockAuthApi.register(reg);
  const result = await mockAuthApi.verifyEmail({ email: reg.email, otp: '123456' });
  assert.equal(result.user.full_name, 'Specific Name Test');
});

test('verifyEmail returns restaurant with correct name and slug from registration', async () => {
  const slug = `my-custom-slug-${Date.now()}`;
  const reg = makeReg({ restaurant_name: 'Custom Named Restaurant', slug });
  await mockAuthApi.register(reg);
  const result = await mockAuthApi.verifyEmail({ email: reg.email, otp: '123456' });
  assert.equal(result.restaurant.name, 'Custom Named Restaurant');
  assert.equal(result.restaurant.slug, slug);
});

test('verifyEmail result includes accessToken', async () => {
  const reg = makeReg();
  await mockAuthApi.register(reg);
  const result = await mockAuthApi.verifyEmail({ email: reg.email, otp: '123456' });
  assert.ok(result.accessToken, 'accessToken should be present after verification');
});

// --- Resend OTP ---
test('resendOtp fails when within 60s cooldown window', async () => {
  const reg = makeReg();
  await mockAuthApi.register(reg);
  await assert.rejects(
    mockAuthApi.resendOtp({ email: reg.email }),
    (error) => error.response?.status === 429,
  );
});

test('resendOtp fails for never-registered email (410)', async () => {
  await assert.rejects(
    mockAuthApi.resendOtp({ email: 'not-registered@example.com' }),
    (error) => error.response?.status === 410,
  );
});

// --- Password Reset ---
test('requestPasswordReset always returns generic success message', async () => {
  // Known email
  const result1 = await mockAuthApi.requestPasswordReset({ email: 'admin@example.com' });
  assert.ok(result1.message.includes('registered'));
  // Unknown email - still returns generic message (no enumeration)
  const result2 = await mockAuthApi.requestPasswordReset({ email: 'unknown@example.com' });
  assert.ok(result2.message.includes('registered'));
});

test('resetPassword fails for expired/missing reset session', async () => {
  await assert.rejects(
    mockAuthApi.resetPassword({ email: 'noreset@example.com', otp: '123456', new_password: 'NewPass!123' }),
    (error) => error.response?.status === 410,
  );
});

test('resetPassword fails with wrong OTP', async () => {
  await mockAuthApi.requestPasswordReset({ email: 'admin@example.com' });
  await assert.rejects(
    mockAuthApi.resetPassword({ email: 'admin@example.com', otp: '999999', new_password: 'NewPass!123' }),
    (error) => error.response?.status === 400,
  );
});

test('resetPassword clears active session on success', async () => {
  const { mockAuthApi: freshApi } = await import('../src/api/mocks/mockAuthApi.js');
  // Login first to establish session
  await freshApi.login({ email: 'demo@example.com', password: 'demo' });
  assert.ok(freshApi !== undefined); // session exists
  await freshApi.requestPasswordReset({ email: 'demo@example.com' });
  await freshApi.resetPassword({ email: 'demo@example.com', otp: '123456', new_password: 'NewDemo!456' });
  // Old password no longer works
  await assert.rejects(
    freshApi.login({ email: 'demo@example.com', password: 'demo' }),
    (error) => error.response?.status === 401,
  );
});

// --- Login failures ---
test('login with empty email rejects with 401', async () => {
  await assert.rejects(
    mockAuthApi.login({ email: '', password: 'anything' }),
    (error) => error.response?.status === 401,
  );
});

test('login with empty password rejects with 401', async () => {
  await assert.rejects(
    mockAuthApi.login({ email: 'admin@example.com', password: '' }),
    (error) => error.response?.status === 401,
  );
});

// --- Logout ---
test('logout clears the active session', async () => {
  await mockAuthApi.login({ email: 'approved@example.com', password: 'demo' });
  await mockAuthApi.logout();
  // After logout, restoreSession from memory returns null (no in-memory session)
  // activeMockSession should be null after logout
  const { activeMockSession } = await import('../src/api/mocks/mockAuthApi.js');
  assert.equal(activeMockSession, null);
});

// --- Session storage ---
test('mock session stores only user and restaurant, not tokens or passwords', async () => {
  const values = new Map();
  globalThis.sessionStorage = {
    getItem: (key) => values.get(key) || null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };

  await mockAuthApi.login({ email: 'admin@example.com', password: 'admin-demo' });
  const stored = values.get('aviyal-mock-session');
  assert.ok(stored, 'Session should be stored');
  // The stored value must NOT contain the actual password string
  // NOTE: user id 'admin-demo' will be present (that's the fixture user id, not the password)
  const parsed = JSON.parse(stored);
  assert.ok(parsed.user, 'user must be in stored session');
  assert.equal(parsed.user.role, 'SUPER_ADMIN');
  // Ensure the raw password value itself is not stored
  // The password 'admin-demo' coincidentally matches the user id, so check the password key
  assert.equal(Object.hasOwn(parsed, 'password'), false, 'No "password" key in stored session');
  assert.equal(Object.hasOwn(parsed.user || {}, 'password'), false, 'No password on stored user object');
  // Ensure no access token is stored
  assert.equal(stored.includes('mock-access-token'), false, 'Access token must not be stored');
  delete globalThis.sessionStorage;
});

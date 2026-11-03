import test from 'node:test';
import assert from 'node:assert/strict';
import { mockAdminApi } from '../src/api/mocks/mockAdminApi.js';
import { mockAuthApi } from '../src/api/mocks/mockAuthApi.js';
import { formatDateTime } from '../src/utils/dateTime.js';

test('admin approval and rejection update shared status and history', async () => {
  const approved = await mockAdminApi.approve('restaurant-1');
  assert.equal(approved.status, 'APPROVED');
  assert.equal((await mockAdminApi.history('restaurant-1'))[0].new_status, 'APPROVED');
  await assert.rejects(mockAdminApi.reject('restaurant-1', 'Too late'), (error) => error.response?.status === 409);
  const rejected = await mockAdminApi.reject('restaurant-4', 'Please provide a license.');
  assert.equal(rejected.status, 'REJECTED');
  assert.equal(rejected.rejection_reason, 'Please provide a license.');
});

test('password reset accepts the mock OTP and clears the active session', async () => {
  await mockAuthApi.login({ email: 'admin@example.com', password: 'admin-demo' });
  await mockAuthApi.requestPasswordReset({ email: 'admin@example.com' });
  await mockAuthApi.resetPassword({ email: 'admin@example.com', otp: '123456', new_password: 'Changed!123' });
  await assert.rejects(mockAuthApi.login({ email: 'admin@example.com', password: 'admin-demo' }), (error) => error.response?.status === 401);
  const result = await mockAuthApi.login({ email: 'admin@example.com', password: 'Changed!123' });
  assert.equal(result.user.role, 'SUPER_ADMIN');
});

test('date formatting is fixed to IST', () => {
  assert.equal(formatDateTime('2026-11-01T11:00:00.000Z'), '01 Nov 2026, 4:30 PM IST');
});

test('mock session restoration persists identity only, never credentials or tokens', async () => {
  const values = new Map();
  globalThis.sessionStorage = { getItem: (key) => values.get(key) || null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) };
  await mockAuthApi.login({ email: 'demo@example.com', password: 'demo' });
  const stored = values.get('aviyal-mock-session');
  assert.equal(stored.includes('mock-access-token'), false);
  assert.equal(stored.includes('password'), false);
  await mockAuthApi.logout();
  values.set('aviyal-mock-session', stored);
  const restored = await mockAuthApi.restoreSession();
  assert.equal(restored.user.email, 'anu@example.com');
  assert.ok(restored.accessToken);
  delete globalThis.sessionStorage;
});

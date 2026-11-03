import test from 'node:test';
import assert from 'node:assert/strict';
import { fixtures } from '../src/api/mocks/fixtures.js';
import { mockAuthApi } from '../src/api/mocks/mockAuthApi.js';

test('mock owner login returns the pending owner identity', async () => {
  const result = await mockAuthApi.login({ email: 'demo@example.com', password: 'demo' });

  assert.equal(result.user.email, fixtures.owner.email);
  assert.equal(result.user.role, 'OWNER');
  assert.equal(result.restaurant.status, 'PENDING');
});

test('mock admin login returns the admin identity without an owner restaurant', async () => {
  const result = await mockAuthApi.login({ email: fixtures.admin.email, password: 'admin-demo' });

  assert.equal(result.user.role, 'SUPER_ADMIN');
  assert.equal(result.restaurant, null);
});

test('mock owner fixtures cover rejected and approved status redirects', async () => {
  const rejected = await mockAuthApi.login({ email: 'rejected@example.com', password: 'demo' });
  const approved = await mockAuthApi.login({ email: 'approved@example.com', password: 'demo' });
  assert.equal(rejected.restaurant.status, 'REJECTED');
  assert.equal(approved.restaurant.status, 'APPROVED');
});

test('mock login rejects unknown or empty credentials', async () => {
  await assert.rejects(
    mockAuthApi.login({ email: 'unknown@example.com', password: 'demo' }),
    (error) => error.response?.status === 401,
  );
  await assert.rejects(
    mockAuthApi.login({ email: fixtures.owner.email, password: 'wrong-password' }),
    (error) => error.response?.status === 401,
  );
});

test('mock login locks an account after five failed attempts', async () => {
  const email = `locked-${Date.now()}@example.com`;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    await assert.rejects(mockAuthApi.login({ email, password: 'wrong' }));
  }
  await assert.rejects(mockAuthApi.login({ email, password: 'wrong' }), (error) => error.response?.status === 423);
});

test('verified mock registrations can log in with their submitted password', async () => {
  const registration = {
    owner_full_name: 'Maya Joseph',
    email: `maya-${Date.now()}@example.com`,
    password: 'MayaDemo!123',
    confirm_password: 'MayaDemo!123',
    mobile: '+919876543299',
    restaurant_name: 'Maya Cafe',
    restaurant_phone: '+914842000099',
    city: 'Kochi',
    slug: `maya-cafe-${Date.now()}`,
  };

  await mockAuthApi.register(registration);
  await mockAuthApi.verifyEmail({ email: registration.email, otp: '123456' });
  await mockAuthApi.logout();
  const result = await mockAuthApi.login({ email: registration.email, password: registration.password });

  assert.equal(result.user.email, registration.email);
  assert.equal(result.restaurant.status, 'PENDING');
  await assert.rejects(
    mockAuthApi.login({ email: registration.email, password: 'wrong-password' }),
    (error) => error.response?.status === 401,
  );
});

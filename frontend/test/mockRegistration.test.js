import test from 'node:test';
import assert from 'node:assert/strict';
import { mockAuthApi } from '../src/api/mocks/mockAuthApi.js';
import { mockOwnerApi } from '../src/api/mocks/mockOwnerApi.js';

const registration = (identity) => ({ ...identity, password: 'NeverStored!123', confirm_password: 'NeverStored!123' });

test('mock registration preserves each submitted identity and pending status', async () => {
  const first = registration({ owner_full_name: 'Riya Menon', email: `riya-${Date.now()}@example.com`, mobile: '+919876543210', restaurant_name: 'Pepper House', restaurant_phone: '+914842000001', city: 'Kochi', slug: `pepper-house-${Date.now()}` });
  const second = registration({ owner_full_name: 'Vikram Das', email: `vikram-${Date.now()}@example.com`, mobile: '+919876543211', restaurant_name: 'Harbor Bowl', restaurant_phone: '+914842000002', city: 'Goa', slug: `harbor-bowl-${Date.now()}` });

  await mockAuthApi.register(first);
  const firstResult = await mockAuthApi.verifyEmail({ email: first.email, otp: '123456' });
  assert.equal(firstResult.user.full_name, first.owner_full_name);
  assert.equal(firstResult.restaurant.name, first.restaurant_name);
  assert.equal(firstResult.restaurant.status, 'PENDING');

  await mockAuthApi.register(second);
  const secondResult = await mockAuthApi.verifyEmail({ email: second.email, otp: '123456' });
  const activeProfile = await mockOwnerApi.profile();
  assert.equal(secondResult.user.full_name, second.owner_full_name);
  assert.equal(secondResult.restaurant.name, second.restaurant_name);
  assert.equal(secondResult.restaurant.status, 'PENDING');
  assert.equal(activeProfile.user.full_name, second.owner_full_name);
  assert.equal(activeProfile.restaurant.name, second.restaurant_name);
  assert.equal(Object.hasOwn(secondResult.user, 'password'), false);
});

test('existing fixed mock login remains available', async () => {
  const result = await mockAuthApi.login({ email: 'demo@example.com', password: 'demo' });
  assert.equal(result.user.full_name, 'Anu Nair');
  assert.equal(result.restaurant.status, 'PENDING');
});

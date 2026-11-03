import test from 'node:test';
import assert from 'node:assert/strict';
import { mockOwnerApi } from '../src/api/mocks/mockOwnerApi.js';
import { mockAuthApi } from '../src/api/mocks/mockAuthApi.js';
import { mockRestaurantStore } from '../src/api/mocks/mockStore.js';
import { fixtures } from '../src/api/mocks/fixtures.js';

// Shared state — log in as rejected owner for these tests
const rejectedEmail = fixtures.rejectedOwner.email; // 'rejected@example.com'
const approvedEmail = fixtures.approvedOwner.email; // 'approved@example.com'

test('owner profile returns user and restaurant from current session', async () => {
  await mockAuthApi.login({ email: rejectedEmail, password: 'demo' });
  const profile = await mockOwnerApi.profile();
  assert.equal(profile.user.email, rejectedEmail);
  assert.equal(profile.restaurant.status, 'REJECTED');
});

test('owner restaurant returns restaurant details', async () => {
  await mockAuthApi.login({ email: approvedEmail, password: 'demo' });
  const restaurant = await mockOwnerApi.restaurant();
  assert.ok(restaurant, 'Restaurant should be returned');
  assert.equal(restaurant.status, 'APPROVED');
});

test('owner updateRestaurant saves changes to restaurant', async () => {
  await mockAuthApi.login({ email: rejectedEmail, password: 'demo' });
  const updated = await mockOwnerApi.updateRestaurant({
    restaurant_name: 'Updated Kitchen',
    city: 'Mumbai',
  });
  assert.equal(updated.name, 'Updated Kitchen');
  assert.equal(updated.city, 'Mumbai');
});

test('owner resubmit changes restaurant status to PENDING', async () => {
  await mockAuthApi.login({ email: rejectedEmail, password: 'demo' });
  const result = await mockOwnerApi.resubmit();
  assert.equal(result.status, 'PENDING');
});

test('owner dashboard returns current session data', async () => {
  await mockAuthApi.login({ email: approvedEmail, password: 'demo' });
  const dashboard = await mockOwnerApi.dashboard();
  assert.equal(dashboard.user.email, approvedEmail);
  assert.equal(dashboard.restaurant.status, 'APPROVED');
});

test('owner session reflects updated restaurant after updateRestaurant', async () => {
  await mockAuthApi.login({ email: rejectedEmail, password: 'demo' });
  await mockOwnerApi.updateRestaurant({ city: 'Bangalore' });
  const { activeMockSession } = await import('../src/api/mocks/mockAuthApi.js');
  assert.equal(activeMockSession?.restaurant?.city, 'Bangalore');
});

test('owner session reflects PENDING status after resubmit', async () => {
  await mockAuthApi.login({ email: rejectedEmail, password: 'demo' });
  await mockOwnerApi.resubmit();
  const { activeMockSession } = await import('../src/api/mocks/mockAuthApi.js');
  assert.equal(activeMockSession?.restaurant?.status, 'PENDING');
});


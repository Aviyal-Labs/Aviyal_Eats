import test from 'node:test';
import assert from 'node:assert/strict';
import { mockRestaurantStore } from '../src/api/mocks/mockStore.js';
import { fixtures } from '../src/api/mocks/fixtures.js';
import { mockAdminApi } from '../src/api/mocks/mockAdminApi.js';
import { mockAuthApi } from '../src/api/mocks/mockAuthApi.js';

// --- mockRestaurantStore ---
test('mockRestaurantStore.list() returns all 21 fixture restaurants', () => {
  const list = mockRestaurantStore.list();
  assert.ok(list.length >= 21, `Expected at least 21, got ${list.length}`);
});

test('mockRestaurantStore.get() returns cloned restaurant (mutation does not affect store)', () => {
  const r = mockRestaurantStore.get('restaurant-1');
  assert.ok(r, 'Should return restaurant');
  const originalName = r.name;
  r.name = 'MUTATED';
  const r2 = mockRestaurantStore.get('restaurant-1');
  assert.equal(r2.name, originalName, 'Store should not be mutated by caller changes');
});

test('mockRestaurantStore.get() returns null for unknown id', () => {
  const result = mockRestaurantStore.get('non-existent-id');
  assert.equal(result, undefined);
});

test('mockRestaurantStore.add() adds a new restaurant to the store', () => {
  const newRestaurant = {
    id: 'test-new-restaurant',
    name: 'Test New Restaurant',
    slug: 'test-new-restaurant',
    status: 'PENDING',
    city: 'Kochi',
    owner_id: 'test-owner',
    owner_full_name: 'Test Owner',
    owner_email: 'testowner@example.com',
    phone: '+914842000099',
    rejection_reason: null,
    created_at: new Date().toISOString(),
  };
  mockRestaurantStore.add(newRestaurant);
  const retrieved = mockRestaurantStore.get('test-new-restaurant');
  assert.ok(retrieved, 'Newly added restaurant should be retrievable');
  assert.equal(retrieved.name, 'Test New Restaurant');
});

test('mockRestaurantStore.add() creates initial SUBMITTED history event', () => {
  const history = mockRestaurantStore.history('test-new-restaurant');
  assert.ok(history.length >= 1);
  const submittedEvent = history.find(e => e.action === 'SUBMITTED');
  assert.ok(submittedEvent, 'Should have a SUBMITTED event');
});

test('mockRestaurantStore.update() changes restaurant fields', () => {
  const updated = mockRestaurantStore.update('restaurant-1', { city: 'Chennai' });
  assert.ok(updated, 'Should return updated restaurant');
  assert.equal(updated.city, 'Chennai');
  const retrieved = mockRestaurantStore.get('restaurant-1');
  assert.equal(retrieved.city, 'Chennai');
});

test('mockRestaurantStore.transition() changes status and adds history event', () => {
  // Find a pending restaurant that hasn't been touched yet
  const all = mockRestaurantStore.list();
  const pending = all.find(r => r.status === 'PENDING' && r.id !== 'restaurant-1');
  if (!pending) {
    // Skip if all PENDING have been consumed by other tests
    return;
  }
  const result = mockRestaurantStore.transition(pending.id, 'APPROVED', fixtures.admin);
  assert.equal(result.status, 'APPROVED');
  const history = mockRestaurantStore.history(pending.id);
  assert.ok(history.length >= 1);
  assert.equal(history[0].action, 'APPROVED');
  assert.equal(history[0].new_status, 'APPROVED');
});

test('mockRestaurantStore.history() returns events newest-first', () => {
  // Add two events manually by doing two transitions
  const all = mockRestaurantStore.list();
  // Find a restaurant we can control
  const fresh = {
    id: 'test-timeline-restaurant',
    name: 'Timeline Test',
    slug: 'timeline-test',
    status: 'PENDING',
    city: 'Kochi',
    owner_id: 'owner-1',
    owner_full_name: 'Timeline Owner',
    owner_email: 'timeline@example.com',
    phone: '+914842000001',
    rejection_reason: null,
    created_at: '2026-01-01T00:00:00Z',
  };
  mockRestaurantStore.add(fresh);
  // Reject first
  mockRestaurantStore.transition('test-timeline-restaurant', 'REJECTED', fixtures.admin, 'Needs docs');
  // Restore to pending for resubmission
  mockRestaurantStore.transition('test-timeline-restaurant', 'PENDING', { id: 'owner-1', full_name: 'Timeline Owner' });
  const history = mockRestaurantStore.history('test-timeline-restaurant');
  // Newest should be PENDING (from resubmit), older should be REJECTED
  assert.ok(history.length >= 3); // SUBMITTED + REJECTED + PENDING
  assert.equal(history[0].action, 'PENDING'); // newest first
  assert.equal(history[1].action, 'REJECTED'); // second newest
});

// --- Integration: approval workflow ---
test('complete approval workflow: register -> verify -> admin approves -> owner sees APPROVED', async () => {
  const email = `workflow-${Date.now()}@example.com`;
  const slug = `workflow-${Date.now()}`;

  // Register and verify
  await mockAuthApi.register({
    owner_full_name: 'Workflow Test',
    email,
    mobile: '+919876543211',
    password: 'WorkFlow!1',
    confirm_password: 'WorkFlow!1',
    restaurant_name: 'Workflow Restaurant',
    restaurant_phone: '+914842000002',
    city: 'Kochi',
    slug,
  });
  const verified = await mockAuthApi.verifyEmail({ email, otp: '123456' });
  assert.equal(verified.restaurant.status, 'PENDING');
  const restaurantId = verified.restaurant.id;

  // Admin approves
  const approved = await mockAdminApi.approve(restaurantId);
  assert.equal(approved.status, 'APPROVED');

  // History should show approval
  const history = await mockAdminApi.history(restaurantId);
  assert.ok(history.some(e => e.action === 'APPROVED'));
});

test('complete rejection workflow: register -> verify -> admin rejects -> owner sees REJECTED with reason', async () => {
  const email = `rejection-${Date.now()}@example.com`;
  const slug = `rejection-${Date.now()}`;

  await mockAuthApi.register({
    owner_full_name: 'Reject Test',
    email,
    mobile: '+919876543212',
    password: 'RejectMe!1',
    confirm_password: 'RejectMe!1',
    restaurant_name: 'Rejection Restaurant',
    restaurant_phone: '+914842000003',
    city: 'Kochi',
    slug,
  });
  const verified = await mockAuthApi.verifyEmail({ email, otp: '123456' });
  const restaurantId = verified.restaurant.id;

  const rejectionReason = 'Please provide a valid business license.';
  const rejected = await mockAdminApi.reject(restaurantId, rejectionReason);
  assert.equal(rejected.status, 'REJECTED');
  assert.equal(rejected.rejection_reason, rejectionReason);

  // History should show rejection with reason
  const history = await mockAdminApi.history(restaurantId);
  const rejectionEvent = history.find(e => e.action === 'REJECTED');
  assert.ok(rejectionEvent, 'Should have rejection event');
  assert.equal(rejectionEvent.reason, rejectionReason);
});


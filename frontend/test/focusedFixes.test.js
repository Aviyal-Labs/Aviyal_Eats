import test from 'node:test';
import assert from 'node:assert/strict';
import { fixtures } from '../src/api/mocks/fixtures.js';
import { mockAuthApi, activeMockSession } from '../src/api/mocks/mockAuthApi.js';
import { mockOwnerApi } from '../src/api/mocks/mockOwnerApi.js';
import { mockAdminApi, queryRestaurants } from '../src/api/mocks/mockAdminApi.js';
import { mockRestaurantStore } from '../src/api/mocks/mockStore.js';

// 1. Save and Resubmit
test('Workflow 1: Save and Resubmit updates restaurant details and transitions status to PENDING', async () => {
  await mockAuthApi.login({ email: 'rejected@example.com', password: 'demo' });
  
  // Verify initially rejected
  const initial = await mockOwnerApi.restaurant();
  assert.equal(initial.status, 'REJECTED');
  
  // Update restaurant details
  const updatePayload = {
    restaurant_name: 'Resubmitted Bistro',
    restaurant_phone: '+914842999999',
    city: 'Kochi',
    slug: 'resubmitted-bistro',
  };
  const updated = await mockOwnerApi.updateRestaurant(updatePayload);
  assert.equal(updated.name, 'Resubmitted Bistro');
  assert.equal(updated.phone, '+914842999999');
  assert.equal(updated.slug, 'resubmitted-bistro');

  // Resubmit
  const resubmitted = await mockOwnerApi.resubmit();
  assert.equal(resubmitted.status, 'PENDING');

  // Verify in mockRestaurantStore
  const fromStore = mockRestaurantStore.get(resubmitted.id);
  assert.equal(fromStore.status, 'PENDING');
  assert.equal(fromStore.name, 'Resubmitted Bistro');
  assert.equal(fromStore.slug, 'resubmitted-bistro');
});

// 2. Admin approval
test('Workflow 2: Admin approval moves PENDING restaurant to APPROVED and records timeline event', async () => {
  // Find a pending restaurant
  const pendingRestaurant = mockRestaurantStore.list().find(r => r.status === 'PENDING');
  assert.ok(pendingRestaurant, 'Must have a pending restaurant');

  const approved = await mockAdminApi.approve(pendingRestaurant.id);
  assert.equal(approved.status, 'APPROVED');

  const fromStore = mockRestaurantStore.get(pendingRestaurant.id);
  assert.equal(fromStore.status, 'APPROVED');

  const history = await mockAdminApi.history(pendingRestaurant.id);
  assert.equal(history[0].action, 'APPROVED');
  assert.equal(history[0].new_status, 'APPROVED');
});

// 3. Admin rejection, including reason persistence
test('Workflow 3: Admin rejection moves restaurant to REJECTED and persists rejection reason and audit event', async () => {
  const tempRestaurant = mockRestaurantStore.add({
    id: `test-reject-${Date.now()}`,
    name: 'Temporary Test Cafe',
    slug: 'temp-test-cafe',
    status: 'PENDING',
    city: 'Kochi',
    owner_id: 'owner-test',
    owner_full_name: 'Test Owner',
    owner_email: 'testowner@example.com',
    phone: '+914842000000',
    rejection_reason: null,
    created_at: new Date().toISOString(),
  });

  const reasonText = 'Incomplete business license documentation provided.';
  const rejected = await mockAdminApi.reject(tempRestaurant.id, reasonText);
  assert.equal(rejected.status, 'REJECTED');
  assert.equal(rejected.rejection_reason, reasonText);

  // Verify persistence in store
  const stored = mockRestaurantStore.get(tempRestaurant.id);
  assert.equal(stored.status, 'REJECTED');
  assert.equal(stored.rejection_reason, reasonText);

  // Verify approval timeline
  const history = await mockAdminApi.history(tempRestaurant.id);
  assert.equal(history[0].action, 'REJECTED');
  assert.equal(history[0].reason, reasonText);
  assert.equal(history[0].actor.role, 'SUPER_ADMIN');
});

// 4. Logout All Devices
test('Workflow 4: Logout All Devices clears active mock session', async () => {
  await mockAuthApi.login({ email: 'rejected@example.com', password: 'demo' });
  assert.ok(activeMockSession, 'Active mock session should be set after login');

  await mockAuthApi.logoutAll();
  assert.equal(activeMockSession, null, 'Active mock session must be null after logoutAll');

  const restored = await mockAuthApi.restoreSession();
  assert.equal(restored, null, 'Restored session must be null after logoutAll');
});

// 5. Approved-owner dashboard slug
test('Workflow 5: Approved owner logs in and loads Demo Restaurant 2 with correct slug', async () => {
  const session = await mockAuthApi.login({ email: 'approved@example.com', password: 'demo' });
  assert.equal(session.user.email, 'approved@example.com');
  assert.equal(session.user.full_name, 'Rahul Menon');
  assert.equal(session.restaurant.id, 'restaurant-2');
  assert.equal(session.restaurant.name, 'Demo Restaurant 2');
  assert.equal(session.restaurant.slug, 'demo-restaurant-2');
  assert.equal(session.restaurant.status, 'APPROVED');
});

// 6. Admin directory and Demo Restaurant 2 ownership consistency
test('Workflow 6: Admin directory and Demo Restaurant 2 ownership consistency', async () => {
  // Check store get
  const restaurant2 = mockRestaurantStore.get('restaurant-2');
  assert.equal(restaurant2.id, 'restaurant-2');
  assert.equal(restaurant2.name, 'Demo Restaurant 2');
  assert.equal(restaurant2.slug, 'demo-restaurant-2');
  assert.equal(restaurant2.owner_id, 'owner-approved');
  assert.equal(restaurant2.owner_full_name, 'Rahul Menon');
  assert.equal(restaurant2.owner_email, 'approved@example.com');

  // Search by approved owner email
  const matchByEmail = queryRestaurants(mockRestaurantStore.list(), { search: 'approved@example.com' });
  assert.equal(matchByEmail.length, 1);
  assert.equal(matchByEmail[0].id, 'restaurant-2');

  // Search by approved owner name
  const matchByName = queryRestaurants(mockRestaurantStore.list(), { search: 'rahul menon' });
  assert.equal(matchByName.length, 1);
  assert.equal(matchByName[0].id, 'restaurant-2');

  // Search by approved restaurant slug
  const matchBySlug = queryRestaurants(mockRestaurantStore.list(), { search: 'demo-restaurant-2' });
  assert.ok(matchBySlug.some(r => r.slug === 'demo-restaurant-2'));

  // Check admin list API
  const listResult = await mockAdminApi.list({ search: 'approved@example.com' });
  assert.equal(listResult.count, 1);
  assert.equal(listResult.results[0].owner_full_name, 'Rahul Menon');
  assert.equal(listResult.results[0].owner_email, 'approved@example.com');
});

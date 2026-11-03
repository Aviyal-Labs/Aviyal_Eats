import test from 'node:test';
import assert from 'node:assert/strict';
import { mockAdminApi, queryRestaurants, paginateRestaurants, RESTAURANT_PAGE_SIZE, SEARCH_DEBOUNCE_MS } from '../src/api/mocks/mockAdminApi.js';
import { mockAuthApi } from '../src/api/mocks/mockAuthApi.js';
import { fixtures } from '../src/api/mocks/fixtures.js';
import { mockRestaurantStore } from '../src/api/mocks/mockStore.js';

// --- Search edge cases ---
test('search is case-insensitive', () => {
  const upper = queryRestaurants(fixtures.restaurants, { search: 'ANu nAIR' });
  const lower = queryRestaurants(fixtures.restaurants, { search: 'anu nair' });
  assert.equal(upper.length, lower.length);
  assert.ok(upper.length > 0);
});

test('search with partial match returns results', () => {
  const results = queryRestaurants(fixtures.restaurants, { search: 'coconut' });
  assert.ok(results.length > 0);
  assert.ok(results[0].name.toLowerCase().includes('coconut'));
});

test('search with no match returns empty array', () => {
  const results = queryRestaurants(fixtures.restaurants, { search: 'xyzzy-nomatch-12345' });
  assert.equal(results.length, 0);
});

test('search can be cleared by setting empty string', () => {
  const withSearch = queryRestaurants(fixtures.restaurants, { search: 'anu' });
  const cleared = queryRestaurants(fixtures.restaurants, { search: '' });
  assert.ok(cleared.length > withSearch.length);
  assert.equal(cleared.length, fixtures.restaurants.length);
});

test('search matches owner email substring', () => {
  const results = queryRestaurants(fixtures.restaurants, { search: 'owner3@example' });
  assert.equal(results.length, 1);
});

// --- Status filtering ---
test('filter PENDING returns only PENDING restaurants', () => {
  const results = queryRestaurants(fixtures.restaurants, { status: 'PENDING' });
  assert.ok(results.length > 0);
  assert.ok(results.every(r => r.status === 'PENDING'));
});

test('filter APPROVED returns only APPROVED restaurants', () => {
  const results = queryRestaurants(fixtures.restaurants, { status: 'APPROVED' });
  assert.ok(results.length > 0);
  assert.ok(results.every(r => r.status === 'APPROVED'));
});

test('filter REJECTED returns only REJECTED restaurants', () => {
  const results = queryRestaurants(fixtures.restaurants, { status: 'REJECTED' });
  assert.ok(results.length > 0);
  assert.ok(results.every(r => r.status === 'REJECTED'));
});

test('empty status filter returns all restaurants', () => {
  const results = queryRestaurants(fixtures.restaurants, { status: '' });
  assert.equal(results.length, fixtures.restaurants.length);
});

// --- Combined search + filter ---
test('search combined with status filter narrows results correctly', () => {
  const results = queryRestaurants(fixtures.restaurants, { status: 'PENDING', search: 'restaurant' });
  assert.ok(results.every(r => r.status === 'PENDING'));
  assert.ok(results.every(r => [r.name, r.slug, r.owner_full_name, r.owner_email].join(' ').toLowerCase().includes('restaurant')));
});

// --- Sorting ---
test('newest ordering puts most recently created first', () => {
  const results = queryRestaurants(fixtures.restaurants, { ordering: 'newest' });
  for (let i = 0; i < results.length - 1; i++) {
    const current = new Date(results[i].created_at).getTime();
    const next = new Date(results[i + 1].created_at).getTime();
    assert.ok(current >= next, `Item ${i} (${results[i].created_at}) should be >= item ${i+1} (${results[i+1].created_at})`);
  }
});

test('oldest ordering puts earliest created first', () => {
  const results = queryRestaurants(fixtures.restaurants, { ordering: 'oldest' });
  for (let i = 0; i < results.length - 1; i++) {
    const current = new Date(results[i].created_at).getTime();
    const next = new Date(results[i + 1].created_at).getTime();
    assert.ok(current <= next, `Item ${i} should be <= item ${i+1}`);
  }
});

test('SEARCH_DEBOUNCE_MS is exactly 300', () => {
  assert.equal(SEARCH_DEBOUNCE_MS, 300);
});

// --- Pagination edge cases ---
test('pagination on page 1 of 21 items returns 20 items', () => {
  const result = paginateRestaurants(fixtures.restaurants, 1);
  assert.equal(result.results.length, 20);
  assert.equal(result.count, 21);
  assert.equal(result.total_pages, 2);
  assert.equal(result.page, 1);
});

test('pagination on page 2 of 21 items returns 1 item', () => {
  const result = paginateRestaurants(fixtures.restaurants, 2);
  assert.equal(result.results.length, 1);
  assert.equal(result.page, 2);
});

test('pagination clamps out-of-range page to valid range', () => {
  const result = paginateRestaurants(fixtures.restaurants, 999);
  assert.equal(result.page, 2); // max page
  assert.equal(result.results.length, 1);
});

test('pagination clamps page 0 to page 1', () => {
  const result = paginateRestaurants(fixtures.restaurants, 0);
  assert.equal(result.page, 1);
  assert.equal(result.results.length, 20);
});

test('pagination of empty array returns 1 total page with 0 results', () => {
  const result = paginateRestaurants([], 1);
  assert.equal(result.results.length, 0);
  assert.equal(result.count, 0);
  assert.equal(result.total_pages, 1);
});

test('RESTAURANT_PAGE_SIZE is exactly 20', () => {
  assert.equal(RESTAURANT_PAGE_SIZE, 20);
});

// --- Admin list API ---
test('mockAdminApi.list returns paginated result for page 1', async () => {
  const result = await mockAdminApi.list({ page: 1 });
  assert.ok(result.results.length > 0);
  assert.ok(result.count >= 21);
  assert.ok(result.total_pages >= 2);
});

test('mockAdminApi.list respects status filter', async () => {
  const result = await mockAdminApi.list({ status: 'PENDING' });
  assert.ok(result.results.every(r => r.status === 'PENDING'));
});

test('mockAdminApi.list respects search query', async () => {
  const result = await mockAdminApi.list({ search: 'coconut' });
  assert.ok(result.results.length >= 1);
  assert.ok(result.results.some(r => r.name.toLowerCase().includes('coconut')));
});

// --- Admin detail and history ---
test('mockAdminApi.get returns restaurant with history', async () => {
  const result = await mockAdminApi.get('restaurant-1');
  assert.ok(result, 'Should return restaurant');
  assert.ok(result.id === 'restaurant-1');
  assert.ok(Array.isArray(result.history));
  assert.ok(result.history.length > 0);
});

test('mockAdminApi.get returns null for unknown id', async () => {
  const result = await mockAdminApi.get('unknown-id-999');
  assert.equal(result, null);
});

test('mockAdminApi.history returns newest-first events', async () => {
  // Approve restaurant-5 to add an event
  const restaurant5 = mockRestaurantStore.get('restaurant-5');
  if (restaurant5 && restaurant5.status === 'PENDING') {
    await mockAdminApi.approve('restaurant-5');
    const history = await mockAdminApi.history('restaurant-5');
    assert.ok(history.length >= 2, 'Should have at least submitted + approved events');
    // Newest event should be the APPROVED action
    assert.equal(history[0].action, 'APPROVED');
  }
});

// --- Approval conflict (409) ---
test('approving an already-approved restaurant returns 409 conflict', async () => {
  await assert.rejects(
    mockAdminApi.approve('restaurant-2'), // restaurant-2 is APPROVED in fixtures
    (error) => error.response?.status === 409,
  );
});

test('rejecting an already-rejected restaurant returns 409 conflict', async () => {
  await assert.rejects(
    mockAdminApi.reject('restaurant-3', 'Some reason'), // restaurant-3 is REJECTED
    (error) => error.response?.status === 409,
  );
});

test('reject requires a reason string', async () => {
  // Find a PENDING restaurant
  const pending = fixtures.restaurants.find(r => r.status === 'PENDING' && r.id !== 'restaurant-1');
  if (pending) {
    const result = await mockAdminApi.reject(pending.id, 'Missing business license.');
    assert.equal(result.status, 'REJECTED');
    assert.equal(result.rejection_reason, 'Missing business license.');
  }
});

// --- History event structure ---
test('history events have required fields', async () => {
  const history = await mockAdminApi.history('restaurant-1');
  assert.ok(history.length > 0);
  const event = history[0];
  assert.ok(event.id, 'Event must have id');
  assert.ok(event.action, 'Event must have action');
  assert.ok(event.new_status, 'Event must have new_status');
  assert.ok(event.actor, 'Event must have actor');
  assert.ok(event.created_at, 'Event must have created_at');
});


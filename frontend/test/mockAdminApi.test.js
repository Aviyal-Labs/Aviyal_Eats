import test from 'node:test';
import assert from 'node:assert/strict';
import { fixtures } from '../src/api/mocks/fixtures.js';
import { paginateRestaurants, queryRestaurants, RESTAURANT_PAGE_SIZE, SEARCH_DEBOUNCE_MS } from '../src/api/mocks/mockAdminApi.js';

test('search matches restaurant name, owner name, email, and slug', () => {
  assert.equal(queryRestaurants(fixtures.restaurants, { search: 'anu nair' }).length, 1);
  assert.equal(queryRestaurants(fixtures.restaurants, { search: 'approved@example.com' }).length, 1);
  assert.equal(queryRestaurants(fixtures.restaurants, { search: 'demo-restaurant-3' }).length, 1);
});

test('the configured search debounce is 300ms', () => {
  assert.equal(SEARCH_DEBOUNCE_MS, 300);
});

test('status filtering can be combined with search', () => {
  const results = queryRestaurants(fixtures.restaurants, { status: 'PENDING', search: 'restaurant owner' });
  assert.ok(results.length > 0);
  assert.ok(results.every((row) => row.status === 'PENDING'));
});

test('newest and oldest ordering are deterministic', () => {
  const newest = queryRestaurants(fixtures.restaurants, { ordering: 'newest' });
  const oldest = queryRestaurants(fixtures.restaurants, { ordering: 'oldest' });
  assert.equal(newest[0].id, 'restaurant-1');
  assert.equal(oldest[0].id, 'restaurant-21');
});

test('pagination returns 20 records and clamps invalid pages', () => {
  const firstPage = paginateRestaurants(fixtures.restaurants, 1);
  const lastPage = paginateRestaurants(fixtures.restaurants, 99);
  const priorPage = paginateRestaurants(fixtures.restaurants, 0);
  assert.equal(RESTAURANT_PAGE_SIZE, 20);
  assert.equal(firstPage.results.length, 20);
  assert.equal(firstPage.total_pages, 2);
  assert.equal(lastPage.page, 2);
  assert.equal(lastPage.results.length, 1);
  assert.equal(priorPage.page, 1);
});

test('empty search results remain empty after filtering and sorting', () => {
  const results = queryRestaurants(fixtures.restaurants, { search: 'does-not-exist', status: 'APPROVED', ordering: 'oldest' });
  assert.deepEqual(results, []);
  assert.deepEqual(paginateRestaurants(results, 4).results, []);
});

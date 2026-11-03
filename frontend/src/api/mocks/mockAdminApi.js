import { fixtures } from './fixtures.js';
import { mockRestaurantStore } from './mockStore.js';

const wait = (data) => new Promise((resolve) => setTimeout(() => resolve(data), 80));
const clone = (value) => (value == null ? value : JSON.parse(JSON.stringify(value)));

export const RESTAURANT_PAGE_SIZE = 20;
export const SEARCH_DEBOUNCE_MS = 300;

export function queryRestaurants(rows, { status = '', search = '', ordering = 'newest' } = {}) {
  const normalizedSearch = search.trim().toLowerCase();
  const filtered = rows.filter((row) => {
    const statusMatches = !status || row.status === status;
    const searchableText = [row.name, row.slug, row.owner_full_name, row.owner_email].filter(Boolean).join(' ').toLowerCase();
    return statusMatches && (!normalizedSearch || searchableText.includes(normalizedSearch));
  });
  return [...filtered].sort((left, right) => {
    const dateDifference = new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
    const orderedDifference = ordering === 'oldest' ? -dateDifference : dateDifference;
    return orderedDifference || left.id.localeCompare(right.id);
  });
}

export function paginateRestaurants(rows, page = 1, pageSize = RESTAURANT_PAGE_SIZE) {
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(Math.max(Number(page) || 1, 1), totalPages);
  const start = (currentPage - 1) * pageSize;
  return { results: rows.slice(start, start + pageSize), count: rows.length, page: currentPage, total_pages: totalPages };
}

const conflict = (message) => {
  const error = new Error(message);
  error.response = { status: 409, data: { detail: message }, headers: { 'x-request-id': `mock-409-${Date.now()}` } };
  return error;
};

export const mockAdminApi = {
  list: async (params = {}) => wait(paginateRestaurants(queryRestaurants(mockRestaurantStore.list(), params), params.page, params.page_size || RESTAURANT_PAGE_SIZE)),
  get: async (id) => {
    const restaurant = mockRestaurantStore.get(id);
    return wait(restaurant ? { ...restaurant, history: mockRestaurantStore.history(id) } : null);
  },
  approve: async (id) => {
    const current = mockRestaurantStore.get(id);
    if (!current) throw conflict('Restaurant not found.');
    if (current.status !== 'PENDING') throw conflict('Restaurant status has changed. Refresh the details.');
    return wait(mockRestaurantStore.transition(id, 'APPROVED', fixtures.admin));
  },
  reject: async (id, reason) => {
    const current = mockRestaurantStore.get(id);
    if (!current) throw conflict('Restaurant not found.');
    if (current.status !== 'PENDING') throw conflict('Restaurant status has changed. Refresh the details.');
    return wait(mockRestaurantStore.transition(id, 'REJECTED', fixtures.admin, reason));
  },
  history: async (id) => wait(clone(mockRestaurantStore.history(id))),
};

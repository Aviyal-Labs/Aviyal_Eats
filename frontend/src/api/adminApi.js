import { apiClient } from './client.js';
import { endpoints } from './endpoints.js';



export const RESTAURANT_PAGE_SIZE = 20;
export const SEARCH_DEBOUNCE_MS = 300;

function mapRestaurant(restaurant) {
  return { ...restaurant, owner_full_name: restaurant.owner_name };
}

export const adminApi = {
  async list(params = {}) {
    const { status, search, page = 1, page_size = RESTAURANT_PAGE_SIZE } = params;
    const { data } = await apiClient.get(endpoints.admin.restaurants, {
      params: { status, search, page, page_size },
    });
    return {
      ...data.data,
      results: data.data.results.map(mapRestaurant),
      page,
      total_pages: Math.max(1, Math.ceil(data.data.count / page_size)),
    };
  },
  async get(id) {
    const { data } = await apiClient.get(endpoints.admin.restaurant(id));
    return {
      ...mapRestaurant(data.data.restaurant),
      history: data.data.approval_history,
    };
  },
  async approve(id) {
    return (await apiClient.post(endpoints.admin.approve(id))).data.data;
  },
  async reject(id, data) {
    return (await apiClient.post(endpoints.admin.reject(id), data)).data.data;
  },
};

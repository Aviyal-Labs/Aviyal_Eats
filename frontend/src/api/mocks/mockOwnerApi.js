import { fixtures } from './fixtures.js';
import { activeMockSession } from './mockAuthApi.js';
import { mockRestaurantStore } from './mockStore.js';

const wait = (data) => new Promise((resolve) => setTimeout(() => resolve(data), 80));
const current = () => activeMockSession || { user: fixtures.owner, restaurant: fixtures.restaurant };

// Map edit form field names to store field names
function mapEditFields(data) {
  const mapped = { ...data };
  if ('restaurant_name' in mapped) { mapped.name = mapped.restaurant_name; delete mapped.restaurant_name; }
  if ('restaurant_phone' in mapped) { mapped.phone = mapped.restaurant_phone; delete mapped.restaurant_phone; }
  return mapped;
}

export const mockOwnerApi = {
  dashboard: async () => wait(current()),
  profile: async () => wait(current()),
  restaurant: async () => wait(mockRestaurantStore.get(current().restaurant?.id) || current().restaurant),
  updateRestaurant: async (data) => {
    const updated = mockRestaurantStore.update(current().restaurant.id, mapEditFields(data));
    if (activeMockSession && updated) activeMockSession.restaurant = updated;
    return wait(updated);
  },
  resubmit: async () => {
    const updated = mockRestaurantStore.transition(current().restaurant.id, 'PENDING', current().user);
    if (activeMockSession && updated) activeMockSession.restaurant = updated;
    return wait(updated);
  },
};

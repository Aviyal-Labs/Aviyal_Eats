import { fixtures } from './fixtures.js';

const clone = (value) => (value == null ? value : JSON.parse(JSON.stringify(value)));
const restaurants = new Map(fixtures.restaurants.map((restaurant) => [restaurant.id, clone(restaurant)]));
const histories = new Map();

for (const restaurant of restaurants.values()) {
  histories.set(restaurant.id, [{
    id: `${restaurant.id}-submitted`,
    action: 'SUBMITTED',
    previous_status: null,
    new_status: restaurant.status,
    actor: { id: restaurant.owner_id || fixtures.owner.id, full_name: restaurant.owner_full_name || fixtures.owner.full_name, email: restaurant.owner_email || fixtures.owner.email },
    reason: null,
    created_at: restaurant.created_at,
  }]);
}

export const mockRestaurantStore = {
  list: () => [...restaurants.values()].map(clone),
  get: (id) => clone(restaurants.get(id)),
  add: (restaurant) => {
    const record = clone(restaurant);
    restaurants.set(record.id, record);
    histories.set(record.id, [{
      id: `${record.id}-submitted`,
      action: 'SUBMITTED',
      previous_status: null,
      new_status: 'PENDING',
      actor: { id: record.owner_id, full_name: record.owner_full_name, email: record.owner_email },
      reason: null,
      created_at: record.created_at,
    }]);
    return clone(record);
  },
  update: (id, changes) => {
    const current = restaurants.get(id);
    if (!current) return null;
    const updated = { ...current, ...clone(changes) };
    restaurants.set(id, updated);
    return clone(updated);
  },
  transition: (id, status, actor, reason = null) => {
    const current = restaurants.get(id);
    if (!current) return null;
    const updated = { ...current, status, rejection_reason: reason };
    restaurants.set(id, updated);
    const events = histories.get(id) || [];
    events.unshift({
      id: `${id}-${status.toLowerCase()}-${Date.now()}`,
      action: status,
      previous_status: current.status,
      new_status: status,
      actor: actor || { ...fixtures.admin },
      reason,
      created_at: new Date().toISOString(),
    });
    histories.set(id, events);
    return clone(updated);
  },
  history: (id) => clone(histories.get(id) || []),
};

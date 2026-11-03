const restaurantStatuses = ['PENDING', 'APPROVED', 'REJECTED'];

const owner = { id: 'owner-demo', full_name: 'Anu Nair', email: 'anu@example.com', mobile: '+919876543210', role: 'OWNER' };
const admin = { id: 'admin-demo', full_name: 'Platform Admin', email: 'admin@example.com', role: 'SUPER_ADMIN' };
const rejectedOwner = { id: 'owner-rejected', full_name: 'Leena Thomas', email: 'rejected@example.com', mobile: '+919876543212', role: 'OWNER' };
const approvedOwner = { id: 'owner-approved', full_name: 'Rahul Menon', email: 'approved@example.com', mobile: '+919876543213', role: 'OWNER' };
const restaurant = { id: 'restaurant-demo', name: 'Coconut Kitchen', slug: 'coconut-kitchen', status: 'PENDING', city: 'Kochi', phone: '+914842000000', rejection_reason: null, created_at: '2026-11-01T12:00:00.000Z' };

export const fixtures = {
  owner,
  restaurant,
  admin,
  rejectedOwner,
  approvedOwner,
  restaurants: Array.from({ length: 21 }, (_, i) => ({
    id: `restaurant-${i + 1}`,
    name: i === 0 ? 'Coconut Kitchen' : `Demo Restaurant ${i + 1}`,
    slug: i === 0 ? 'coconut-kitchen' : `demo-restaurant-${i + 1}`,
    status: restaurantStatuses[i % restaurantStatuses.length],
    city: 'Kochi',
    owner_id: i === 0 ? owner.id : i === 1 ? approvedOwner.id : `owner-${i + 1}`,
    owner_full_name: i === 0 ? owner.full_name : i === 1 ? approvedOwner.full_name : `Restaurant Owner ${i + 1}`,
    owner_email: i === 0 ? owner.email : i === 1 ? approvedOwner.email : `owner${i + 1}@example.com`,
    phone: '+914842000000',
    rejection_reason: i % 3 === 2 ? 'Please provide the complete business details.' : null,
    created_at: new Date(Date.UTC(2026, 10, 1, 12, 0, 0) - i * 86400000).toISOString(),
  })),
};

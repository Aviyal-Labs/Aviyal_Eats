export function sessionDestination({ user, restaurant }) {
  if (user?.role === 'SUPER_ADMIN') return '/admin';
  if (user?.role !== 'OWNER') return '/forbidden';
  const paths = { APPROVED: '/owner/dashboard', PENDING: '/owner/pending', REJECTED: '/owner/rejected' };
  return paths[restaurant?.status] || '/forbidden';
}

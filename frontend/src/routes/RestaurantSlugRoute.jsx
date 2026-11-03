import { Navigate, useParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function RestaurantSlugRoute({ children }) {
  const { restaurantSlug } = useParams();
  const { restaurant } = useAuth();
  // This is a display URL check. Backend calls still use the authenticated owner.
  if (restaurantSlug !== restaurant?.slug) return <Navigate to="/forbidden" replace />;
  return children;
}

import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function ApprovalGate({ allowed, children }) {
  const { restaurant } = useAuth();
  const status = restaurant?.status;
  if (!['PENDING', 'REJECTED', 'APPROVED'].includes(status)) return <Navigate to="/forbidden" replace />;
  if (allowed.includes(status)) return children;
  const destination = status === 'APPROVED' ? '/owner/dashboard' : `/owner/${status.toLowerCase()}`;
  return <Navigate to={destination} replace />;
}
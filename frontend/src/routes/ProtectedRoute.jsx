import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import LoadingPage from '../pages/system/LoadingPage';
import ErrorState from '../components/common/ErrorState';
export default function ProtectedRoute({ children }) {
  const { isAuthenticated, isBootstrapping, bootstrapError, retrySession } = useAuth();
  if (isBootstrapping) return <LoadingPage />;
  if (bootstrapError) return <ErrorState message={bootstrapError} onRetry={retrySession} />;
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

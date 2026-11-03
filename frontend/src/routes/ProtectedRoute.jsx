import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import LoadingPage from '../pages/system/LoadingPage';
export default function ProtectedRoute({ children }) { const { isAuthenticated, isBootstrapping } = useAuth(); if (isBootstrapping) return <LoadingPage />; return isAuthenticated ? children : <Navigate to="/login" replace />; }

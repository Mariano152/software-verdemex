import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import Layout from '../Layout/Layout';
import { Placeholder } from '../Placeholder/Placeholder';

export function ProtectedRoute({ element, allowedRoles = null }) {
  const { isAuthenticated, loadingAuth, user } = useAuth();

  if (loadingAuth) {
    return <Placeholder />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (Array.isArray(allowedRoles) && allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Layout>{element}</Layout>;
}

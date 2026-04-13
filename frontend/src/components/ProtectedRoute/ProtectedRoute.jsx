import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import Layout from '../Layout/Layout';
import { Placeholder } from '../Placeholder/Placeholder';

export function ProtectedRoute({ element }) {
  const { isAuthenticated, loadingAuth } = useAuth();

  if (loadingAuth) {
    return <Placeholder />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <Layout>{element}</Layout>;
}

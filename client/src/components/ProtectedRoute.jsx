import { Navigate, Outlet, useLocation } from 'react-router-dom';
import Loader from './Loader.jsx';
import useAuth from '../hooks/useAuth.js';

export default function ProtectedRoute({ children }) {
  const { user, initializing } = useAuth();
  const location = useLocation();

  if (initializing) {
    return <Loader label="Checking your session…" />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children ?? <Outlet />;
}

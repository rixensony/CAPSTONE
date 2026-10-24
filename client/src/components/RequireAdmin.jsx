import { Navigate, Outlet, useLocation } from 'react-router-dom';
import Loader from './Loader.jsx';
import NotFoundPage from '../pages/NotFoundPage.jsx';
import useAuth from '../hooks/useAuth.js';

export default function RequireAdmin({ children }) {
  const { user, initializing } = useAuth();
  const location = useLocation();

  if (initializing) {
    return <Loader label="Checking your session…" />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (user.role !== 'admin') {
    return <NotFoundPage />;
  }

  return children ?? <Outlet />;
}

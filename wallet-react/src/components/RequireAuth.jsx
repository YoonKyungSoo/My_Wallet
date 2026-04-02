import { Navigate, useLocation } from 'react-router-dom';
import { Auth } from '../lib/auth';

export default function RequireAuth({ children }) {
  const location = useLocation();
  if (!Auth.isLoggedIn()) {
    const next = `${location.pathname}${location.search}` || '/';
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />;
  }
  return children;
}


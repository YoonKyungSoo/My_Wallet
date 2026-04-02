import { Navigate } from 'react-router-dom';
import { Auth } from '../lib/auth';
import RequireAuth from './RequireAuth';

export default function RequireAdmin({ children }) {
  return (
    <RequireAuth>
      {Auth.isAdmin() ? children : <Navigate to="/" replace />}
    </RequireAuth>
  );
}

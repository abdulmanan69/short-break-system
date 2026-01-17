import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth();

  if (loading) return <div className="p-10 text-center text-slate-500 font-bold uppercase tracking-widest">Initialising Session...</div>;
  if (!user) return <Navigate to="/" />;
  
  if (role) {
      const allowedRoles = Array.isArray(role) ? role : [role];
      if (!allowedRoles.includes(user.role)) {
          return <Navigate to="/" />;
      }
  }

  return children;
}
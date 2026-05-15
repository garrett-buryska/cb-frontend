// src/components/Routes.jsx
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Kicks unauthenticated users to /auth/login
export const ProtectedRoute = () => {
  const { user, loading } = useAuth();
  
  if (loading) return <div>Loading Application...</div>; // TODO: REDO LOADING
  if (!user) return <Navigate to="/auth" replace />;
  
  return <Outlet />; // Renders the child route
};

// Kicks authenticated users to the dashboard (away from login/register)
export const PublicOnlyRoute = () => {
  const { user, loading } = useAuth();
  
  if (loading) return <div>Loading...</div>; // TODO: REDO LOADING
  if (user) return <Navigate to="/list" replace />;
  
  return <Outlet />;
};
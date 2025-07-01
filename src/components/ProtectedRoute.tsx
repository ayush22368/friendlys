
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
  companionOnly?: boolean;
}

const ProtectedRoute = ({ children, adminOnly = false, companionOnly = false }: ProtectedRouteProps) => {
  const { user, isAdmin, isCompanion, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return; // Don't redirect while loading
    
    if (!user) {
      navigate('/auth', { replace: true });
      return;
    }
    
    if (adminOnly && !isAdmin) {
      if (isCompanion) {
        navigate('/companion-dashboard', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
      return;
    }
    
    if (companionOnly && !isCompanion) {
      if (isAdmin) {
        navigate('/admin', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
      return;
    }
  }, [user, isAdmin, isCompanion, loading, navigate, adminOnly, companionOnly]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-rose-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-pink-500 mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show nothing while redirecting
  if (!user || (adminOnly && !isAdmin) || (companionOnly && !isCompanion)) {
    return null;
  }

  return <>{children}</>;
};

export default ProtectedRoute;

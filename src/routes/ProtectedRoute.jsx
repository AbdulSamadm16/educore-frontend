import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { expandAllowedRoles } from '../utils/authRoutes';

const ProtectedRoute = ({ 
  element, 
  allowedRoles = null,
  redirectTo = '/login',
  requiredStatus = 'active'
}) => {
  const { user, isLoading, isAuthenticated } = useAuth();

  // Fallback: check localStorage directly (in case of state sync timing issues)
  const getStoredAuth = () => {
    try {
      const storedUser = localStorage.getItem('user');
      const storedAccessToken = localStorage.getItem('accessToken');
      
      if (storedUser && storedAccessToken) {
        return {
          user: JSON.parse(storedUser),
          isAuthenticated: true
        };
      }
    } catch (e) {
      console.error('Error reading stored auth:', e);
    }
    return { user: null, isAuthenticated: false };
  };

  // Use context state if available, otherwise fallback to localStorage
  const { user: contextUser, isAuthenticated: contextIsAuthenticated } = { user, isAuthenticated };
  const { user: storedUser, isAuthenticated: storedIsAuthenticated } = getStoredAuth();
  
  const finalUser = contextUser || storedUser;
  const finalIsAuthenticated = contextIsAuthenticated || storedIsAuthenticated;

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!finalIsAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  // Check for required role
  if (allowedRoles) {
    const userRole = finalUser?.role;
    const userAccountType = finalUser?.accountType;

    const expandedAllowed = expandAllowedRoles(allowedRoles);
    const hasAccess = expandedAllowed.includes(userRole) || expandedAllowed.includes(userAccountType);
    
    if (!hasAccess) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  // Check if admin is linked to an institution
  if (['admin', 'institution_admin'].includes(finalUser?.role) && !finalUser?.institutionId) {
    return <Navigate to="/institution-setup-required" replace />;
  }

  // Check for required status (e.g., email verification)
  if (requiredStatus && finalUser?.status !== requiredStatus) {
    if (finalUser?.status === 'pending_verification') {
      return <Navigate to="/verify-email" replace />;
    }
    if (finalUser?.status === 'pending_approval') {
      return <Navigate to="/pending-approval" replace />;
    }
    if (finalUser?.status === 'rejected') {
      return <Navigate to="/tutor-rejected" replace />;
    }
    if (finalUser?.status === 'banned' || finalUser?.status === 'suspended') {
      return <Navigate to="/account-suspended" replace />;
    }
  }

  return element;
};

export default ProtectedRoute;

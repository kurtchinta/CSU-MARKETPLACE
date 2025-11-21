import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import {
  isAdminRoute,
  isUserRoute
} from '../config/routeConfig';

// Main route guard component that combines AutoRouter and ProtectedRoute functionality
export const RouteGuard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoggedIn, profile, loading } = useAuth();

  useEffect(() => {
    // Only process when profile has finished loading AND user is logged in
    if (loading || !isLoggedIn) {
      return;
    }

    // Wait until profile is actually loaded before doing any redirects
    if (!profile) {
      return;
    }

    const currentPath = location.pathname;

    // Determine user role
    const isAdmin = profile?.role_id === 1 || profile?.is_admin === true;
    const isRegularUser = !isAdmin && profile?.role_id === 2;

    // ====================================================================
    // RULE 1: BLOCK ADMINS FROM USER-ONLY ROUTES (Priority: HIGHEST)
    // ====================================================================
    if (isAdmin && isUserRoute(currentPath)) {
      navigate('/admin', { replace: true });
      return;
    }

    // ====================================================================
    // RULE 2: BLOCK USERS FROM ADMIN-ONLY ROUTES (Priority: HIGHEST)
    // ====================================================================
    if (isRegularUser && isAdminRoute(currentPath)) {
      navigate('/dashboard', { replace: true });
      return;
    }

    // ====================================================================
    // RULE 3: LANDING PAGE REDIRECT ONLY
    // ====================================================================
    if (currentPath === '/') {
      if (isAdmin) {
        navigate('/admin', { replace: true });
        return;
      }
      
      if (isRegularUser) {
        navigate('/dashboard', { replace: true });
        return;
      }
    }

    // If user is on any other valid route, just stay there - no redirects needed

  }, [isLoggedIn, location.pathname, navigate, profile, loading]);

  return null;
};

// Protected route wrapper component
interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireAuth?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requireAdmin = false, 
  requireAuth = true 
}) => {
  const { isLoggedIn, profile, loading } = useAuth();
  const location = useLocation();
  const [showSpinner, setShowSpinner] = useState(false);
  const timerRef = useRef<number | null>(null);
  const hasCheckedAuthRef = useRef(false);

  // ====================================================================
  // ALL HOOKS MUST BE CALLED FIRST - BEFORE ANY EARLY RETURNS
  // ====================================================================
  useEffect(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    
    if (!hasCheckedAuthRef.current && loading && !isLoggedIn) {
      timerRef.current = window.setTimeout(() => {
        setShowSpinner(true);
      }, 250);
    } else {
      setShowSpinner(false);
    }

    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [loading, isLoggedIn]);

  useEffect(() => {
    if (!loading) {
      hasCheckedAuthRef.current = true;
      setShowSpinner(false);
    }
  }, [loading]);

  // ====================================================================
  // NOW WE CAN DO EARLY RETURNS AFTER ALL HOOKS ARE CALLED
  // ====================================================================
  
  // Check if this is a user-only route and we're still loading profile
  const isCurrentPathUserRoute = isUserRoute(location.pathname);
  
  if (requireAuth && !requireAdmin && isCurrentPathUserRoute && loading) {
    // Show blank screen to prevent any rendering while we wait for profile
    return <div className="min-h-screen bg-white" />;
  }

  if (showSpinner) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-700 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  // ====================================================================
  // ADMIN-ONLY PROTECTION
  // ====================================================================
  if (requireAdmin) {
    if (!isLoggedIn) {
      return <Navigate to="/" replace />;
    }
    
    const isAdmin = profile?.role_id === 1 || profile?.is_admin === true;
    
    if (!isAdmin) {
      return <Navigate to="/" replace />;
    }
  }

  // ====================================================================
  // SHARED AUTHENTICATED ROUTE PROTECTION (accessible by both admin & user)
  // ====================================================================
  if (requireAuth && !requireAdmin) {
    if (!isLoggedIn) {
      return <Navigate to="/" replace />;
    }
    
    // Block admins from user-only routes
    const isAdmin = profile?.role_id === 1 || profile?.is_admin === true;
    
    if (isAdmin && isUserRoute(location.pathname)) {
      return <Navigate to="/admin" replace />;
    }
  }

  // Generic auth check
  if (requireAuth && !isLoggedIn && !loading) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

// Export both components from this single file
export default RouteGuard;
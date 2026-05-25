/**
 * Route Configuration System
 * Centralized route management for CSU Marketplace
 * 
 * This file defines all routes with their access control,
 * allowing easy management of admin vs user routes.
 */

import React from 'react';
import LandingPage from '../pages/LandingPage';
import BrowsePage from '../pages/BrowsePage';
import CreateListingPage from '../pages/CreateListingPage';
import MyListingsPage from '../pages/MyListingsPage';
import MyCartPage from '../pages/MyCartPage';
import CheckoutPage from '../pages/CheckoutPage';
import MyOrdersPage from '../pages/MyOrdersPage';
import SellerOrdersPage from '../pages/SellerOrdersPage';
import ProfilePage from '../pages/ProfilePage';
import SellerProfilePage from '../pages/SellerProfilePage';
import DashboardPage from '../pages/DashboardPage';
import TransactionHistoryPage from '../pages/TransactionHistoryPage';
import HelpPage from '../pages/HelpPage';
import AdminDashboard from '../admin/AdminDashboard.tsx';

// =====================================================================
// ROUTE TYPE DEFINITIONS
// =====================================================================

export type RouteAccessLevel = 'public' | 'user' | 'admin' | 'authenticated';

export interface RouteConfig {
  path: string;
  component: React.ComponentType<any>;
  accessLevel: RouteAccessLevel;
  label: string;
  description?: string;
  icon?: string;
}

// =====================================================================
// ADMIN-ONLY ROUTES (Role ID: 1)
// =====================================================================

export const ADMIN_ROUTES: RouteConfig[] = [
  {
    path: '/admin',
    component: AdminDashboard,
    accessLevel: 'admin',
    label: 'Admin Dashboard',
    description: 'Administrative dashboard for managing platform',
    icon: '⚙️'
  }
];

// =====================================================================
// USER-ONLY ROUTES (Role ID: 2)
// Cannot be accessed by admins
// =====================================================================

export const USER_ONLY_ROUTES: RouteConfig[] = [
  {
    path: '/dashboard',
    component: DashboardPage,
    accessLevel: 'user',
    label: 'User Dashboard',
    description: 'Personal marketplace dashboard',
    icon: '📊'
  }
];

// =====================================================================
// SHARED AUTHENTICATED ROUTES
// Can be accessed by both admins and users
// =====================================================================

export const SHARED_AUTHENTICATED_ROUTES: RouteConfig[] = [
  {
    path: '/browse',
    component: BrowsePage,
    accessLevel: 'authenticated',
    label: 'Browse Products',
    description: 'Browse and search marketplace products',
    icon: '🔍'
  },
  {
    path: '/create-listing',
    component: CreateListingPage,
    accessLevel: 'authenticated',
    label: 'Create Listing',
    description: 'Create a new product listing',
    icon: '➕'
  },
  {
    path: '/my-listings',
    component: MyListingsPage,
    accessLevel: 'authenticated',
    label: 'My Listings',
    description: 'Manage your product listings',
    icon: '📋'
  },
  {
    path: '/my-orders',
    component: MyOrdersPage,
    accessLevel: 'authenticated',
    label: 'My Orders',
    description: 'View your purchase orders',
    icon: '📦'
  },
  {
    path: '/seller-orders',
    component: SellerOrdersPage,
    accessLevel: 'authenticated',
    label: 'Seller Orders',
    description: 'Manage incoming seller orders',
    icon: '🤝'
  },
  {
    path: '/profile',
    component: ProfilePage,
    accessLevel: 'authenticated',
    label: 'Profile',
    description: 'Manage your profile settings',
    icon: '👤'
  },
  {
    path: '/seller/:sellerId',
    component: SellerProfilePage,
    accessLevel: 'authenticated',
    label: 'Seller Profile',
    description: 'View seller profile and reviews',
    icon: '👥'
  },
  {
    path: '/cart',
    component: MyCartPage,
    accessLevel: 'authenticated',
    label: 'Shopping Cart',
    description: 'View and manage shopping cart',
    icon: '🛍️'
  },
  {
    path: '/checkout',
    component: CheckoutPage,
    accessLevel: 'authenticated',
    label: 'Checkout',
    description: 'Process your order',
    icon: '💳'
  },
  {
    path: '/transaction-history',
    component: TransactionHistoryPage,
    accessLevel: 'authenticated',
    label: 'Blockchain History',
    description: 'View blockchain transaction history',
    icon: '⛓️'
  }
];

// =====================================================================
// PUBLIC ROUTES
// Accessible to everyone (logged in or not)
// =====================================================================

export const PUBLIC_ROUTES: RouteConfig[] = [
  {
    path: '/',
    component: LandingPage,
    accessLevel: 'public',
    label: 'Landing',
    description: 'Landing page',
    icon: '🏠'
  },
  {
    path: '/help',
    component: HelpPage,
    accessLevel: 'public',
    label: 'Help',
    description: 'Getting started guide and help center',
    icon: '❓'
  }
];

// =====================================================================
// ALL PROTECTED ROUTES (requires authentication)
// =====================================================================

export const ALL_PROTECTED_ROUTES: RouteConfig[] = [
  ...ADMIN_ROUTES,
  ...USER_ONLY_ROUTES,
  ...SHARED_AUTHENTICATED_ROUTES
];

// =====================================================================
// ALL ROUTES
// =====================================================================

export const ALL_ROUTES: RouteConfig[] = [
  ...PUBLIC_ROUTES,
  ...ADMIN_ROUTES,
  ...USER_ONLY_ROUTES,
  ...SHARED_AUTHENTICATED_ROUTES
];

// =====================================================================
// UTILITY FUNCTIONS FOR ROUTE MANAGEMENT
// =====================================================================

/**
 * Check if a user can access a specific route
 * @param path - The route path
 * @param isAdmin - Whether the user is an admin
 * @param isLoggedIn - Whether the user is logged in
 * @returns true if user can access the route
 */
export const canAccessRoute = (
  path: string,
  isAdmin: boolean,
  isLoggedIn: boolean
): boolean => {
  const route = ALL_ROUTES.find(r => r.path === path);

  if (!route) return false;

  switch (route.accessLevel) {
    case 'public':
      return true;

    case 'admin':
      return isAdmin && isLoggedIn;

    case 'user':
      return !isAdmin && isLoggedIn;

    case 'authenticated':
      return isLoggedIn;

    default:
      return false;
  }
};

/**
 * Get the appropriate redirect for a user based on their role
 * @param isAdmin - Whether the user is an admin
 * @returns The redirect path
 */
export const getDefaultRedirect = (isAdmin: boolean): string => {
  return isAdmin ? '/admin' : '/dashboard';
};

/**
 * Get all routes accessible by a specific user type
 * @param isAdmin - Whether to get admin routes
 * @returns Array of accessible routes
 */
export const getAccessibleRoutes = (isAdmin: boolean): RouteConfig[] => {
  if (isAdmin) {
    return [...ADMIN_ROUTES, ...SHARED_AUTHENTICATED_ROUTES];
  } else {
    return [...USER_ONLY_ROUTES, ...SHARED_AUTHENTICATED_ROUTES];
  }
};

/**
 * Check if a path is an admin-only route
 * @param path - The route path
 * @returns true if the route is admin-only
 */
export const isAdminRoute = (path: string): boolean => {
  return ADMIN_ROUTES.some(r => r.path === path);
};

/**
 * Check if a path is a user-only route
 * @param path - The route path
 * @returns true if the route is user-only
 */
export const isUserRoute = (path: string): boolean => {
  return USER_ONLY_ROUTES.some(r => r.path === path);
};

/**
 * Check if a path is protected (requires authentication)
 * @param path - The route path
 * @returns true if the route is protected
 */
export const isProtectedRoute = (path: string): boolean => {
  return ALL_PROTECTED_ROUTES.some(r => r.path === path);
};

/**
 * Get all route paths
 * @returns Array of all route paths
 */
export const getAllRoutePaths = (): string[] => {
  return ALL_ROUTES.map(r => r.path);
};

// =====================================================================
// EXPORT ROUTE GROUPS FOR EASY ACCESS
// =====================================================================

export const ROUTES = {
  admin: ADMIN_ROUTES,
  user: USER_ONLY_ROUTES,
  shared: SHARED_AUTHENTICATED_ROUTES,
  public: PUBLIC_ROUTES,
  protected: ALL_PROTECTED_ROUTES,
  all: ALL_ROUTES
};

export default ROUTES;

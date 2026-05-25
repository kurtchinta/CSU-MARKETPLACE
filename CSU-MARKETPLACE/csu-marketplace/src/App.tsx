import './index.css'
import { Route, Routes, Navigate } from "react-router";
import LandingPage from "./pages/LandingPage.tsx";
import BrowsePage from "./pages/BrowsePage.tsx";
import ProductDetails from "./pages/ProductDetails.tsx";
import CreateListingPage from "./pages/CreateListingPage.tsx";
import EditListingPage from "./pages/EditListingPage.tsx";
import MyListingsPage from "./pages/MyListingsPage.tsx";
import MyCartPage from "./pages/MyCartPage.tsx";
import CheckoutPage from "./pages/CheckoutPage.tsx";
import MyOrdersPage from "./pages/MyOrdersPage.tsx";
import SellerOrdersPage from "./pages/SellerOrdersPage.tsx";
import ProfilePage from "./pages/ProfilePage.tsx";
import SellerProfilePage from "./pages/SellerProfilePage.tsx";
import DashboardPage from "./pages/DashboardPage.tsx";
import HelpPage from "./pages/HelpPage.tsx";
import { ResetPasswordPage } from "./pages/ResetPasswordPage.tsx";
import { ConfirmEmailPage } from "./pages/ConfirmEmailPage.tsx";
import FavoritesPage from "./pages/FavoritesPage.tsx";
import TransactionHistoryPage from "./pages/TransactionHistoryPage.tsx";
import AdminDashboard from "./admin/AdminDashboard.tsx";
import { Navbar } from './components/Navbar.tsx';
import RouteGuard from './components/RouteGuard.tsx';
import { CartDrawer } from './components/Cart.tsx';
import { ModalProvider } from './context/ModalContext';
import { AuthProvider } from './context/AuthContext';
import { WalletProvider } from './context/WalletContext';
import { CartProvider } from './context/CartContext';
import { DirectCheckoutProvider } from './context/DirectCheckoutContext';
import { useAuth } from './context/AuthContext';

// Helper function to determine if user can access a route
const canAccessRoute = (profile: any, routeType: 'admin' | 'user' | 'shared'): boolean => {
  if (!profile) return false;

  const isAdmin = profile?.role_id === 1 || profile?.is_admin === true;

  if (routeType === 'admin') {
    return isAdmin;
  } else if (routeType === 'user') {
    return !isAdmin && profile?.role_id === 2;
  } else if (routeType === 'shared') {
    return true; // Both admin and user can access
  }

  return false;
};

// Landing page wrapper that redirects logged-in users before rendering
const LandingPageWrapper = () => {
  const { isLoggedIn, profile, loading } = useAuth();

  // If user is logged in and profile is loaded, redirect immediately
  if (isLoggedIn && profile && !loading) {
    const isAdmin = profile?.role_id === 1 || profile?.is_admin === true;
    if (isAdmin) {
      return <Navigate to="/admin" replace />;
    } else {
      return <Navigate to="/dashboard" replace />;
    }
  }

  // If still loading, show nothing - instant redirect will happen
  if (isLoggedIn && loading) {
    return null;
  }

  // Show landing page for guests
  return <LandingPage />;
};

// Admin dashboard wrapper
const AdminDashboardWrapper = () => {
  const { isLoggedIn, profile, loading } = useAuth();

  // If not logged in or still loading, show nothing
  if (!isLoggedIn || loading || !profile) {
    return null;
  }

  // Check if admin
  const isAdmin = profile?.role_id === 1 || profile?.is_admin === true;

  // If not admin, redirect to dashboard
  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  // If admin, render the dashboard
  return <AdminDashboard />;
};

// User dashboard wrapper
const DashboardWrapper = () => {
  const { isLoggedIn, profile, loading } = useAuth();

  // If not logged in or still loading, show nothing
  if (!isLoggedIn || loading || !profile) {
    return null;
  }

  // Check if admin
  const isAdmin = profile?.role_id === 1 || profile?.is_admin === true;

  // If admin, redirect to admin dashboard
  if (isAdmin) {
    return <Navigate to="/admin" replace />;
  }

  // If regular user, render the dashboard
  return <DashboardPage />;
};

// Generic protected page wrapper - stays on current page if has access
const ProtectedPageWrapper = ({ 
  children, 
  routeType 
}: { 
  children: React.ReactNode; 
  routeType: 'admin' | 'user' | 'shared';
}) => {
  const { isLoggedIn, profile, loading } = useAuth();

  // If not logged in or still loading, show nothing
  if (!isLoggedIn || loading || !profile) {
    return null;
  }

  // Check if user can access this route
  if (!canAccessRoute(profile, routeType)) {
    const isAdmin = profile?.role_id === 1 || profile?.is_admin === true;
    return <Navigate to={isAdmin ? "/admin" : "/dashboard"} replace />;
  }

  // User can access, render the page
  return <>{children}</>;
};

function App() {
  return (
    <WalletProvider>
      <AuthProvider>
        <DirectCheckoutProvider>
          <CartProvider>
            <ModalProvider>
              <div className="min-h-screen bg-gray-50">
                <Navbar />
                <RouteGuard />
                <main>
                  <Routes>
                  <Route path="/" element={<LandingPageWrapper />} />
                  
                  {/* Public route - Help Page */}
                  <Route path="/help" element={<HelpPage />} />
                  
                  {/* Public route - Password Reset */}
                  <Route path="/reset-password" element={<ResetPasswordPage />} />
                  
                  {/* Public route - Email Confirmation */}
                  <Route path="/confirm-email" element={<ConfirmEmailPage />} />
                  
                  {/* Public route for browsing products - shared by both admin and user */}
                  <Route 
                    path="/browse" 
                    element={
                      <ProtectedPageWrapper routeType="shared">
                        <BrowsePage />
                      </ProtectedPageWrapper>
                    } 
                  />
                  
                  {/* Product details page - shared by both admin and user */}
                  <Route 
                    path="/product/:id" 
                    element={
                      <ProtectedPageWrapper routeType="shared">
                        <ProductDetails />
                      </ProtectedPageWrapper>
                    } 
                  />

                  {/* Seller profile page - shared by both admin and user */}
                  <Route 
                    path="/seller/:sellerId" 
                    element={
                      <ProtectedPageWrapper routeType="shared">
                        <SellerProfilePage />
                      </ProtectedPageWrapper>
                    } 
                  />
                  
                  {/* Admin-only dashboard */}
                  <Route 
                    path="/admin" 
                    element={<AdminDashboardWrapper />}
                  />
                  
                  {/* User dashboard */}
                  <Route 
                    path="/dashboard" 
                    element={<DashboardWrapper />}
                  />
                  
                  {/* Protected user routes */}
                  <Route 
                    path="/create-listing" 
                    element={
                      <ProtectedPageWrapper routeType="user">
                        <CreateListingPage />
                      </ProtectedPageWrapper>
                    } 
                  />
                  
                  <Route 
                    path="/edit-listing/:productId" 
                    element={
                      <ProtectedPageWrapper routeType="user">
                        <EditListingPage />
                      </ProtectedPageWrapper>
                    } 
                  />
                  
                  <Route 
                    path="/my-listings" 
                    element={
                      <ProtectedPageWrapper routeType="user">
                        <MyListingsPage />
                      </ProtectedPageWrapper>
                    } 
                  />
                  
                  <Route 
                    path="/cart" 
                    element={
                      <ProtectedPageWrapper routeType="user">
                        <MyCartPage />
                      </ProtectedPageWrapper>
                    } 
                  />
                  
                  {/* Checkout route - for processing orders */}
                  <Route 
                    path="/checkout" 
                    element={
                      <ProtectedPageWrapper routeType="user">
                        <CheckoutPage />
                      </ProtectedPageWrapper>
                    } 
                  />
                  
                  {/* My Orders route - for viewing order status */}
                  <Route 
                    path="/my-orders" 
                    element={
                      <ProtectedPageWrapper routeType="user">
                        <MyOrdersPage />
                      </ProtectedPageWrapper>
                    } 
                  />
                  
                  {/* Seller Orders route - for viewing and managing buyer requests */}
                  <Route 
                    path="/seller-orders" 
                    element={
                      <ProtectedPageWrapper routeType="user">
                        <SellerOrdersPage />
                      </ProtectedPageWrapper>
                    } 
                  />
                  
                  <Route 
                    path="/profile" 
                    element={
                      <ProtectedPageWrapper routeType="shared">
                        <ProfilePage />
                      </ProtectedPageWrapper>
                    } 
                  />
                  
                  {/* Favorites route - for viewing saved favorite items */}
                  <Route 
                    path="/favorites" 
                    element={
                      <ProtectedPageWrapper routeType="user">
                        <FavoritesPage />
                      </ProtectedPageWrapper>
                    } 
                  />
                  
                  {/* Transaction History route - for viewing all transactions */}
                  <Route 
                    path="/transaction-history" 
                    element={
                      <ProtectedPageWrapper routeType="user">
                        <TransactionHistoryPage />
                      </ProtectedPageWrapper>
                    } 
                  />
                </Routes>
              </main>
              <CartDrawer />
            </div>
          </ModalProvider>
        </CartProvider>
        </DirectCheckoutProvider>
      </AuthProvider>
    </WalletProvider>
  );
}

export default App

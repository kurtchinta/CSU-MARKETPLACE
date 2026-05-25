import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { useModal } from "../context/ModalContext.tsx";
import { useWallet } from "../hooks/useWallet";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext.tsx";
import { Bell } from "lucide-react";
import { supabase } from "../lib/supabase";



declare global {
  interface Window {
    ethereum?: any;
  }
}
export const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [walletDropdownOpen, setWalletDropdownOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [notificationsDropdownOpen, setNotificationsDropdownOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [ordersDropdownOpen, setOrdersDropdownOpen] = useState(false);
  const [loginForm, setLoginForm] = useState({ identifier: '', password: '', rememberMe: false });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [forgotPasswordModalOpen, setForgotPasswordModalOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [accountBgColor, setAccountBgColor] = useState('');
  const [walletWarningModalOpen, setWalletWarningModalOpen] = useState(false);
  const [attemptedAction, setAttemptedAction] = useState<'login' | 'register' | null>(null);

  // Generate random color on component mount
  useEffect(() => {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B88B', '#52C9A3'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    setAccountBgColor(randomColor);
  }, []);
  
  const location = useLocation();
  const navigate = useNavigate();
  const { cartItems } = useCart();
  const { 
    loginModalOpen, 
    registerModalOpen, 
    setLoginModalOpen, 
    setRegisterModalOpen,
    alertModalOpen,
    alertConfig,
    setAlertModalOpen,
    showSuccess,
    showError,
    showWarning,
    showInfo
  } = useModal();

  // Auth hook
  const {
    profile,
    isLoggedIn,
    loading: authLoading,
    login,
    register,
    logout
  } = useAuth();

  // Debug logging removed - check /lib/debug.ts for centralized logging

  // Wallet hook
  const {
    account,
    isConnecting,
    connectWallet,
    disconnectWallet,
    isConnected: walletConnected,
    formatAddress
  } = useWallet();
  
  // Only show modal buttons on landing page
  const isLandingPage = location.pathname === '/';

  // Fetch notifications when user is logged in
  useEffect(() => {
    if (isLoggedIn && profile?.user_id) {
      fetchNotifications();
    }
  }, [isLoggedIn, profile?.user_id]);

  const fetchNotifications = async () => {
    if (!profile?.user_id || !supabase) return;

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', profile.user_id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching notifications:', error);
        return;
      }

      setNotifications(data || []);
      const unread = data?.filter((n: any) => !n.is_read).length || 0;
      setUnreadCount(unread);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const markNotificationAsRead = async (notificationId: number) => {
    if (!supabase) return;

    try {
      await supabase
        .from('notifications')
        .update({ 
          is_read: true,
          read_at: new Date().toISOString()
        })
        .eq('notification_id', notificationId);

      setNotifications(prev => 
        prev.map(n => n.notification_id === notificationId ? { ...n, is_read: true, read_at: new Date().toISOString() } : n)
      );
      
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const clearAllNotifications = async () => {
    if (!profile?.user_id || !supabase) return;

    try {
      await supabase
        .from('notifications')
        .delete()
        .eq('user_id', profile.user_id);

      setNotifications([]);
      setUnreadCount(0);
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  };

  const handleLoginClick = () => {
    if (isLandingPage) {
      // Check if wallet is connected before allowing login
      if (!account) {
        setAttemptedAction('login');
        setWalletWarningModalOpen(true);
        return;
      }
      setLoginModalOpen(true);
    } else {
      navigate('/');
    }
  };

  const handleRegisterClick = () => {
    if (isLandingPage) {
      // Check if wallet is connected before allowing registration
      if (!account) {
        setAttemptedAction('register');
        setWalletWarningModalOpen(true);
        return;
      }
      setRegisterModalOpen(true);
    } else {
      navigate('/');
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    
    try {
      if (!resetEmail?.trim()) {
        showError('Missing Email', 'Please enter your email address.');
        return;
      }

      // Email validation
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(resetEmail)) {
        showError('Invalid Email', 'Please enter a valid email address.');
        return;
      }

      if (!supabase) {
        showError('Service Error', 'Database service is not available.');
        return;
      }

      // Send password reset email using Supabase
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        showError('Reset Failed', error.message || 'Failed to send reset email. Please try again.');
        return;
      }

      // Success
      setForgotPasswordModalOpen(false);
      setResetEmail('');
      showSuccess(
        'Reset Email Sent!',
        `We've sent a password reset link to ${resetEmail}.\n\nPlease check your email and click the link to reset your password.\n\nThe link will expire in 1 hour.`,
        () => {
          setLoginModalOpen(false);
        }
      );
    } catch (error: any) {
      console.error('❌ Password reset error:', error);
      showError('Reset Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    
    try {
      const formData = new FormData(e.target as HTMLFormElement);
      const identifier = formData.get('identifier') as string;
      const password = formData.get('password') as string;
      
      if (!identifier?.trim() || !password?.trim()) {
        showError('Missing Information', 'Please fill in all required fields.');
        return;
      }

      const result = await login(identifier.trim(), password);
      
      if (result.success) {
        console.log('✅ Login successful! RouteGuard will handle navigation.');
        
        // Close modal and reset form
        setLoginModalOpen(false);
        setLoginForm({ identifier: '', password: '', rememberMe: false });
        
        // The RouteGuard component will automatically redirect based on role
        // No manual navigation needed here - let the guard handle it
      } else {
        showError('Login Failed', result.error || 'Please check your credentials and try again.');
      }
    } catch (error: any) {
      console.error('❌ Login error:', error);
      showError('Login Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    
    try {
      const formData = new FormData(e.target as HTMLFormElement);
      const email = formData.get('email') as string;
      const password = formData.get('password') as string;
      const confirmPassword = formData.get('confirmPassword') as string;
      
      const profileData = {
        // Profile fields (matching V6 database schema)
        username: formData.get('username') as string,
        firstName: formData.get('firstName') as string,
        lastName: formData.get('lastName') as string,
        gender: formData.get('gender') as string,
        idNumber: formData.get('idNumber') as string,
        phoneNumber: formData.get('phoneNumber') as string,
        department: formData.get('department') as string,
        yearLevel: formData.get('yearLevel') as string,
        walletAddress: walletConnected ? account : null,
      };
      
      // Basic validation
      if (!email || !password || !profileData.username || 
          !profileData.firstName || !profileData.lastName || !profileData.idNumber ||
          !profileData.gender || !profileData.phoneNumber || !profileData.department ||
          !profileData.yearLevel) {
        showError('Missing Information', 'Please fill in all required fields.');
        return;
      }
      
      // Email validation
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(email)) {
        showError('Invalid Email', 'Please enter a valid email address.');
        return;
      }
      
      // ID Number validation (XXX-XXXXX format)
      const idPattern = /^[0-9]{3}-[0-9]{5}$/;
      if (!idPattern.test(profileData.idNumber)) {
        showError('Invalid ID Number', 'ID Number must be in format: 221-01385');
        return;
      }
      
      // Phone number validation (11 digits)
      const phonePattern = /^[0-9]{11}$/;
      if (!phonePattern.test(profileData.phoneNumber)) {
        showError('Invalid Phone Number', 'Phone number must be 11 digits (e.g., 09385416513)');
        return;
      }
      
      // Username validation (3-50 characters, alphanumeric and underscore only)
      const usernamePattern = /^[a-zA-Z0-9_]{3,50}$/;
      if (!usernamePattern.test(profileData.username)) {
        showError('Invalid Username', 'Username must be 3-50 characters, letters, numbers, and underscores only.');
        return;
      }
      
      if (password !== confirmPassword) {
        showError('Password Mismatch', 'Passwords do not match. Please try again.');
        return;
      }
      
      if (password.length < 6) {
        showError('Weak Password', 'Password must be at least 6 characters long.');
        return;
      }

      // Register with profile data
      const result = await register(email, password, profileData);
      
      if (result.success) {
        console.log('✅ Registration successful! Opening email to confirm...');
        
        // Close modal
        setRegisterModalOpen(false);
        
        // Show success modal with instructions
        showSuccess(
          'Registration Successful!',
          `Welcome to CSU Marketplace! Your account has been created successfully.\n\n📧 We've sent a confirmation email to ${email}.\n\n✅ Please click the confirmation link in your email to verify your account and automatically log in.\n\n⏰ The link will expire in 24 hours.\n\nTip: Check your spam folder if you don't see the email.`,
          () => {
            // After user closes modal, open email in new tab
            const emailDomain = email.split('@')[1];
            let emailUrl = 'https://mail.google.com';
            
            // Open email provider based on domain
            if (emailDomain.includes('gmail') || emailDomain.includes('carsu.edu.ph')) {
              emailUrl = 'https://mail.google.com';
            } else if (emailDomain.includes('yahoo')) {
              emailUrl = 'https://mail.yahoo.com';
            } else if (emailDomain.includes('outlook') || emailDomain.includes('hotmail')) {
              emailUrl = 'https://outlook.live.com';
            }
            
            // Open email in new tab so user can verify
            window.open(emailUrl, '_blank');
          }
        );
      } else {
        showError('Registration Failed', result.error || 'Failed to create account. Please try again.');
      }
    } catch (error: any) {
      showError('Registration Error', error.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle logout
  const handleLogout = async () => {
    try {

      
      const result = await logout();
      
      if (result.success) {

        
        // Close any open modals
        setLoginModalOpen(false);
        setRegisterModalOpen(false);
        setAlertModalOpen(false);
        
        // Reset form states
        setLoginForm({ identifier: '', password: '', rememberMe: false });
        
        // Close mobile menu
        setMenuOpen(false);
        
        // Show success message and redirect to landing page
        showSuccess('Logged Out', 'You have been successfully logged out.', () => {
          navigate('/', { replace: true });
        });
      } else {
        showError('Logout Failed', result.error || 'Failed to logout');
      }
    } catch (error: any) {
      console.error('❌ Logout error:', error);
      showError('Logout Error', 'An unexpected error occurred during logout');
    }
  };

  // Wallet connection handlers with modal integration
  const handleConnectWallet = async () => {
    await connectWallet((type: string, title: string, message: string, callback?: () => void) => {
      if (type === 'success') {
        showSuccess(title, message, callback);
      } else if (type === 'error') {
        showError(title, message);
      } else if (type === 'warning') {
        showWarning(title, message, callback);
      } else if (type === 'info') {
        showInfo(title, message);
      }
    });
  };

  const handleDisconnectWallet = () => {
    disconnectWallet((type: string, title: string, message: string) => {
      if (type === 'success') {
        showSuccess(title, message);
      } else if (type === 'error') {
        showError(title, message);
      } else if (type === 'warning') {
        showWarning(title, message);
      } else if (type === 'info') {
        showInfo(title, message);
      }
    });
    setWalletDropdownOpen(false); // Close dropdown after disconnect
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.wallet-dropdown') && !target.closest('.user-dropdown') && !target.closest('.notifications-dropdown') && !target.closest('.orders-dropdown')) {
        setWalletDropdownOpen(false);
        setUserDropdownOpen(false);
        setNotificationsDropdownOpen(false);
        setOrdersDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
   
  return (
    <nav className="sticky top-0 z-50" style={{ backgroundColor: '#208756' }}>
      {/* Top Bar - Start Selling, Notifications, Help, Auth */}
      <div className="border-b" style={{ borderColor: 'rgba(255,255,255,0.2)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-12">
            {/* Left side - Start Selling and My Listings links */}
            <div className="flex items-center space-x-4">
              {/* Start Selling Button - Hide for admins */}
              {!profile?.is_admin && (
                <button
                  onClick={() => {
                    if (!isLoggedIn) {
                      showWarning('Login Required', 'Please log in or sign up to start selling.');
                    } else {
                      navigate('/create-listing');
                    }
                  }}
                  className="text-white/90 hover:text-yellow-300 text-xs font-medium transition-colors flex items-center space-x-1"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Start Selling</span>
                </button>
              )}
              
              {/* My Listings Button */}
              {isLoggedIn && !profile?.is_admin && profile && (
                <button
                  onClick={() => navigate('/my-listings')}
                  className="text-white/90 hover:text-yellow-300 text-xs font-medium transition-colors flex items-center space-x-1"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                  <span>My Products</span>
                </button>
              )}
            </div>

            {/* Right side - Notifications, Help, Auth */}
            <div className="flex items-center space-x-4">
              {/* Notifications - For all users, requires login */}
              <div className="relative notifications-dropdown">
                <button
                  onClick={() => {
                    if (isLoggedIn) {
                      setNotificationsDropdownOpen(!notificationsDropdownOpen);
                    } else {
                      showWarning(
                        'Login Required',
                        'Please log in to view notifications.',
                        () => {
                          if (isLandingPage) {
                            setLoginModalOpen(true);
                          } else {
                            navigate('/');
                          }
                        }
                      );
                    }
                  }}
                  className="relative flex items-center space-x-2 px-3 py-1.5 text-white hover:text-yellow-300 rounded-full hover:bg-white/10 transition-all duration-300"
                  title="Notifications"
                >
                  <span className="text-xs font-medium">Notifications</span>
                  <Bell className="w-5 h-5" />
                  {isLoggedIn && notifications.length > 0 && notifications.some((n: any) => !n.is_read) && (
                    <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-green-800 transform bg-yellow-400 rounded-full animate-pulse">
                      {notifications.filter((n: any) => !n.is_read).length > 9 ? '9+' : notifications.filter((n: any) => !n.is_read).length}
                    </span>
                  )}
                </button>

                {/* Notifications Dropdown - Only show when logged in */}
                {isLoggedIn && notificationsDropdownOpen && (
                <div className="absolute right-0 top-12 mt-2 w-96 bg-white rounded-xl shadow-2xl py-0 z-50 max-h-96 overflow-y-auto border-t-4" style={{ borderColor: '#208756' }}>
                  <div className="sticky top-0 px-4 py-4 flex justify-between items-center" style={{ backgroundColor: '#208756' }}>
                    <h3 className="font-bold text-white text-base">Recently Received Notifications</h3>
                  </div>
                  <div className="px-4 py-2 flex justify-between items-center border-b border-gray-200 bg-gray-50">
                    <div className="flex items-center space-x-2 flex-1">
                      {notifications.length > 0 && (
                        <>
                          <button
                            onClick={async () => {
                              if (!supabase || !profile?.user_id) return;
                              
                              // Update all notifications in database
                              await supabase
                                .from('notifications')
                                .update({ is_read: true, read_at: new Date().toISOString() })
                                .eq('user_id', profile.user_id);
                              
                              // Update local state
                              const updated = notifications.map(n => ({ ...n, is_read: true, read_at: new Date().toISOString() }));
                              setNotifications(updated);
                              setUnreadCount(0);
                            }}
                            className="text-xs text-gray-700 hover:text-gray-900 font-medium transition-colors py-1 px-2 rounded hover:bg-white"
                            title="Mark all as read"
                          >
                            Mark All
                          </button>
                          <div className="w-px h-3 bg-gray-300"></div>
                          <button
                            onClick={clearAllNotifications}
                            className="text-xs text-gray-700 hover:text-gray-900 font-medium transition-colors py-1 px-2 rounded hover:bg-white"
                            title="Clear all notifications"
                          >
                            Clear
                          </button>
                        </>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                      className="text-xs text-gray-700 hover:text-gray-900 font-medium transition-colors py-1 px-2 rounded hover:bg-white ml-auto"
                      title="View all notifications"
                    >
                      View All
                    </button>
                  </div>

                  {notifications.length === 0 ? (
                    <div className="px-4 py-12 text-center">
                      <svg className="w-16 h-16 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                      <p className="text-sm font-medium text-gray-500">No notifications yet</p>
                      <p className="text-xs text-gray-400 mt-1">Stay tuned for updates</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {notifications.map((notification: any) => (
                        <div
                          key={notification.notification_id}
                          className={`px-4 py-3 cursor-pointer transition-colors border-l-4 hover:bg-green-50 ${
                            notification.is_read
                              ? 'bg-white border-l-transparent hover:border-l-green-500'
                              : 'bg-green-50 border-l-green-500'
                          }`}
                          onClick={() => {
                            if (notification.is_read) {
                              setNotifications(prev =>
                                prev.map(n => n.notification_id === notification.notification_id ? { ...n, is_read: false } : n)
                              );
                              setUnreadCount(prev => prev + 1);
                            } else {
                              markNotificationAsRead(notification.notification_id);
                            }
                          }}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <p className={`text-sm font-semibold ${notification.is_read ? 'text-gray-700' : 'text-gray-900'}`}>
                                {notification.title}
                              </p>
                              <p className={`text-xs mt-1.5 ${notification.is_read ? 'text-gray-500' : 'text-gray-600'}`}>
                                {notification.message}
                              </p>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (notification.is_read) {
                                  // Mark as unread
                                  if (supabase) {
                                    supabase
                                      .from('notifications')
                                      .update({ is_read: false, read_at: null })
                                      .eq('notification_id', notification.notification_id)
                                      .then(() => {
                                        setNotifications(prev =>
                                          prev.map(n => n.notification_id === notification.notification_id ? { ...n, is_read: false, read_at: null } : n)
                                        );
                                        setUnreadCount(prev => prev + 1);
                                      });
                                  }
                                } else {
                                  // Mark as read
                                  markNotificationAsRead(notification.notification_id);
                                }
                              }}
                              className="text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors ml-2 py-1 px-2 rounded hover:bg-gray-100"
                              title={notification.is_read ? 'Mark as unread' : 'Mark as read'}
                            >
                              {notification.is_read ? 'Unread' : 'Read'}
                            </button>
                          </div>
                          <p className="text-xs text-gray-400 mt-2">
                            {new Date(notification.created_at).toLocaleDateString()} {new Date(notification.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              </div>

              {/* Help */}
              <Link 
                to="/help" 
                className="text-white/90 hover:text-yellow-300 text-xs font-medium transition-colors"
              >
                Help
              </Link>

              {/* Logged in username greeting */}
              {isLoggedIn && profile && (
                <span className="text-white/90 text-xs font-medium">
                  Hi, <span className="font-bold text-yellow-300">{profile.username}</span>
                </span>
              )}

              {/* Auth Buttons */}
              {!isLoggedIn && !authLoading && (
                <>
                  <button
                    onClick={handleLoginClick}
                    className="text-white/90 hover:text-yellow-300 text-xs font-bold transition-colors"
                  >
                    Sign In
                  </button>
                  <div className="h-4 w-px bg-white/30"></div>
                  <button
                    onClick={handleRegisterClick}
                    className="text-white/90 hover:text-yellow-300 text-xs font-bold transition-colors"
                  >
                    Sign Up
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20 gap-6">
          {/* Logo */}
          <Link 
            to="/" 
            className="flex-shrink-0 flex items-center space-x-3 text-white hover:opacity-80 transition-opacity group"
          >
            <svg className="w-10 h-10 group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="none">
              <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" 
                    stroke="#FFCF50" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="text-xl font-black tracking-wider" >

              CSU MARKETPLACE
            </span>
          </Link>

          {/* Desktop Navigation Links - Moved to center */}
          <div className="hidden md:flex flex-1 justify-center items-center space-x-2">
            {/* Admin Links */}
            {isLoggedIn && profile?.is_admin && (
              <>
                <Link 
                  to="/admin" 
                  className="relative group text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 hover:bg-white/10"
                  style={{ '--hover-color': '#FFCF50' } as React.CSSProperties}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#FFCF50'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'white'}
                >
                  <span className="relative z-10">Dashboard</span>
                </Link>
                <Link 
                  to="/browse" 
                  className="relative group text-white hover:text-yellow-300 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 hover:bg-white/10"
                >
                  <span className="relative z-10">Browse</span>
                </Link>
              </>
            )}
            
            {/* Regular User Links - Primary Actions (only show when profile is loaded) */}
            {isLoggedIn && !profile?.is_admin && profile && (
              <>
                <Link 
                  to="/browse" 
                  className="text-white hover:text-yellow-300 px-3 py-2 rounded-lg text-sm font-semibold transition-colors"
                >
                  Browse
                </Link>
                <Link 
                  to="/dashboard" 
                  className="text-white hover:text-yellow-300 px-3 py-2 rounded-lg text-sm font-semibold transition-colors"
                >
                  Dashboard
                </Link>
                
                {/* Orders Dropdown Menu */}
                <div className="relative orders-dropdown">
                  <button 
                    onClick={() => setOrdersDropdownOpen(!ordersDropdownOpen)}
                    className="text-white px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300 hover:bg-white/10 flex items-center space-x-2"
                    onMouseEnter={(e) => e.currentTarget.style.color = '#FFCF50'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'white'}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <span>Orders</span>
                    <svg className={`w-4 h-4 transition-transform ${ordersDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {/* Dropdown */}
                  {ordersDropdownOpen && (
                  <div className="absolute left-0 mt-2 w-56 bg-white rounded-xl shadow-2xl py-1 z-50 border-t-4" style={{ borderColor: '#208756' }}>
                    <Link
                      to="/my-orders"
                      className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-green-50 transition-colors"
                      onClick={() => setOrdersDropdownOpen(false)}
                    >
                      <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#208756' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                      <span className="font-medium text-gray-900">My Orders</span>
                    </Link>
                    <Link
                      to="/seller-orders"
                      className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-green-50 transition-colors"
                      onClick={() => setOrdersDropdownOpen(false)}
                    >
                      <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#208756' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                      <span className="font-medium text-gray-900">Seller Orders</span>
                    </Link>
                  </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Desktop Right Side - Wallet, Cart, Account */}
          <div className="hidden md:block">
            <div className="ml-4 flex items-center space-x-3">
              {/* Wallet Connection with Dropdown */}
              {walletConnected ? (
                <div className="relative wallet-dropdown">
                  <button
                    onClick={() => setWalletDropdownOpen(!walletDropdownOpen)}
                    className="flex items-center px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                    style={{ background: 'linear-gradient(to right, #FF7F1C, #FF6B00)', color: 'white' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'linear-gradient(to right, #FF6B00, #E65C00)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'linear-gradient(to right, #FF7F1C, #FF6B00)'; }}
                  >
                    <div className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse"></div>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    {formatAddress(account)}
                    <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {/* Wallet Dropdown Menu */}
                  {walletDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl py-2 z-50 border-2 animate-fadeIn" style={{ borderColor: '#FF7F1C' }}>
                      <div className="px-4 py-2 border-b border-gray-200">
                        <p className="text-xs text-gray-500 font-medium">Connected Wallet</p>
                        <p className="text-xs text-gray-700 font-mono mt-1 break-all">{account}</p>
                      </div>
                      <button
                        onClick={handleDisconnectWallet}
                        className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 flex items-center transition-colors group"
                      >
                        <svg className="w-5 h-5 mr-2 group-hover:animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        <span className="font-semibold">Disconnect Wallet</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={handleConnectWallet}
                  disabled={isConnecting}
                  className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all duration-300 flex items-center space-x-2 shadow-lg hover:shadow-xl transform hover:scale-105 ${
                    isConnecting 
                      ? 'bg-gray-400 text-white cursor-not-allowed' 
                      : ''
                  }`}
                  style={!isConnecting ? { background: 'linear-gradient(to right, #FF7F1C, #FF6B00)', color: 'white' } : {}}
                  onMouseEnter={(e) => !isConnecting && (e.currentTarget.style.background = 'linear-gradient(to right, #FF6B00, #E65C00)')}
                  onMouseLeave={(e) => !isConnecting && (e.currentTarget.style.background = 'linear-gradient(to right, #FF7F1C, #FF6B00)')}
                >
                  <svg className={`w-5 h-5 ${isConnecting ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span>{isConnecting ? 'Connecting...' : 'Connect Wallet'}</span>
                </button>
              )}
              
              {/* Account Dropdown - Only show when logged in */}
              {isLoggedIn && profile && (
                <div className="relative user-dropdown">
                  <button
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className="flex items-center px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                    style={{ backgroundColor: 'white', color: '#208756' }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f0f9f7'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'white'; }}
                  >
                    {profile.profile_picture_url ? (
                      <img 
                        src={profile.profile_picture_url} 
                        alt="Profile" 
                        className="w-7 h-7 rounded-full mr-2 object-cover ring-2"
                        style={{ borderColor: accountBgColor }}
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full mr-2 flex items-center justify-center text-white text-xs font-black ring-2" style={{ backgroundColor: accountBgColor, borderColor: accountBgColor }}>
                        {profile.first_name?.[0]}{profile.last_name?.[0]}
                      </div>
                    )}
                    <span className="font-bold">{profile.first_name} {profile.last_name}</span>
                    <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {/* User Dropdown Menu */}
                  {userDropdownOpen && (
                      <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl py-2 z-50 border-2 animate-fadeIn" style={{ borderColor: '#208756' }}>
                        <div className="px-4 py-3 border-b border-gray-200" style={{ backgroundColor: '#f0f9f7' }}>
                          <p className="text-sm font-bold text-gray-900">{profile.first_name} {profile.last_name}</p>
                          <p className="text-xs text-gray-600">@{profile.username}</p>
                          <p className="text-xs font-medium mt-1" style={{ color: '#208756' }}>{profile.department}</p>
                        </div>
                        <Link
                          to="/profile"
                          onClick={() => setUserDropdownOpen(false)}
                          className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-green-50 flex items-center transition-colors group"
                        >
                          <svg className="w-5 h-5 mr-2 group-hover:animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#208756' }}>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <span className="font-semibold">Edit Profile</span>
                        </Link>
                        <button
                          onClick={() => {
                            setUserDropdownOpen(false);
                            handleLogout();
                          }}
                          className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 flex items-center transition-colors group"
                        >
                          <svg className="w-5 h-5 mr-2 group-hover:animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          <span className="font-semibold">Logout</span>
                        </button>
                      </div>
                    )}
                </div>
              )}

              {/* Cart Icon - Only for regular users */}
              {!profile?.is_admin && (
                <button
                  onClick={() => {
                    if (isLoggedIn) {
                      navigate('/cart');
                    } else {
                      showWarning(
                        'Login Required',
                        'Please log in to view your shopping cart.',
                        () => {
                          if (isLandingPage) {
                            setLoginModalOpen(true);
                          } else {
                            navigate('/');
                          }
                        }
                      );
                    }
                  }}
                  className="relative p-2 text-white hover:text-yellow-300 transition-colors group"
                  aria-label="Shopping cart"
                >
                  <div className="relative">
                    <svg 
                      className="h-6 w-6 group-hover:scale-110 transition-transform" 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" 
                      />
                    </svg>
                    
                    {/* Cart Count Badge */}
                    {cartItems && cartItems.length > 0 && (
                      <span 
                        className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center"
                        style={{ backgroundColor: '#ff9500' }}
                      >
                        {cartItems.length}
                      </span>
                    )}
                    
                    {/* Tooltip */}
                    <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                      {isLoggedIn ? 'My Cart' : 'Login to view cart'}
                    </span>
                  </div>
                </button>
              )}

              {/* Favorites Icon - Only for regular users */}
              {!profile?.is_admin && (
                <button
                  onClick={() => {
                    if (isLoggedIn) {
                      navigate('/favorites');
                    } else {
                      showWarning(
                        'Login Required',
                        'Please log in to view your favorites.',
                        () => {
                          if (isLandingPage) {
                            setLoginModalOpen(true);
                          } else {
                            navigate('/');
                          }
                        }
                      );
                    }
                  }}
                  className="relative p-2 text-white hover:text-yellow-300 transition-colors group"
                  aria-label="Favorites"
                >
                  <div className="relative">
                    <svg 
                      className="h-6 w-6 group-hover:scale-110 transition-transform" 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" 
                      />
                    </svg>
                    
                    {/* Tooltip */}
                    <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                      {isLoggedIn ? 'My Favorites' : 'Login to view favorites'}
                    </span>
                  </div>
                </button>
              )}

            </div>
          </div>

          {/* Mobile Menu Button - Always show */}
          <div className="md:hidden flex items-center space-x-2">
            {/* Cart Icon for Mobile - Only for regular users */}
            {!profile?.is_admin && (
            <button
              onClick={() => {
                if (isLoggedIn) {
                  navigate('/cart');
                } else {
                  showWarning(
                    'Login Required',
                    'Please log in to view your shopping cart.',
                    () => {
                      if (isLandingPage) {
                        setLoginModalOpen(true);
                      } else {
                        navigate('/');
                      }
                    }
                  );
                }
              }}
              className="relative p-2 text-white hover:text-yellow-300 transition-colors"
              aria-label="Shopping cart"
            >
              <div className="relative">
                <svg 
                  className="h-6 w-6" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" 
                  />
                </svg>
                
                {/* Cart Count Badge */}
                {cartItems && cartItems.length > 0 && (
                  <span 
                    className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center"
                    style={{ backgroundColor: '#ff9500' }}
                  >
                    {cartItems.length}
                  </span>
                )}
              </div>
            </button>
            )}
            {!profile?.is_admin && (
            <button
              onClick={() => {
                if (isLoggedIn) {
                  navigate('/favorites');
                } else {
                  showWarning(
                    'Login Required',
                    'Please log in to view your favorites.',
                    () => {
                      if (isLandingPage) {
                        setLoginModalOpen(true);
                      } else {
                        navigate('/');
                      }
                    }
                  );
                }
              }}
              className="relative p-2 text-white hover:text-yellow-300 transition-colors"
              aria-label="Favorites"
            >
              <svg 
                className="h-6 w-6" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
                strokeWidth={2}
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" 
                />
              </svg>
            </button>
            )}
            <button
              onClick={() => {
                if (isLoggedIn) {
                  navigate('/transaction-history');
                } else {
                  showWarning(
                    'Login Required',
                    'Please log in to view your transaction history.',
                    () => {
                      if (isLandingPage) {
                        setLoginModalOpen(true);
                      } else {
                        navigate('/');
                      }
                    }
                  );
                }
              }}
              className="relative p-2 text-white hover:text-yellow-300 transition-colors"
              aria-label="Transaction History"
            >
              <svg 
                className="h-6 w-6" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
                strokeWidth={2}
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" 
                />
              </svg>
            </button>

            {/* Notification Icon for Mobile - For all logged in users */}
            {isLoggedIn && (
              <div className="relative notifications-dropdown">
                <button
                  onClick={() => setNotificationsDropdownOpen(!notificationsDropdownOpen)}
                  className="relative flex items-center justify-center w-10 h-10 text-white hover:text-yellow-300 rounded-full hover:bg-white/10 transition-all duration-300"
                  title="Notifications"
                >
                  <Bell className="w-6 h-6" />
                  {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1 -translate-y-1 bg-red-600 rounded-full animate-pulse">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {/* Notifications Dropdown for Mobile */}
                {notificationsDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl py-0 z-50 border-2 border-blue-200 max-h-96 overflow-y-auto">
                    <div className="sticky top-0 bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
                      <h3 className="font-bold text-gray-900">Notifications</h3>
                      {notifications.length > 0 && (
                        <button
                          onClick={clearAllNotifications}
                          className="text-xs text-red-600 hover:text-red-700 font-semibold"
                        >
                          Clear All
                        </button>
                      )}
                    </div>

                    {notifications.length === 0 ? (
                      <div className="px-4 py-8 text-center text-gray-500">
                        <Bell className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                        <p className="text-sm">No notifications yet</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-100">
                        {notifications.map((notification: any) => (
                          <div
                            key={notification.notification_id}
                            onClick={() => markNotificationAsRead(notification.notification_id)}
                            className={`px-4 py-3 cursor-pointer transition-colors ${
                              notification.is_read
                                ? 'bg-white hover:bg-gray-50'
                                : 'bg-blue-50 hover:bg-blue-100'
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <p className={`text-sm font-semibold ${notification.is_read ? 'text-gray-800' : 'text-gray-900'}`}>
                                  {notification.title}
                                </p>
                                <p className={`text-xs mt-1 ${notification.is_read ? 'text-gray-600' : 'text-gray-700'}`}>
                                  {notification.message}
                                </p>
                              </div>
                              {!notification.is_read && (
                                <div className="w-2 h-2 bg-blue-600 rounded-full mt-1 ml-2 flex-shrink-0"></div>
                              )}
                            </div>
                            <div className="flex items-center justify-between mt-2">
                              <p className="text-xs text-gray-500">
                                {new Date(notification.created_at).toLocaleDateString()} {new Date(notification.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                              {notification.priority && (
                                <span className={`text-xs px-2 py-0.5 rounded-full ${
                                  notification.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                                  notification.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                                  notification.priority === 'normal' ? 'bg-blue-100 text-blue-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {notification.priority}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            
            <button 
              onClick={() => setMenuOpen(!menuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-xl text-white hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-inset transition-all duration-300 transform hover:scale-110"
              style={{ '--ring-color': '#FFCF50' } as React.CSSProperties}
              aria-expanded="false"
            >
                <span className="sr-only">Open main menu</span>
                <svg 
                  className={`${menuOpen ? 'hidden' : 'block'} h-7 w-7 drop-shadow-lg`} 
                  xmlns="http://www.w3.org/2000/svg" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                <svg 
                  className={`${menuOpen ? 'block' : 'hidden'} h-7 w-7 drop-shadow-lg`} 
                  xmlns="http://www.w3.org/2000/svg" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
        </div>

        {/* Mobile Menu - Show based on user role */}
        {menuOpen && (
          <div className="md:hidden bg-white/95 backdrop-blur-lg border-t-2" style={{ borderColor: '#42D674' }}>
            <div className="px-4 pt-4 pb-3 space-y-3">
              {/* Admin Mobile Links */}
              {isLoggedIn && profile?.is_admin && (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider px-3 mb-2">Admin Menu</p>
                  <Link 
                    to="/admin" 
                    className="flex items-center space-x-3 text-gray-700 px-3 py-3 rounded-lg text-base font-semibold transition-all"
                    onClick={() => setMenuOpen(false)}
                    onMouseEnter={(e) => { e.currentTarget.style.color = '#19693A'; e.currentTarget.style.backgroundColor = 'rgba(25, 105, 58, 0.1)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = '#374151'; e.currentTarget.style.backgroundColor = 'transparent'; }}
                  >
                    <svg className="w-5 h-5" style={{ color: '#19693A' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <span>Admin Dashboard</span>
                  </Link>
                  <Link 
                    to="/browse" 
                    className="flex items-center space-x-3 text-gray-700 px-3 py-3 rounded-lg text-base font-semibold transition-all"
                    onClick={() => setMenuOpen(false)}
                    onMouseEnter={(e) => { e.currentTarget.style.color = '#19693A'; e.currentTarget.style.backgroundColor = 'rgba(25, 105, 58, 0.1)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = '#374151'; e.currentTarget.style.backgroundColor = 'transparent'; }}
                  >
                    <svg className="w-5 h-5" style={{ color: '#19693A' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <span>Browse Products</span>
                  </Link>
                </div>
              )}
              
              {/* Regular User Mobile Links (only show when profile is loaded) */}
              {isLoggedIn && !profile?.is_admin && profile && (
                <>
                  {/* Main Navigation */}
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider px-3 mb-2">Main Menu</p>
                    <Link 
                      to="/browse" 
                      className="flex items-center space-x-3 text-gray-700 px-3 py-3 rounded-lg text-base font-semibold transition-all"
                      onClick={() => setMenuOpen(false)}
                      onMouseEnter={(e) => { e.currentTarget.style.color = '#19693A'; e.currentTarget.style.backgroundColor = 'rgba(25, 105, 58, 0.1)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = '#374151'; e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <span>Browse</span>
                    </Link>
                    <Link 
                      to="/dashboard" 
                      className="flex items-center space-x-3 text-gray-700 hover:text-blue-600 hover:bg-blue-50 px-3 py-3 rounded-lg text-base font-semibold transition-all"
                      onClick={() => setMenuOpen(false)}
                    >
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zM14 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1h-4a1 1 0 01-1-1v-3z" />
                      </svg>
                      <span>Dashboard</span>
                    </Link>
                    <Link 
                      to="/create-listing" 
                      className="flex items-center space-x-3 text-gray-900 px-3 py-3 rounded-lg text-base font-bold transition-all shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
                      style={{ background: 'linear-gradient(to right, #19693A, #FFCF50)' }}
                      onClick={() => setMenuOpen(false)}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      <span>Create Listing</span>
                    </Link>
                  </div>

                  {/* Orders Section */}
                  <div className="space-y-2 pt-3 border-t border-gray-200">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider px-3 mb-2">My Orders</p>
                    <Link 
                      to="/my-listings" 
                      className="flex items-center justify-between text-gray-700 hover:bg-green-50 px-3 py-3 rounded-lg text-base font-semibold transition-all group"
                      onClick={() => setMenuOpen(false)}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100">
                          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">My Listings</p>
                          <p className="text-xs text-gray-500">Items you're selling</p>
                        </div>
                      </div>
                      <svg className="w-5 h-5 text-gray-400 group-hover:text-green-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                    <Link 
                      to="/my-orders" 
                      className="flex items-center justify-between text-gray-700 hover:bg-green-50 px-3 py-3 rounded-lg text-base font-semibold transition-all group"
                      onClick={() => setMenuOpen(false)}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-100">
                          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">My Orders</p>
                          <p className="text-xs text-gray-500">Items you're buying</p>
                        </div>
                      </div>
                      <svg className="w-5 h-5 text-gray-400 group-hover:text-green-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                    <Link 
                      to="/seller-orders" 
                      className="flex items-center justify-between text-gray-700 hover:bg-green-50 px-3 py-3 rounded-lg text-base font-semibold transition-all group"
                      onClick={() => setMenuOpen(false)}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-purple-100">
                          <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">Buyer Orders</p>
                          <p className="text-xs text-gray-500">Buyer requests</p>
                        </div>
                      </div>
                      <svg className="w-5 h-5 text-gray-400 group-hover:text-green-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                </>
              )}
            </div>
            <div className="pt-4 pb-3 border-t-2 border-gray-200 bg-gray-50/50">
              {/* Mobile Wallet Connection */}
              <div className="px-2 space-y-1 mb-3">
                {walletConnected ? (
                  <div className="space-y-2">
                    <div className="flex items-center px-3 py-2 rounded-md text-sm" style={{ backgroundColor: 'rgba(52, 152, 219, 0.15)', color: '#2980b9' }}>
                      <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: '#3498db' }}></div>
                      <span className="font-medium">Wallet Connected</span>
                    </div>
                    <div className="text-xs text-gray-600 px-3">
                      {formatAddress(account)}
                    </div>
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        handleDisconnectWallet();
                      }}
                      className="w-full text-left text-red-600 hover:text-red-800 hover:bg-red-50 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                      Disconnect Wallet
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      handleConnectWallet();
                    }}
                    disabled={isConnecting}
                    className="w-full px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center space-x-2"
                    style={isConnecting ? { backgroundColor: '#9CA3AF', color: 'white', cursor: 'not-allowed' } : { background: 'linear-gradient(to right, #FF7F1C, #FF6B00)', color: 'white' }}
                    onMouseEnter={(e) => !isConnecting && (e.currentTarget.style.background = 'linear-gradient(to right, #FF6B00, #E65C00)')}
                    onMouseLeave={(e) => !isConnecting && (e.currentTarget.style.background = 'linear-gradient(to right, #FF7F1C, #FF6B00)')}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <span>{isConnecting ? 'Connecting...' : 'Connect Wallet'}</span>
                  </button>
                )}
              </div>
              
              {/* Mobile Auth Section */}
              <div className="px-2 space-y-1">
                {isLoggedIn && profile ? (
                  <div className="space-y-2">
                    {/* User Profile Info */}
                    <div className="flex items-center bg-blue-100 text-blue-800 px-3 py-2 rounded-md text-sm">
                      {profile.profile_picture_url ? (
                        <img 
                          src={profile.profile_picture_url} 
                          alt="Profile" 
                          className="w-8 h-8 rounded-full mr-2 object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-green-600 rounded-full mr-2 flex items-center justify-center text-white text-xs font-bold">
                          {profile.first_name?.[0]}{profile.last_name?.[0]}
                        </div>
                      )}
                      <span className="font-medium">{profile.first_name} {profile.last_name}</span>
                    </div>
                    <div className="text-xs text-gray-600 px-3">
                      {profile.username} • {profile.department}
                    </div>
                    
                    {/* Edit Profile Button */}
                    <Link
                      to="/profile"
                      onClick={() => setMenuOpen(false)}
                      className="w-full text-left text-gray-700 hover:text-blue-600 hover:bg-gray-50 px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Edit Profile
                    </Link>
                    
                    {/* Logout Button */}
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        handleLogout();
                      }}
                      className="w-full text-left text-red-600 hover:text-red-800 hover:bg-red-50 px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Logout
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <button 
                      onClick={() => {
                        setMenuOpen(false);
                        handleLoginClick();
                      }}
                      className="text-gray-700 hover:text-blue-600 hover:bg-gray-50 block px-3 py-2 rounded-md text-base font-medium transition-colors w-full text-left"
                    >
                      Login
                    </button>
                    <button 
                      onClick={() => {
                        setMenuOpen(false);
                        handleRegisterClick();
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white block px-3 py-2 rounded-md text-base font-medium transition-colors w-full text-left"
                    >
                      Register
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Login Modal - Only appears when on landing page */}
      {isLandingPage && loginModalOpen && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-screen overflow-y-auto border-t-4" style={{ borderColor: '#208756' }}>
            {/* Header with CSU Green */}
            <div className="px-6 py-6 border-b border-gray-200">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">Welcome Back!</h2>
                  <p className="text-gray-600 text-sm">Sign in to continue to CSU Marketplace</p>
                </div>
                <button
                  onClick={() => setLoginModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6">

              <form onSubmit={handleLoginSubmit} className="space-y-5">
                <div>
                  <label htmlFor="login-identifier" className="block text-sm font-bold text-gray-700 mb-2">
                    Username or Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="login-identifier"
                    name="identifier"
                    type="text"
                    required
                    value={loginForm.identifier}
                    onChange={(e) => setLoginForm(prev => ({ ...prev, identifier: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#208756] focus:border-transparent transition-all"
                    placeholder="Enter your username or email"
                  />
                </div>

                <div>
                  <label htmlFor="login-password" className="block text-sm font-bold text-gray-700 mb-2">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="login-password"
                    name="password"
                    type="password"
                    required
                    value={loginForm.password}
                    onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#208756] focus:border-transparent transition-all"
                    placeholder="Enter your password"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <input
                      id="login-remember-me"
                      name="rememberMe"
                      type="checkbox"
                      checked={loginForm.rememberMe}
                      onChange={(e) => setLoginForm(prev => ({ ...prev, rememberMe: e.target.checked }))}
                      className="h-4 w-4 border-gray-300 rounded"
                      style={{ accentColor: '#208756' }}
                    />
                    <label htmlFor="login-remember-me" className="ml-2 block text-sm text-gray-700">
                      Remember me
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setLoginModalOpen(false);
                      setForgotPasswordModalOpen(true);
                    }}
                    className="text-sm font-medium text-[#208756] hover:text-[#1a6d45] transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full font-bold py-3 px-4 rounded-xl transition-all duration-300 transform hover:scale-[1.02] shadow-lg hover:shadow-xl"
                  style={isSubmitting ? { backgroundColor: '#9CA3AF', color: 'white', cursor: 'not-allowed' } : { background: 'linear-gradient(to right, #19693A, #42D674)', color: 'white' }}
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Signing In...
                    </span>
                  ) : 'Sign In'}
                </button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                  Don't have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setLoginModalOpen(false);
                      setRegisterModalOpen(true);
                    }}
                    className="font-semibold text-[#208756] hover:text-[#1a6d45] transition-colors"
                  >
                    Sign up
                  </button>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Register Modal - Only appears when on landing page */}
      {isLandingPage && registerModalOpen && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-screen overflow-y-auto border-t-4" style={{ borderColor: '#208756' }}>
            {/* Header with CSU Green */}
            <div className="px-6 py-6 border-b border-gray-200">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">Join CSU Marketplace</h2>
                  <p className="text-gray-600 text-sm">Create your account and start trading</p>
                </div>
                <button
                  onClick={() => setRegisterModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6">

              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="register-firstName" className="block text-sm font-bold text-gray-700 mb-2">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="register-firstName"
                      name="firstName"
                      type="text"
                      required
                      maxLength={100}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#208756] focus:border-transparent transition-all"
                      placeholder="First name"
                    />
                  </div>

                  <div>
                    <label htmlFor="register-lastName" className="block text-sm font-bold text-gray-700 mb-2">
                      Last Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="register-lastName"
                      name="lastName"
                      type="text"
                      required
                      maxLength={100}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#208756] focus:border-transparent transition-all"
                      placeholder="Last name"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="register-email" className="block text-sm font-bold text-gray-700 mb-2">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="register-email"
                    name="email"
                    type="email"
                    required
                    maxLength={255}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#208756] focus:border-transparent transition-all"
                    placeholder="Enter your email address"
                  />
                </div>

                <div>
                  <label htmlFor="register-username" className="block text-sm font-bold text-gray-700 mb-2">
                    Username <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="register-username"
                    name="username"
                    type="text"
                    required
                    minLength={3}
                    maxLength={50}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#208756] focus:border-transparent transition-all"
                    placeholder="Enter Username"
                  />
                </div>

                <div>
                  <label htmlFor="register-idNumber" className="block text-sm font-bold text-gray-700 mb-2">
                    ID Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="register-idNumber"
                    name="idNumber"
                    type="text"
                    required
                    maxLength={9}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#208756] focus:border-transparent transition-all"
                    placeholder="2XXX-XXXXX"
                    onInput={(e) => {
                      const target = e.target as HTMLInputElement;
                      let value = target.value.replace(/[^0-9]/g, '');
                      if (value.length > 3) {
                        value = value.slice(0, 3) + '-' + value.slice(3, 8);
                      }
                      target.value = value;
                    }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="register-gender" className="block text-sm font-bold text-gray-700 mb-2">
                      Gender <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="register-gender"
                      name="gender"
                      required
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#208756] focus:border-transparent transition-all"
                    >
                      <option value="">Select gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="register-yearLevel" className="block text-sm font-bold text-gray-700 mb-2">
                      Year Level <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="register-yearLevel"
                      name="yearLevel"
                      required
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#208756] focus:border-transparent transition-all"
                    >
                      <option value="">Select year level</option>
                      <option value="1st Year">1st Year</option>
                      <option value="2nd Year">2nd Year</option>
                      <option value="3rd Year">3rd Year</option>
                      <option value="4th Year">4th Year</option>
                      <option value="5th Year">5th Year</option>  
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="register-phoneNumber" className="block text-sm font-bold text-gray-700 mb-2">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="register-phoneNumber"
                    name="phoneNumber"
                    type="text"
                    required
                    maxLength={20}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#208756] focus:border-transparent transition-all"
                    placeholder="09XXXXXXXXX"
                    onInput={(e) => {
                      const target = e.target as HTMLInputElement;
                      target.value = target.value.replace(/[^0-9]/g, '');
                    }}
                  />
                </div>

                <div>
                  <label htmlFor="register-department" className="block text-sm font-bold text-gray-700 mb-2">
                    Department <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="register-department"
                    name="department"
                    type="text"
                    required
                    maxLength={100}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#208756] focus:border-transparent transition-all"
                    placeholder="Enter your department"
                  />
                </div>

                {/* Wallet Address Display (if connected) */}
                {walletConnected && (
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      MetaMask Wallet Address
                    </label>
                    <div className="w-full px-4 py-2.5 bg-green-50 border border-green-300 rounded-lg text-sm text-green-800">
                      <div className="flex items-center">
                        <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                        <span className="font-mono">{account}</span>
                      </div>
                    </div>
                    <p className="text-xs text-green-600 mt-1">
                      This wallet address will be saved to your profile
                    </p>
                  </div>
                )}

                <div>
                  <label htmlFor="register-password" className="block text-sm font-bold text-gray-700 mb-2">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="register-password"
                    name="password"
                    type="password"
                    required
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#208756] focus:border-transparent transition-all"
                    placeholder="Create a password"
                  />
                </div>

                <div>
                  <label htmlFor="register-confirmPassword" className="block text-sm font-bold text-gray-700 mb-2">
                    Confirm Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="register-confirmPassword"
                    name="confirmPassword"
                    type="password"
                    required
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#208756] focus:border-transparent transition-all"
                    placeholder="Confirm your password"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    id="register-terms"
                    type="checkbox"
                    required
                    className="h-4 w-4 border-gray-300 rounded"
                    style={{ accentColor: '#208756' }}
                  />
                  <label htmlFor="register-terms" className="ml-2 block text-sm text-gray-700">
                    I agree to the{" "}
                    <button type="button" className="font-semibold text-[#208756] hover:text-[#1a6d45] transition-colors">
                      Terms of Service
                    </button>{" "}
                    and{" "}
                    <button type="button" className="font-semibold text-[#208756] hover:text-[#1a6d45] transition-colors">
                      Privacy Policy
                    </button>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full font-semibold py-2.5 px-4 rounded-lg transition-colors ${
                    isSubmitting 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-[#208756] hover:bg-[#1a6d45]'
                  } text-white`}
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating Account...
                    </span>
                  ) : 'Create Account'}
                </button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setRegisterModalOpen(false);
                      setLoginModalOpen(true);
                    }}
                    className="font-semibold text-[#208756] hover:text-[#1a6d45] transition-colors"
                  >
                    Sign in
                  </button>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Forgot Password Modal */}
      {isLandingPage && forgotPasswordModalOpen && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-screen overflow-y-auto border-t-4" style={{ borderColor: '#208756' }}>
            {/* Header with CSU Green */}
            <div className="px-6 py-6 border-b border-gray-200">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-1">Reset Password</h2>
                  <p className="text-gray-600 text-sm">Enter your email to receive a reset link</p>
                </div>
                <button
                  onClick={() => {
                    setForgotPasswordModalOpen(false);
                    setResetEmail('');
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start space-x-3">
                  <svg className="w-5 h-5 text-[#208756] mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-sm text-gray-700">
                    <p className="font-semibold mb-1">How it works:</p>
                    <ol className="list-decimal list-inside space-y-1 text-xs">
                      <li>Enter your registered email address</li>
                      <li>Check your inbox for the reset link</li>
                      <li>Click the link to set a new password</li>
                      <li>Sign in with your new password</li>
                    </ol>
                  </div>
                </div>
              </div>

              <form onSubmit={handleForgotPassword} className="space-y-5">
                <div>
                  <label htmlFor="reset-email" className="block text-sm font-bold text-gray-700 mb-2">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="reset-email"
                    name="email"
                    type="email"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#208756] focus:border-transparent transition-all"
                    placeholder="Enter your email address"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full font-semibold py-2.5 px-4 rounded-lg transition-colors ${
                    isSubmitting 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-[#208756] hover:bg-[#1a6d45]'
                  } text-white`}
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Sending Reset Link...
                    </span>
                  ) : 'Send Reset Link'}
                </button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                  Remember your password?{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setForgotPasswordModalOpen(false);
                      setResetEmail('');
                      setLoginModalOpen(true);
                    }}
                    className="font-semibold text-[#208756] hover:text-[#1a6d45] transition-colors"
                  >
                    Sign in
                  </button>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Alert Modal - Unified Green Theme */}
      {alertModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
            onClick={() => setAlertModalOpen(false)}
          />
          
          {/* Modal */}
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md transform transition-all animate-in fade-in zoom-in duration-200">
            {/* Close Button */}
            <button
              onClick={() => setAlertModalOpen(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="p-6">
              {/* Icon */}
              <div className="flex justify-center mb-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
                  <svg className="w-8 h-8 text-[#208756]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    {alertConfig.type === 'success' && (
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    )}
                    {alertConfig.type === 'error' && (
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    )}
                    {alertConfig.type === 'warning' && (
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.996-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    )}
                    {alertConfig.type === 'info' && (
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    )}
                  </svg>
                </div>
              </div>
              
              {/* Title */}
              <h3 className="text-xl font-bold text-gray-900 text-center mb-3">
                {alertConfig.title}
              </h3>

              {/* Message */}
              <p className="text-gray-600 text-center whitespace-pre-line leading-relaxed mb-6">
                {alertConfig.message}
              </p>
              
              {/* Action Button */}
              <button
                type="button"
                className="w-full py-2.5 px-4 rounded-lg text-white font-semibold bg-[#208756] hover:bg-[#1a6d45] transition-colors"
                onClick={() => {
                  if (alertConfig.onConfirm) {
                    alertConfig.onConfirm();
                  }
                  setAlertModalOpen(false);
                }}
              >
                {alertConfig.confirmText || 'OK'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Wallet Warning Modal - MetaMask Required */}
      {walletWarningModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop - Non-dismissible */}
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" />
          
          {/* Modal */}
          <div className="relative bg-white rounded-lg shadow-2xl w-full max-w-2xl transform transition-all animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
            {/* Header with Warning Icon */}
            <div className="bg-gradient-to-r from-red-500 to-orange-500 p-6 rounded-t-lg">
              <div className="flex items-center justify-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 animate-pulse">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.996-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-white">
                  MetaMask Wallet Required
                </h3>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Main Message */}
              <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded">
                <p className="text-gray-800 font-semibold mb-2">
                  ⚠️ You must connect your MetaMask wallet before {attemptedAction === 'login' ? 'signing in' : 'creating an account'}!
                </p>
                <p className="text-gray-600 text-sm">
                  CSU Marketplace uses blockchain technology for secure transactions. A connected wallet is required for all platform activities.
                </p>
              </div>

              {/* Setup Requirements */}
              <div className="space-y-4">
                <h4 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold">!</span>
                  Before You Continue - Required Steps:
                </h4>
                
                <div className="space-y-3">
                  {/* Step 1 */}
                  <div className="flex gap-3 items-start">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#208756] text-white text-sm font-bold flex-shrink-0">1</div>
                    <div>
                      <p className="font-semibold text-gray-900">Install MetaMask Browser Extension</p>
                      <p className="text-sm text-gray-600">Download from <a href="https://metamask.io" target="_blank" rel="noopener noreferrer" className="text-[#208756] hover:underline">metamask.io</a></p>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="flex gap-3 items-start">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#208756] text-white text-sm font-bold flex-shrink-0">2</div>
                    <div>
                      <p className="font-semibold text-gray-900">Add Sepolia Test Network</p>
                      <p className="text-sm text-gray-600">Configure MetaMask to use Ethereum Sepolia testnet</p>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="flex gap-3 items-start">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#208756] text-white text-sm font-bold flex-shrink-0">3</div>
                    <div>
                      <p className="font-semibold text-gray-900">Get Sepolia ETH from Faucet</p>
                      <p className="text-sm text-gray-600">Visit faucet website and request test ETH</p>
                      <p className="text-xs text-orange-600 font-semibold mt-1">⏱️ Wait at least 10 minutes for ETH to arrive</p>
                    </div>
                  </div>

                  {/* Step 4 */}
                  <div className="flex gap-3 items-start">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#208756] text-white text-sm font-bold flex-shrink-0">4</div>
                    <div>
                      <p className="font-semibold text-gray-900">Connect Wallet to CSU Marketplace</p>
                      <p className="text-sm text-gray-600">Click "Connect Wallet" button in the navbar</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Important Resources */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
                <h4 className="font-bold text-blue-900 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  Need Help? Read These Guides:
                </h4>
                <div className="space-y-1 text-sm">
                  <a 
                    href="/" 
                    onClick={(e) => {
                      e.preventDefault();
                      setWalletWarningModalOpen(false);
                      navigate('/');
                      setTimeout(() => {
                        document.getElementById('user-guide')?.scrollIntoView({ behavior: 'smooth' });
                      }, 100);
                    }}
                    className="block text-[#208756] hover:underline font-medium"
                  >
                    📖 Complete User Guide (Step-by-step MetaMask setup)
                  </a>
                  <a 
                    href="/" 
                    onClick={(e) => {
                      e.preventDefault();
                      setWalletWarningModalOpen(false);
                      navigate('/');
                      setTimeout(() => {
                        document.getElementById('safety-guidelines')?.scrollIntoView({ behavior: 'smooth' });
                      }, 100);
                    }}
                    className="block text-[#208756] hover:underline font-medium"
                  >
                    🛡️ Safety Guidelines (Protect yourself from scams)
                  </a>
                  <a 
                    href="/" 
                    onClick={(e) => {
                      e.preventDefault();
                      setWalletWarningModalOpen(false);
                      navigate('/');
                      setTimeout(() => {
                        document.getElementById('faqs')?.scrollIntoView({ behavior: 'smooth' });
                      }, 100);
                    }}
                    className="block text-[#208756] hover:underline font-medium"
                  >
                    ❓ Frequently Asked Questions
                  </a>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                {account ? (
                  <button
                    onClick={() => {
                      setWalletWarningModalOpen(false);
                      if (attemptedAction === 'login') {
                        setLoginModalOpen(true);
                      } else {
                        setRegisterModalOpen(true);
                      }
                      setAttemptedAction(null);
                    }}
                    className="flex-1 py-3 px-4 rounded-lg text-white font-semibold bg-[#208756] hover:bg-[#1a6d45] transition-all hover:scale-[1.02] shadow-md"
                  >
                    ✓ Wallet Connected - Continue
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setWalletWarningModalOpen(false);
                        navigate('/');
                        setTimeout(() => {
                          document.getElementById('user-guide')?.scrollIntoView({ behavior: 'smooth' });
                        }, 100);
                      }}
                      className="flex-1 py-3 px-4 rounded-lg text-gray-700 font-semibold bg-gray-100 hover:bg-gray-200 transition-colors border border-gray-300"
                    >
                      Read Setup Guide
                    </button>
                    <button
                      onClick={() => setWalletWarningModalOpen(false)}
                      className="flex-1 py-3 px-4 rounded-lg text-white font-semibold bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 transition-all hover:scale-[1.02] shadow-md"
                    >
                      Close
                    </button>
                  </>
                )}
              </div>

              {/* Current Wallet Status */}
              <div className="text-center text-sm">
                {account ? (
                  <p className="text-green-600 font-semibold flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Wallet Connected: {account.substring(0, 6)}...{account.substring(account.length - 4)}
                  </p>
                ) : (
                  <p className="text-orange-600 font-semibold flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    No Wallet Connected - Please connect MetaMask first
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};
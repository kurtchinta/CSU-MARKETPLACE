import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import type { ReactNode } from 'react';
import { authService, type UserProfile } from '../services/authService';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase.ts';

// Token refresh interval in milliseconds (14 minutes - before typical 15 min expiry)
const TOKEN_REFRESH_INTERVAL = 14 * 60 * 1000;

// In-memory profile cache (resets on page refresh - no localStorage needed)
let inMemoryProfileCache: { [userId: string]: UserProfile } = {};

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  isLoggedIn: boolean;
  loading: boolean;
  login: (emailOrUsername: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, profileData?: any) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<{ success: boolean; error?: string }>;
  token: string | null; // Expose token for direct API calls
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  // Always start with null - fetch from Supabase session directly
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Refs to prevent duplicate operations and manage token refresh
  const isFetchingProfile = useRef(false);
  const lastFetchedUserId = useRef<string | null>(null);
  const tokenRefreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasInitialized = useRef(false);
  const subscriptionRef = useRef<any>(null);

  // Proactively refresh token to prevent mid-request expirations
  const refreshAuthToken = async () => {
    if (!supabase) return;
    
    try {
      const { data: { session }, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.warn('⚠️ Auth: Token refresh failed:', error.message);
        return;
      }
      
      if (session?.access_token) {
        setToken(session.access_token);
        console.log('✅ Auth: Token proactively refreshed');
        
        // Reschedule next refresh
        scheduleTokenRefresh();
      }
    } catch (error) {
      console.error('❌ Auth: Exception during token refresh:', error);
    }
  };

  // Schedule token refresh
  const scheduleTokenRefresh = () => {
    // Clear existing timer to avoid duplicates
    if (tokenRefreshTimerRef.current) {
      clearTimeout(tokenRefreshTimerRef.current);
    }
    
    // Schedule new refresh
    tokenRefreshTimerRef.current = setTimeout(refreshAuthToken, TOKEN_REFRESH_INTERVAL);
  };

  // Fetch profile from Supabase (fast query, no cache)
  const fetchProfile = async (userId: string) => {
    if (isFetchingProfile.current || lastFetchedUserId.current === userId) {
      return;
    }

    isFetchingProfile.current = true;
    lastFetchedUserId.current = userId;

    try {
      // Check in-memory cache first
      if (inMemoryProfileCache[userId]) {
        console.log('✅ Auth: Profile loaded from in-memory cache');
        setProfile(inMemoryProfileCache[userId]);
        isFetchingProfile.current = false;
        return;
      }

      const userProfile = await authService.getUserProfile(userId);
      if (userProfile) {
        setProfile(userProfile);
        // Store in in-memory cache
        inMemoryProfileCache[userId] = userProfile;
        console.log('✅ Auth: Profile fetched and cached in memory', {
          username: userProfile.username,
          total_products: userProfile.total_products_posted,
          seller_rating: userProfile.average_seller_rating
        });
      }
    } catch (error) {
      console.error('❌ Auth: Failed to fetch profile:', error);
    } finally {
      isFetchingProfile.current = false;
    }
  };

  // Initialize auth state - runs once on mount
  useEffect(() => {
    let mounted = true;
    
    const initializeAuth = async () => {
      if (!mounted || hasInitialized.current) return;
      hasInitialized.current = true;
      
      try {
        console.log('🔐 Auth: Initializing auth state...');
        
        // Get current session directly from Supabase (instant, no network delay on first load)
        const { data: { session }, error } = await supabase?.auth.getSession() || { data: { session: null }, error: null };
        
        if (error) {
          console.error('❌ Auth: Session retrieval error:', error);
          if (mounted) setLoading(false);
          return;
        }
        
        if (session?.user && mounted) {
          setUser(session.user);
          setToken(session.access_token);
          setLoading(false); // SET FALSE IMMEDIATELY - user is loaded, auth state is determined!
          console.log('✅ Auth: Session restored, user:', session.user.email);
          
          // Schedule proactive token refresh
          scheduleTokenRefresh();
          
          // Fetch profile in background - this is now the only profile fetch!
          // We don't wait for it - UI renders immediately with user but without profile
          // Profile populates when fetch completes
          fetchProfile(session.user.id);
        } else {
          if (mounted) {
            setUser(null);
            setToken(null);
            setProfile(null);
            setLoading(false); // SET FALSE - no session means no user, auth state is determined!
          }
        }
      } catch (error) {
        console.error('❌ Auth: Initialization error:', error);
        if (mounted) setLoading(false); // SET FALSE even on error
      }
    };

    initializeAuth();

    // Listen for auth state changes - hook into Supabase auth events
    const { data: { subscription } } = authService.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      
      console.log('🔄 Auth: State changed -', event);
      
      if (event === 'INITIAL_SESSION') {
        // INITIAL_SESSION fires with initial session on mount
        console.log('✅ Auth: INITIAL_SESSION event - setting loading false');
        if (session?.user) {
          setUser(session.user);
          setToken(session.access_token);
          setLoading(false); // Critical: set false immediately!
          fetchProfile(session.user.id);
        } else {
          setLoading(false); // Critical: set false even if no session
        }
      } else if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user);
        setToken(session.access_token);
        setLoading(false); // Set false when user signs in
        console.log('✅ Auth: User signed in:', session.user.email);
        
        // Schedule token refresh
        scheduleTokenRefresh();
        
        // Fetch profile
        fetchProfile(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        console.log('🔴 Auth: User signed out');
        if (mounted) {
          setUser(null);
          setToken(null);
          setProfile(null);
          setLoading(false); // Set false on logout
          lastFetchedUserId.current = null;
          // Clear in-memory cache on logout
          inMemoryProfileCache = {};
        }
        // Cancel any pending token refresh
        if (tokenRefreshTimerRef.current) {
          clearTimeout(tokenRefreshTimerRef.current);
          tokenRefreshTimerRef.current = null;
        }
      } else if (event === 'TOKEN_REFRESHED' && session?.access_token) {
        console.log('✅ Auth: Token auto-refreshed by Supabase');
        setToken(session.access_token);
        // Re-schedule refresh after automatic refresh
        scheduleTokenRefresh();
      } else if (event === 'USER_UPDATED' && session?.user) {
        console.log('🔄 Auth: User data updated');
        setUser(session.user);
      }
    });

    // Store subscription reference for cleanup
    subscriptionRef.current = subscription;

    return () => {
      mounted = false;
      subscription?.unsubscribe();
      // Clean up token refresh timer on unmount
      if (tokenRefreshTimerRef.current) {
        clearTimeout(tokenRefreshTimerRef.current);
      }
    };
  }, []);

  const login = async (emailOrUsername: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true);
      console.log('🔐 Auth: Attempting login for:', emailOrUsername);
      
      const result = await authService.login(emailOrUsername, password);
      
      if (result.success && result.user) {
        setUser(result.user);
        console.log('✅ Auth: Login successful for:', emailOrUsername);
        
        // Fetch profile after login
        console.log('� Auth: Fetching user profile...');
        await fetchProfile(result.user.id);
        
        // Schedule token refresh
        scheduleTokenRefresh();
        
        return { success: true };
      }

      console.log('❌ Auth: Login failed for:', emailOrUsername);
      return { success: false, error: result.error };
    } catch (error: any) {
      console.error('❌ Auth: Login error:', error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, password: string, profileData?: any): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true);
      console.log('🔐 Auth: Attempting registration for:', email);
      
      const result = await authService.register(email, password, profileData);
      
      if (result.success && result.user) {
        console.log('✅ Auth: Registration successful for:', email);
        
        // Auto-login after successful registration
        setUser(result.user);
        
        // Fetch profile
        await fetchProfile(result.user.id);
        
        // Schedule token refresh
        scheduleTokenRefresh();
        
        console.log('✅ Auth: User registered and profile loaded');
        
        return { success: true };
      }

      return { success: false, error: result.error };
    } catch (error: any) {
      console.error('❌ Auth: Registration error:', error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const logout = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true);
      console.log('🔐 Auth: Attempting logout...');
      
      const result = await authService.logout();
      
      if (result.success) {
        setUser(null);
        setToken(null);
        setProfile(null);
        lastFetchedUserId.current = null;
        
        // Clear in-memory cache
        inMemoryProfileCache = {};
        
        console.log('✅ Auth: Logout successful - all session data cleared');
        
        // Cancel any pending token refresh
        if (tokenRefreshTimerRef.current) {
          clearTimeout(tokenRefreshTimerRef.current);
          tokenRefreshTimerRef.current = null;
        }
        
        return { success: true };
      }

      console.log('❌ Auth: Logout failed');
      return { success: false, error: result.error };
    } catch (error: any) {
      console.error('❌ Auth: Logout error:', error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const contextValue: AuthContextType = {
    user,
    profile,
    isLoggedIn: !!user,  // FIXED: Only check user, not profile (profile loads async)
    loading,
    login,
    register,
    logout,
    token,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthProvider;

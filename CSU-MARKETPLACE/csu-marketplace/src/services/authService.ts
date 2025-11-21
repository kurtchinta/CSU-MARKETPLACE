import { supabase } from '../lib/supabase.ts';
import { createClient } from '@supabase/supabase-js';

// Service role client - bypasses RLS for profile creation
const createServiceRoleClient = () => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const serviceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !serviceRoleKey) {
    console.warn('⚠️ Auth: Service role key not available, will use regular client');
    return null;
  }
  
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
};

// Database Schema - Complete User Profile Interface (matches FINALIZED-OPTIMIZED-SCHEMA.sql)
export interface UserProfile {
  // Primary Fields
  user_id: string;
  role_id: number;
  is_admin: boolean; // Generated column in DB
  wallet_address?: string | null;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  gender?: string | null;
  id_number: string;
  department?: string | null;
  phone_number?: string | null;
  year_level?: string | null;
  bio?: string | null;
  profile_picture_url?: string | null;
  
  // Status Fields
  is_active: boolean;
  is_verified: boolean;
  
  // Timestamps
  last_login_at?: string | null;
  last_active_at?: string | null;
  created_at: string;
  updated_at: string;
  
  // Analytics Fields (auto-updated by triggers)
  total_products_posted: number;
  total_products_sold: number;
  total_orders_as_buyer: number;
  total_orders_as_seller: number;
  total_revenue: number;
  average_seller_rating: number;
  total_reviews_received: number;
  
  // Computed fields for UI
  role_name?: string;
}

class AuthService {
  // Login with email OR username and password
  // Supports both: login('user@example.com', 'pass') and login('username', 'pass')
  async login(emailOrUsername: string, password: string): Promise<{ success: boolean; user?: any; error?: string }> {
    if (!supabase) {
      return { success: false, error: 'Supabase client not available' };
    }

    try {
      console.log('Auth: Starting login for:', emailOrUsername);

      let email = emailOrUsername;

      // Check if input is a username (doesn't contain @)
      if (!emailOrUsername.includes('@')) {
        console.log('Auth: Username detected, looking up email...');
        
        // Query database to get email from username
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('email')
          .eq('username', emailOrUsername)
          .single();

        if (userError || !userData) {
          console.error('Auth: Username not found:', emailOrUsername);
          return { success: false, error: 'Invalid username or password' };
        }

        email = userData.email;
        console.log('Auth: Email found for username:', emailOrUsername);
      }

      // Now login with email
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error('Auth: Login error:', error.message);
        return { success: false, error: 'Invalid email/username or password' };
      }

      if (!data.user) {
        return { success: false, error: 'No user data returned' };
      }

      // Update last_login_at and last_active_at timestamps
      await supabase
        .from('users')
        .update({ 
          last_login_at: new Date().toISOString(),
          last_active_at: new Date().toISOString()
        })
        .eq('user_id', data.user.id);

      console.log('Auth: Login successful for:', emailOrUsername);
      return { success: true, user: data.user };
    } catch (error: any) {
      console.error('Auth: Login failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Register with email, password, and full profile data
  async register(
    email: string, 
    password: string, 
    profileData?: {
      username: string;
      firstName: string;
      lastName: string;
      gender: string;
      idNumber: string;
      phoneNumber: string;
      department: string;
      yearLevel: string;
      walletAddress?: string | null;
    }
  ): Promise<{ success: boolean; user?: any; error?: string }> {
    if (!supabase) {
      return { success: false, error: 'Supabase client not available' };
    }

    try {
      console.log('Auth: Starting registration for:', email);

      // Step 1: Register user with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/confirm-email`,
          data: {
            username: profileData?.username,
            first_name: profileData?.firstName,
            last_name: profileData?.lastName,
            gender: profileData?.gender,
            id_number: profileData?.idNumber,
            phone_number: profileData?.phoneNumber,
            department: profileData?.department,
            year_level: profileData?.yearLevel,
            wallet_address: profileData?.walletAddress
          }
        }
      });

      if (authError) {
        console.error('Auth: Registration error:', authError.message);
        return { success: false, error: authError.message };
      }

      if (!authData.user) {
        return { success: false, error: 'No user data returned after registration' };
      }

      console.log('Auth: Auth user created successfully:', authData.user.id);

      // Step 2: Wait a moment for the database trigger to create the profile
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Step 3: Check if profile was created by trigger
      const { data: existingProfile } = await supabase
        .from('users')
        .select('user_id')
        .eq('user_id', authData.user.id)
        .single();

      if (existingProfile) {
        console.log('Auth: Profile created by database trigger');
        console.log('Auth: Registration successful for:', email);
        return { success: true, user: authData.user };
      }

      // Step 4: If trigger didn't create profile, create it manually
      console.log('Auth: Database trigger did not create profile, creating manually...');
      
      if (profileData) {
        const roleId = this.determineUserRole(email);
        
        console.log('Auth: Attempting manual profile creation with data:', {
          user_id: authData.user.id,
          email: email,
          username: profileData.username,
          first_name: profileData.firstName,
          last_name: profileData.lastName,
          role_id: roleId
        });
        
        // Normalize gender to match database constraint (case-sensitive)
        const normalizeGender = (value: string | null | undefined): string | null => {
          if (!value) return null;
          const lower = value.toLowerCase().trim();
          if (['male', 'm'].includes(lower)) return 'Male';
          if (['female', 'f'].includes(lower)) return 'Female';
          if (['other', 'o'].includes(lower)) return 'Other';
          return null; // Invalid value
        };

        // Profile data to insert
        const profilePayload = {
          user_id: authData.user.id,
          email: email,
          username: profileData.username,
          first_name: profileData.firstName,
          last_name: profileData.lastName,
          gender: normalizeGender(profileData.gender),
          id_number: profileData.idNumber,
          phone_number: profileData.phoneNumber,
          department: profileData.department,
          year_level: profileData.yearLevel,
          wallet_address: profileData.walletAddress,
          role_id: roleId,
          is_active: true,
          is_verified: false,
          last_active_at: new Date().toISOString()
          // Note: is_admin is GENERATED column based on role_id
          // Analytics fields have DEFAULT 0 in schema
        };
        
        // Try to use service role client first (bypasses RLS)
        let insertData: any = null;
        let profileError: any = null;
        
        const serviceRoleClient = createServiceRoleClient();
        if (serviceRoleClient) {
          console.log('Auth: Attempting profile creation with service role client (bypasses RLS)...');
          const { data, error } = await serviceRoleClient
            .from('users')
            .insert(profilePayload)
            .select()
            .single();
          
          if (!error) {
            insertData = data;
            console.log('✅ Auth: User profile created successfully with service role client');
          } else {
            profileError = error;
            console.log('Auth: Service role client failed, will retry with regular client...');
          }
        }
        
        // If service role client not available or failed, try regular client with retries
        if (!insertData && !serviceRoleClient) {
          console.log('Auth: Service role client not available, using regular client with retries...');
          
          for (let attempt = 1; attempt <= 3; attempt++) {
            console.log(`Auth: Profile insert attempt ${attempt}/3...`);
            
            const { data, error } = await supabase
              .from('users')
              .insert(profilePayload)
              .select()
              .single();

            if (!error) {
              insertData = data;
              console.log('✅ Auth: User profile created successfully on attempt', attempt);
              break;
            }
            
            profileError = error;
            
            if (attempt < 3) {
              const delayMs = Math.pow(2, attempt) * 500; // 1000ms, 2000ms
              console.log(`Auth: Attempt ${attempt} failed, retrying in ${delayMs}ms...`);
              await new Promise(resolve => setTimeout(resolve, delayMs));
            }
          }
        }

        if (!insertData || profileError) {
          console.error('❌ Auth: Profile creation failed');
          if (profileError) {
            console.error('❌ Error:', profileError.message);
            console.error('❌ Error code:', profileError.code);
            console.error('❌ Full error:', JSON.stringify(profileError, null, 2));
          }
          
          return { 
            success: false, 
            error: `Failed to create user profile: ${profileError?.message || 'Please try again or contact support.'}` 
          };
        }
        
        console.log('✅ Auth: User profile created successfully:', insertData);
      }

      console.log('Auth: Registration successful for:', email);
      return { success: true, user: authData.user };
    } catch (error: any) {
      console.error('Auth: Registration failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Logout
  async logout(): Promise<{ success: boolean; error?: string }> {
    if (!supabase) {
      return { success: false, error: 'Supabase client not available' };
    }

    try {
      const { error } = await supabase.auth.signOut();
      
      // Ignore "Auth session missing!" error as it means user is already logged out
      if (error && error.message !== 'Auth session missing!') {
        console.error('Auth: Logout error:', error.message);
        return { success: false, error: error.message };
      }

      console.log('Auth: Logout successful');
      return { success: true };
    } catch (error: any) {
      // Also handle session missing in catch block
      if (error.message === 'Auth session missing!') {
        console.log('Auth: Session already cleared');
        return { success: true };
      }
      console.error('Auth: Logout failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Get current session
  async getCurrentSession() {
    if (!supabase) return null;
    
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Auth: Session error:', error.message);
        return null;
      }
      return session;
    } catch (error: any) {
      console.error('Auth: Failed to get session:', error);
      return null;
    }
  }

  // Get user profile - simplified version
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    if (!supabase || !userId) {
      console.error('❌ Auth: Missing supabase client or userId');
      return null;
    }

    console.log('🔍 Auth: Loading profile for user:', userId);
    
    try {
      // Simple query - just get the user data directly
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (error) {
        console.error('❌ Auth: Database error:', error.message);
        console.log('⚠️ Auth: User not found, creating new profile...');
        return await this.createUserProfile(userId);
      }

      if (!data) {
        console.log('⚠️ Auth: No user data found, creating profile...');
        return await this.createUserProfile(userId);
      }

      // Map database result to UserProfile
      const profile: UserProfile = {
        user_id: data.user_id,
        role_id: data.role_id,
        is_admin: data.is_admin || data.role_id === 1, // Use generated column or compute
        wallet_address: data.wallet_address,
        username: data.username,
        email: data.email,
        first_name: data.first_name,
        last_name: data.last_name,
        gender: data.gender,
        id_number: data.id_number,
        department: data.department,
        phone_number: data.phone_number,
        year_level: data.year_level,
        bio: data.bio,
        profile_picture_url: data.profile_picture_url,
        is_active: data.is_active,
        is_verified: data.is_verified,
        last_login_at: data.last_login_at,
        last_active_at: data.last_active_at,
        created_at: data.created_at,
        updated_at: data.updated_at,
        // Analytics fields with defaults (auto-updated by database triggers)
        total_products_posted: data.total_products_posted || 0,
        total_products_sold: data.total_products_sold || 0,
        total_orders_as_buyer: data.total_orders_as_buyer || 0,
        total_orders_as_seller: data.total_orders_as_seller || 0,
        total_revenue: parseFloat(data.total_revenue) || 0,
        average_seller_rating: parseFloat(data.average_seller_rating) || 0,
        total_reviews_received: data.total_reviews_received || 0,
        // Computed role name
        role_name: data.role_id === 1 ? 'admin' : 'user'
      };

      console.log('✅ Auth: Profile loaded!', {
        username: profile.username,
        role_id: profile.role_id,
        is_admin: profile.is_admin,
        total_products_posted: profile.total_products_posted,
        average_seller_rating: profile.average_seller_rating
      });
      
      return profile;
    } catch (error: any) {
      console.error('❌ Auth: Profile loading failed:', error);
      return await this.createUserProfile(userId);
    }
  }

  // Create user profile - simplified to work immediately

  // Create user profile - insert into database if not exists
  private async createUserProfile(userId: string): Promise<UserProfile | null> {
    if (!supabase) {
      console.error('❌ Auth: Supabase not available for profile creation');
      return null;
    }

    try {
      console.log('🔧 Auth: Creating new user profile in database...');
      
      // Get current session to extract user information
      const session = await this.getCurrentSession();
      if (!session?.user) {
        console.error('❌ Auth: No session found for profile creation');
        return null;
      }

      const user = session.user;
      const email = user.email || 'unknown@example.com';
      const metadata = user.user_metadata || {};
      
      // Use metadata if available, otherwise generate defaults
      const username = metadata.username || this.generateUsername(email);
      const firstName = metadata.first_name || 'User';
      const lastName = metadata.last_name || 'Name';
      const idNumber = metadata.id_number || `TEMP-${userId.substring(0, 8)}`;
      
      // Determine role_id (1 = admin, 2 = user) based on email
      const roleId = this.determineUserRole(email);
      
      console.log('🔧 Auth: Inserting profile into database...', { email, username, roleId });

      // Insert into database (matches FINALIZED-OPTIMIZED-SCHEMA.sql)
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          user_id: userId,
          role_id: roleId,
          username: username,
          email: email,
          first_name: firstName,
          last_name: lastName,
          id_number: idNumber,
          gender: metadata.gender || null,
          department: metadata.department || null,
          phone_number: metadata.phone_number || null,
          year_level: metadata.year_level || null,
          wallet_address: metadata.wallet_address || null,
          is_active: true,
          is_verified: false,
          last_active_at: new Date().toISOString()
          // Note: Analytics fields (total_products_posted, etc.) have DEFAULT 0 in database schema
          // is_admin is a GENERATED column based on role_id
        });

      if (insertError) {
        console.error('❌ Auth: Failed to insert profile:', insertError.message);
        console.error('❌ Auth: Full error:', insertError);
        // Continue anyway - return in-memory profile
      } else {
        console.log('✅ Auth: Profile inserted into database successfully!');
      }
      
      // Return complete profile
      const profile: UserProfile = {
        user_id: userId,
        role_id: roleId,
        is_admin: roleId === 1,
        username: username,
        email: email,
        first_name: firstName,
        last_name: lastName,
        gender: metadata.gender || null,
        id_number: idNumber,
        department: metadata.department || null,
        phone_number: metadata.phone_number || null,
        year_level: metadata.year_level || null,
        bio: null,
        profile_picture_url: null,
        wallet_address: metadata.wallet_address || null,
        is_active: true,
        is_verified: false,
        last_login_at: new Date().toISOString(),
        last_active_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        // Analytics fields (database defaults to 0)
        total_products_posted: 0,
        total_products_sold: 0,
        total_orders_as_buyer: 0,
        total_orders_as_seller: 0,
        total_revenue: 0,
        average_seller_rating: 0,
        total_reviews_received: 0,
        role_name: roleId === 1 ? 'admin' : 'user'
      };

      console.log('✅ Auth: Profile created!', {
        email: profile.email,
        username: profile.username,
        role_name: profile.role_name,
        role_id: profile.role_id,
        is_admin: profile.is_admin
      });
      
      return profile;
    } catch (error: any) {
      console.error('Auth: Error creating user profile:', error);
      return null;
    }
  }

  // Determine user role based on email (1 = admin, 2 = user)
  private determineUserRole(_email: string): number {
    // ALWAYS return role_id 2 (regular user) for new registrations
    // Admins must be manually upgraded in the database by changing role_id to 1
    return 2; // user role_id (default for all new registrations)
  }

  // Generate unique username from email
  private generateUsername(email: string): string {
    const baseUsername = email.split('@')[0];
    const timestamp = Date.now().toString().slice(-4);
    return `${baseUsername}_${timestamp}`;
  }

  // Listen to auth state changes
  onAuthStateChange(callback: (event: string, session: any) => void) {
    if (!supabase) return { data: { subscription: null } };
    
    return supabase.auth.onAuthStateChange(callback);
  }
}

// Export singleton instance
export const authService = new AuthService();
export default authService;
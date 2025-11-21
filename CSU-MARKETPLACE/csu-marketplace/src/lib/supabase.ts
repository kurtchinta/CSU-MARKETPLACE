import { createClient } from '@supabase/supabase-js';

// Database enum types (matching our schema)
export type TransactionStatus = 'pending' | 'accepted' | 'rejected' | 'completed' | 'cancelled';
export type ProductStatus = 'pending' | 'approved' | 'rejected' | 'inactive';
export type ListingType = 'for_sale' | 'for_rent' | 'service';
export type PaymentMethod = 'gcash' | 'cash';

export interface PlatformStats {
  totalUsers: number;
  totalAdmins: number;
  totalListings: number;
  activeListings: number;
  totalTransactions: number;
  acceptedTransactions: number;
  rejectedTransactions: number;
  completedTransactions: number;
  cancelledTransactions: number;
}

export interface UserAccount {
  user_id: string;
  role_id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  gender?: string;
  id_number: string;
  department?: string;
  phone_number?: string;
  year_level?: string;
  profile_picture?: string | null;
  bio?: string | null;
  wallet_address?: string;
  is_admin?: boolean;
  is_active: boolean;
  is_verified: boolean;
  wallet_verified?: boolean;
  created_at: string;
  updated_at?: string;
  last_login_at?: string;
  last_active_at?: string;
  // V6 Analytics fields
  total_products_posted?: number;
  total_products_sold?: number;
  total_orders_as_buyer?: number;
  total_orders_as_seller?: number;
  total_revenue?: number;
  average_seller_rating?: number;
  total_reviews_received?: number;
  profile_views?: number;
}

export interface RecentTransaction {
  transaction_id: number;
  buyer_id: string;
  seller_id: string;
  product_id: number;
  quantity?: number;
  transaction_status: TransactionStatus;
  payment_method: PaymentMethod;
  total_amount: number;
  created_at: string;
  updated_at: string;
  // Joined data
  buyer?: {
    username: string;
    first_name: string;
    last_name: string;
  };
  seller?: {
    username: string;
    first_name: string;
    last_name: string;
  };
  product?: {
    product_name: string;
    price: number;
  };
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = supabaseUrl && supabaseAnonKey ? 
  createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      // CRITICAL: Use localStorage for session persistence across page refreshes
      // This ensures the user stays logged in when the page is refreshed
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  }) : null;

// Smart contract enum mappings (for blockchain integration)
export const TransactionStatusMapping = {
  // Database enum -> Smart contract enum index
  pending: 0,
  accepted: 1, 
  rejected: 2,
  completed: 3,
  cancelled: 4
} as const;

export const BlockchainToDbStatus = {
  // Smart contract enum index -> Database enum
  0: 'pending',
  1: 'accepted',
  2: 'rejected', 
  3: 'completed',
  4: 'cancelled'
} as const;

// Utility functions for blockchain integration
export const blockchainUtils = {
  // Get transactions ready for blockchain storage
  async getBlockchainReadyTransactions() {
    if (!supabase) return [];
    
    const { data, error } = await supabase
      .from('blockchain_ready_transactions')
      .select('*')
      .order('accepted_at', { ascending: true });
    
    if (error) {
      console.error('Error fetching blockchain ready transactions:', error);
      return [];
    }
    
    return data || [];
  },

  // Convert transaction status for smart contract
  getContractStatusIndex(dbStatus: TransactionStatus): number {
    return TransactionStatusMapping[dbStatus] ?? 0;
  },

  // Convert smart contract status to database status
  getDbStatusFromIndex(statusIndex: number): TransactionStatus {
    return BlockchainToDbStatus[statusIndex as keyof typeof BlockchainToDbStatus] ?? 'pending';
  }
};

export const adminService = {
  async getPlatformStats(): Promise<PlatformStats> {
    if (!supabase) {
      // Fallback mock data for development
      return {
        totalUsers: 0,
        totalAdmins: 0,
        totalListings: 0,
        activeListings: 0,
        totalTransactions: 0,
        acceptedTransactions: 0,
        rejectedTransactions: 0,
        completedTransactions: 0,
        cancelledTransactions: 0
      };
    }
    
    try {
      const results = await Promise.all([
        // Total users count
        supabase.from('users').select('*', { count: 'exact', head: true }),
        
        // Admin users count (role_id = 1)
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('role_id', 1),
        
        // Products count
        supabase.from('products').select('*', { count: 'exact', head: true }),        // Active listings (approved products)
        supabase.from('products').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
        
        // Transaction counts by status (using proper enum values)
        supabase.from('transactions').select('*', { count: 'exact', head: true }),
        supabase.from('transactions').select('*', { count: 'exact', head: true }).eq('transaction_status', 'accepted'),
        supabase.from('transactions').select('*', { count: 'exact', head: true }).eq('transaction_status', 'rejected'),
        supabase.from('transactions').select('*', { count: 'exact', head: true }).eq('transaction_status', 'completed'),
        supabase.from('transactions').select('*', { count: 'exact', head: true }).eq('transaction_status', 'cancelled')
      ]);

      return {
        totalUsers: results[0].count || 0,
        totalAdmins: results[1].count || 0,
        totalListings: results[2].count || 0,
        activeListings: results[3].count || 0,
        totalTransactions: results[4].count || 0,
        acceptedTransactions: results[5].count || 0,
        rejectedTransactions: results[6].count || 0,
        completedTransactions: results[7].count || 0,
        cancelledTransactions: results[8].count || 0
      };
    } catch (error) {
      console.error('Error getting platform stats:', error);
      return {
        totalUsers: 10,
        totalAdmins: 2,
        totalListings: 8,
        activeListings: 5,
        totalTransactions: 15,
        acceptedTransactions: 10,
        rejectedTransactions: 2,
        completedTransactions: 8,
        cancelledTransactions: 3
      };
    }
  },

  // Get recent transactions with user and product details
  async getRecentTransactions(limit: number = 10): Promise<RecentTransaction[]> {
    if (!supabase) return [];
    
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        buyer:users!transactions_buyer_id_fkey(username, first_name, last_name),
        seller:users!transactions_seller_id_fkey(username, first_name, last_name),
        product:products(product_name, price)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('Error fetching recent transactions:', error);
      return [];
    }
    
    return data || [];
  },

  async getAllTransactions(): Promise<RecentTransaction[]> {
    if (!supabase) return [];
    
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        buyer:users!transactions_buyer_id_fkey(username, first_name, last_name),
        seller:users!transactions_seller_id_fkey(username, first_name, last_name),
        product:products(product_name, price)
      `)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching all transactions:', error);
      return [];
    }
    
    return data || [];
  },

  async getAllUsers(): Promise<UserAccount[]> {
    if (!supabase) return [];
    
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching all users:', error);
      return [];
    }
    
    return data || [];
  },

  async promoteToAdmin(userId: string): Promise<{ success: boolean; error?: string }> {
    if (!supabase) return { success: false, error: 'Database not initialized' };
    
    try {
      const { error } = await supabase
        .from('users')
        .update({ role_id: 1 })
        .eq('user_id', userId);
      
      if (error) {
        return { success: false, error: error.message };
      }
      
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  async demoteFromAdmin(userId: string): Promise<{ success: boolean; error?: string }> {
    if (!supabase) return { success: false, error: 'Database not initialized' };
    
    try {
      const { error } = await supabase
        .from('users')
        .update({ role_id: 2 })
        .eq('user_id', userId);
      
      if (error) {
        return { success: false, error: error.message };
      }
      
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  async deleteUser(userId: string): Promise<{ success: boolean; error?: string }> {
    if (!supabase) return { success: false, error: 'Database not initialized' };
    
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('user_id', userId);
      
      if (error) {
        return { success: false, error: error.message };
      }
      
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  // Get detailed platform analytics
  async getDetailedAnalytics() {
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .from('platform_analytics')
        .select('*')
        .single();

      if (error) {
        console.error('Error fetching detailed analytics:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getDetailedAnalytics:', error);
      return null;
    }
  },

  // Get blockchain integration status
  async getBlockchainStatus() {
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .from('blockchain_integration_status')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') { // Ignore 'no rows' error
        console.error('Error fetching blockchain status:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getBlockchainStatus:', error);
      return null;
    }
  }
};

export default supabase;

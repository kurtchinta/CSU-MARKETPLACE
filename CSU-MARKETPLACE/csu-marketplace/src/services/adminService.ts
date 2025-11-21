/**
 * Admin Service - V6 Schema Aligned
 * Provides administrative functions for platform management
 */

import { supabase } from '../lib/supabase';

// ============= INTERFACES =============

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
  pendingProducts: number;
  approvedProducts: number;
  rejectedProducts: number;
  totalRevenue: number;
  averageProductPrice: number;
}

export interface UserAccount {
  user_id: string;
  role_id: number;
  is_admin: boolean;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  gender?: string | null;
  id_number: string;
  department?: string | null;
  phone_number?: string | null;
  year_level?: string | null;
  profile_picture?: string | null;
  bio?: string | null;
  wallet_address?: string | null;
  is_active: boolean;
  is_verified: boolean;
  wallet_verified: boolean;
  last_login_at?: string | null;
  created_at: string;
  updated_at: string;
  
  // V6 Analytics Fields
  total_products_posted: number;
  total_products_sold: number;
  total_orders_as_buyer: number;
  total_orders_as_seller: number;
  total_revenue: number;
  average_seller_rating: number;
  total_reviews_received: number;
  profile_views: number;
  last_active_at: string;
}

export interface RecentTransaction {
  transaction_id: number;
  order_id: number;
  product_id: number;
  buyer_id: string;
  seller_id: string;
  quantity: number;
  total_amount: number;
  payment_method: string;
  transaction_status: string;
  transaction_hash?: string | null;
  created_at: string;
  updated_at: string;
  
  // Relationships
  product?: {
    product_name: string;
    price: number;
  };
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
}

// ============= PLATFORM STATISTICS =============

export async function getPlatformStats(): Promise<PlatformStats> {
  try {
    console.log('Admin Service: Fetching platform statistics...');

    if (!supabase) {
      throw new Error('Supabase client not initialized');
    }

    // Fetch users count
    const { count: totalUsers, error: usersError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });
    
    if (usersError) throw usersError;

    // Fetch admins count (role_id = 1)
    const { count: totalAdmins, error: adminsError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role_id', 1);
    
    if (adminsError) throw adminsError;

    // Fetch products stats
    const { data: productsData, error: productsError } = await supabase
      .from('products')
      .select('status, price');
    
    if (productsError) throw productsError;

    const totalListings = productsData?.length || 0;
    const activeListings = productsData?.filter(p => p.status === 'approved').length || 0;
    const pendingProducts = productsData?.filter(p => p.status === 'pending').length || 0;
    const approvedProducts = productsData?.filter(p => p.status === 'approved').length || 0;
    const rejectedProducts = productsData?.filter(p => p.status === 'rejected').length || 0;

    // Calculate average product price
    const averageProductPrice = productsData && productsData.length > 0
      ? productsData.reduce((sum, p) => sum + (parseFloat(p.price) || 0), 0) / productsData.length
      : 0;

    // Fetch transactions stats
    const { data: transactionsData, error: transactionsError } = await supabase
      .from('transactions')
      .select('transaction_status, total_amount');
    
    if (transactionsError) throw transactionsError;

    const totalTransactions = transactionsData?.length || 0;
    const acceptedTransactions = transactionsData?.filter(t => t.transaction_status === 'accepted').length || 0;
    const rejectedTransactions = transactionsData?.filter(t => t.transaction_status === 'rejected').length || 0;
    const completedTransactions = transactionsData?.filter(t => t.transaction_status === 'completed').length || 0;
    const cancelledTransactions = transactionsData?.filter(t => t.transaction_status === 'cancelled').length || 0;

    // Calculate total revenue
    const totalRevenue = transactionsData
      ? transactionsData
          .filter(t => t.transaction_status === 'completed')
          .reduce((sum, t) => sum + (parseFloat(t.total_amount) || 0), 0)
      : 0;

    const stats: PlatformStats = {
      totalUsers: totalUsers || 0,
      totalAdmins: totalAdmins || 0,
      totalListings,
      activeListings,
      totalTransactions,
      acceptedTransactions,
      rejectedTransactions,
      completedTransactions,
      cancelledTransactions,
      pendingProducts,
      approvedProducts,
      rejectedProducts,
      totalRevenue,
      averageProductPrice
    };

    console.log('Admin Service: Platform stats loaded successfully', stats);
    return stats;
  } catch (error: any) {
    console.error('Admin Service: Error fetching platform stats:', error);
    throw new Error(error.message || 'Failed to fetch platform statistics');
  }
}

// ============= USER MANAGEMENT =============

export async function getAllUsers(): Promise<UserAccount[]> {
  try {
    console.log('Admin Service: Fetching all users...');
    
    if (!supabase) {
      throw new Error('Supabase client not initialized');
    }

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    console.log(`Admin Service: Loaded ${data?.length || 0} users`);
    return data || [];
  } catch (error: any) {
    console.error('Admin Service: Error fetching users:', error);
    throw new Error(error.message || 'Failed to fetch users');
  }
}

export async function promoteToAdmin(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`Admin Service: Promoting user ${userId} to admin...`);
    
    if (!supabase) {
      return { success: false, error: 'Supabase client not initialized' };
    }

    const { error } = await supabase
      .from('users')
      .update({ role_id: 1 })
      .eq('user_id', userId);

    if (error) throw error;

    console.log(`Admin Service: User ${userId} promoted to admin successfully`);
    return { success: true };
  } catch (error: any) {
    console.error('Admin Service: Error promoting user:', error);
    return { success: false, error: error.message || 'Failed to promote user' };
  }
}

export async function demoteFromAdmin(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`Admin Service: Demoting user ${userId} from admin...`);
    
    if (!supabase) {
      return { success: false, error: 'Supabase client not initialized' };
    }

    const { error } = await supabase
      .from('users')
      .update({ role_id: 2 })
      .eq('user_id', userId);

    if (error) throw error;

    console.log(`Admin Service: User ${userId} demoted from admin successfully`);
    return { success: true };
  } catch (error: any) {
    console.error('Admin Service: Error demoting user:', error);
    return { success: false, error: error.message || 'Failed to demote user' };
  }
}

export async function deleteUser(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`Admin Service: Deleting user ${userId}...`);
    
    if (!supabase) {
      return { success: false, error: 'Supabase client not initialized' };
    }

    // Delete user (cascade will handle related records)
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('user_id', userId);

    if (error) throw error;

    console.log(`Admin Service: User ${userId} deleted successfully`);
    return { success: true };
  } catch (error: any) {
    console.error('Admin Service: Error deleting user:', error);
    return { success: false, error: error.message || 'Failed to delete user' };
  }
}

// ============= TRANSACTION MANAGEMENT =============

export async function getRecentTransactions(limit: number = 20): Promise<RecentTransaction[]> {
  try {
    console.log(`Admin Service: Fetching ${limit} recent transactions...`);
    
    if (!supabase) {
      throw new Error('Supabase client not initialized');
    }

    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        product:products!transactions_product_id_fkey (
          product_name,
          price
        ),
        buyer:users!transactions_buyer_id_fkey (
          username,
          first_name,
          last_name
        ),
        seller:users!transactions_seller_id_fkey (
          username,
          first_name,
          last_name
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    console.log(`Admin Service: Loaded ${data?.length || 0} recent transactions`);
    return data || [];
  } catch (error: any) {
    console.error('Admin Service: Error fetching recent transactions:', error);
    throw new Error(error.message || 'Failed to fetch recent transactions');
  }
}

export async function getAllTransactions(): Promise<RecentTransaction[]> {
  try {
    console.log('Admin Service: Fetching all transactions...');
    
    if (!supabase) {
      throw new Error('Supabase client not initialized');
    }

    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        product:products!transactions_product_id_fkey (
          product_name,
          price
        ),
        buyer:users!transactions_buyer_id_fkey (
          username,
          first_name,
          last_name
        ),
        seller:users!transactions_seller_id_fkey (
          username,
          first_name,
          last_name
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    console.log(`Admin Service: Loaded ${data?.length || 0} transactions`);
    return data || [];
  } catch (error: any) {
    console.error('Admin Service: Error fetching all transactions:', error);
    throw new Error(error.message || 'Failed to fetch transactions');
  }
}

// ============= ANALYTICS =============

export async function getUserAnalytics(userId: string) {
  try {
    console.log(`Admin Service: Fetching analytics for user ${userId}...`);
    
    if (!supabase) {
      throw new Error('Supabase client not initialized');
    }

    const { data, error } = await supabase
      .from('users')
      .select(`
        total_products_posted,
        total_products_sold,
        total_orders_as_buyer,
        total_orders_as_seller,
        total_revenue,
        average_seller_rating,
        total_reviews_received,
        profile_views,
        last_active_at
      `)
      .eq('user_id', userId)
      .single();

    if (error) throw error;

    console.log('Admin Service: User analytics loaded', data);
    return data;
  } catch (error: any) {
    console.error('Admin Service: Error fetching user analytics:', error);
    throw new Error(error.message || 'Failed to fetch user analytics');
  }
}

export default {
  getPlatformStats,
  getAllUsers,
  promoteToAdmin,
  demoteFromAdmin,
  deleteUser,
  getRecentTransactions,
  getAllTransactions,
  getUserAnalytics
};

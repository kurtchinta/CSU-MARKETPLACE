import { supabase } from '../lib/supabase';
import { jsPDF } from 'jspdf';

// ═══════════════════════════════════════════════════════════════════════════════════
// TYPE DEFINITIONS & INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════════

export interface AdminStats {
  totalUsers: number;
  totalProducts: number;
  pendingProducts: number;
  approvedProducts: number;
  totalTransactions: number;
  totalRevenue: number;
}

export interface AdminActionResult {
  success: boolean;
  message?: string;
  error?: string;
}

// Admin View Types
export interface PlatformOverview {
  total_active_users: number;
  total_admins: number;
  new_users_30d: number;
  verified_users: number;
  total_products: number;
  approved_products: number;
  pending_products: number;
  active_listings: number;
  new_products_7d: number;
  total_transactions: number;
  completed_transactions: number;
  pending_transactions: number;
  transactions_24h: number;
  total_revenue: number;
  revenue_30d: number;
  revenue_7d: number;
  avg_transaction_value: number;
  total_favorites: number;
  total_reviews: number;
  platform_avg_rating: number;
  blockchain_pending: number;
  blockchain_confirmed: number;
  last_updated: string;
}

export interface RecentTransaction {
  transaction_id: string;
  blockchain_tx_hash: string | null;
  transaction_status: string;
  listing_type: string;
  item_name: string;
  item_price: number;
  quantity: number;
  total_amount: number;
  buyer_name: string;
  seller_name: string;
  category_name: string;
  created_at: string;
  hours_to_complete: number;
  buyer_username: string;
  seller_username: string;
  status_color: string;
}

export interface UserActivity {
  user_id: number;
  username: string;
  full_name: string;
  email: string;
  department: string;
  id_number: string;
  phone_number: string | null;
  is_admin: boolean;
  is_verified: boolean;
  total_products_posted: number;
  total_products_sold: number;
  total_orders_as_buyer: number;
  activity_status: string;
  days_since_active: number;
  last_active_at: string;
  member_since: string;
}

export interface PendingProduct {
  product_id: number;
  product_name: string;
  description: string;
  price: number;
  quantity: number;
  listing_type: string;
  status: string;
  created_at: string;
  hours_pending: number;
  user_id: string;
  username: string;
  seller_name: string;
  seller_email: string;
  seller_profile_picture: string | null;
  seller_rating: number;
  category_name: string;
  image_count: number;
  priority: string;
}

export interface RevenueData {
  date: string;
  revenue: number;
  transactions: number;
  avg_value: number;
}

export interface UserGrowthData {
  date: string;
  new_users: number;
  cumulative_users: number;
}

export interface CategoryPerformanceData {
  category_name: string;
  total_revenue: number;
  product_count: number;
  completed_transactions: number;
}

export interface TopSellerData {
  user_id: number;
  username: string;
  full_name: string;
  department: string;
  total_products_sold: number;
  total_revenue: number;
  average_seller_rating: number;
  total_reviews_received: number;
  active_listings: number;
  revenue_rank: number;
  sales_rank: number;
  rating_rank: number;
}

export interface TransactionStatusData {
  transaction_status: string;
  count: number;
  percentage: number;
}

export interface ProductTrendData {
  date: string;
  new_products: number;
  cumulative_products: number;
  approved_products: number;
  pending_products: number;
  rejected_products: number;
  for_sale: number;
  for_rent: number;
  services: number;
}

export interface DailyPlatformMetrics {
  metric_date: string;
  total_active_users: number;
  new_users_today: number;
  active_users_24h: number;
  active_listings: number;
  new_listings_today: number;
  pending_approvals: number;
  transactions_today: number;
  completed_today: number;
  revenue_today: number;
  total_product_views: number;
  new_favorites_today: number;
  new_reviews_today: number;
  last_refreshed: string;
}

export interface MonthlyCategoryPareto {
  category_id: number;
  category_name: string;
  month: string;
  transaction_count: number;
  monthly_revenue: number;
  revenue_percentage: number;
  cumulative_percentage: number;
  revenue_rank: number;
}

export const adminService = {
  // ═══════════════════════════════════════════════════════════════════════════════════
  // CORE ADMIN DATA FETCHING
  // ═══════════════════════════════════════════════════════════════════════════════════

  /**
   * Fetch Platform Overview - Admin KPI Cards
   * Source: admin_view_platform_overview
   * Contains: 23 platform metrics (users, products, transactions, revenue)
   */
  async getPlatformOverview(): Promise<PlatformOverview | null> {
    try {
      if (!supabase) {
        console.error('❌ Supabase client not initialized');
        return null;
      }
      const { data, error } = await supabase
        .from('admin_view_platform_overview')
        .select('*')
        .single();

      if (error) throw error;
      console.log('✅ Platform overview fetched successfully');
      return data;
    } catch (error: any) {
      console.error('❌ Error fetching platform overview:', error?.message || error);
      return null;
    }
  },

  /**
   * Fetch Recent Transactions - Admin Data Table
   * Source: admin_view_recent_transactions
   * Contains: Last 100 transactions with full details and status colors
   */
  async getRecentTransactions(limit: number = 20): Promise<RecentTransaction[]> {
    try {
      if (!supabase) {
        console.error('❌ Supabase client not initialized');
        return [];
      }

      console.log(`🔍 Fetching recent transactions (limit: ${limit}) from admin_view_recent_transactions...`);

      // Fetch from view - already joined with all necessary data
      // View includes ALL statuses: PENDING, ACCEPTED, REJECTED, COMPLETED, CANCELLED
      const { data: viewData, error: viewError } = await supabase
        .from('admin_view_recent_transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (viewError) {
        console.error('❌ Error fetching from view:', viewError?.message || viewError);
        return [];
      }

      if (!viewData || viewData.length === 0) {
        console.log('⚠️ No transactions found in view');
        return [];
      }

      console.log(`✅ Fetched ${viewData.length} transactions from view`);

      // Status color mapping
      const statusColorMap: { [key: string]: string } = {
        'pending': '#f59e0b',      // Amber
        'accepted': '#3b82f6',     // Blue
        'rejected': '#ef4444',     // Red
        'completed': '#10b981',    // Green
        'cancelled': '#6b7280'     // Gray
      };

      // Count transactions by status
      const statusCounts: { [key: string]: number } = {};
      viewData.forEach((row: any) => {
        const status = row.transaction_status || 'UNKNOWN';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });
      console.log('📊 Transaction status breakdown:', statusCounts);

      // Transform view data to match RecentTransaction interface
      const transformedData: RecentTransaction[] = viewData.map((row: any) => {
        const statusLower = (row.transaction_status || 'pending').toLowerCase();
        const statusColor = statusColorMap[statusLower] || '#6b7280';

        return {
          transaction_id: row.transaction_id,
          blockchain_tx_hash: row.blockchain_tx_hash || null,
          transaction_status: row.transaction_status || 'PENDING',
          listing_type: row.listing_type || 'UNKNOWN',
          item_name: row.item_name || 'Unknown Product',
          item_price: row.item_price || 0,
          quantity: row.quantity || 0,
          total_amount: row.total_amount || 0,
          buyer_name: row.buyer_name || 'Unknown',
          seller_name: row.seller_name || 'Unknown',
          category_name: row.category_name || 'Uncategorized',
          created_at: row.created_at,
          hours_to_complete: row.hours_to_complete || 0,
          buyer_username: row.buyer_username || 'Unknown',
          seller_username: row.seller_username || 'Unknown',
          status_color: statusColor
        };
      });

      console.log('✅ Recent transactions fully loaded:', transformedData.length, 'records');
      console.log('📊 Sample transaction:', transformedData[0]);
      return transformedData;
    } catch (error: any) {
      console.error('❌ Error fetching recent transactions:', error?.message || error);
      return [];
    }
  },

  /**
   * Fetch User Activity - Admin Data Table
   * Source: users table (direct)
   * Contains: User engagement, verification status, activity metrics
   */
  async getUserActivity(limit: number = 20): Promise<UserActivity[]> {
    try {
      if (!supabase) {
        console.error('❌ Supabase client not initialized');
        return [];
      }
      const { data, error } = await supabase
        .from('users')
        .select('user_id, username, id_number, phone_number, first_name, last_name, email, department, is_admin, is_verified, created_at, last_active_at')
        .order('last_active_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      // Transform data to match UserActivity interface
      const transformedData: UserActivity[] = (data || []).map((row: any) => {
        // Calculate days since active
        const lastActiveDate = row.last_active_at ? new Date(row.last_active_at) : new Date(row.created_at);
        const daysSinceActive = Math.floor((new Date().getTime() - lastActiveDate.getTime()) / (1000 * 60 * 60 * 24));

        // Determine activity status
        let activityStatus = 'Inactive';
        if (lastActiveDate >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) {
          activityStatus = 'Active';
        } else if (lastActiveDate >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) {
          activityStatus = 'Moderate';
        }

        return {
          user_id: row.user_id,
          username: row.username,
          full_name: `${row.first_name} ${row.last_name}`,
          email: row.email,
          department: row.department,
          id_number: row.id_number,
          phone_number: row.phone_number,
          is_admin: row.is_admin,
          is_verified: row.is_verified,
          total_products_posted: 0,
          total_products_sold: 0,
          total_orders_as_buyer: 0,
          activity_status: activityStatus,
          days_since_active: daysSinceActive,
          last_active_at: row.last_active_at,
          member_since: row.created_at
        };
      });

      console.log('✅ User activity fetched:', transformedData.length, 'records');
      console.log('📋 Sample user:', transformedData[0] ? { id_number: transformedData[0].id_number, phone_number: transformedData[0].phone_number, full_name: transformedData[0].full_name } : 'N/A');
      return transformedData;
    } catch (error: any) {
      console.error('❌ Error fetching user activity:', error?.message || error);
      return [];
    }
  },

  /**
   * Fetch Pending Products - Admin Approval Queue
   * Source: Direct query from products table with user JOIN
   * Contains: Products awaiting approval with seller profile picture & priority flags
   */
  async getPendingProducts(limit: number = 20): Promise<PendingProduct[]> {
    try {
      if (!supabase) {
        console.error('❌ Supabase client not initialized');
        return [];
      }

      // Query directly from products table with JOIN to users for profile picture
      const { data, error } = await supabase
        .from('products')
        .select(`
          product_id,
          product_name,
          description,
          price,
          quantity,
          listing_type,
          status,
          created_at,
          user_id,
          category_id,
          seller:users!products_user_id_fkey(
            user_id,
            username,
            first_name,
            last_name,
            email,
            profile_picture_url,
            average_seller_rating
          ),
          category:categories(category_name),
          images:product_images(image_id, storage_path, image_order)
        `)
        .eq('status', 'PENDING')
        .order('created_at', { ascending: true })
        .limit(limit);

      if (error) {
        console.error('❌ Error fetching pending products:', error);
        return [];
      }

      // Transform the data to match PendingProduct interface
      const transformedData = (data || []).map((product: any) => {
        const hoursPending = product.created_at 
          ? Math.round((Date.now() - new Date(product.created_at).getTime()) / (1000 * 60 * 60))
          : 0;
        
        const priority = 
          hoursPending >= 24 ? 'urgent' :
          hoursPending >= 12 ? 'high' :
          'normal';

        const imageCount = (product.images || []).length;

        return {
          product_id: product.product_id,
          product_name: product.product_name,
          description: product.description,
          price: product.price,
          quantity: product.quantity,
          listing_type: product.listing_type,
          status: product.status,
          created_at: product.created_at,
          hours_pending: hoursPending,
          user_id: product.user_id,
          username: product.seller?.username || '',
          seller_name: `${product.seller?.first_name || ''} ${product.seller?.last_name || ''}`.trim(),
          seller_email: product.seller?.email || '',
          seller_profile_picture: product.seller?.profile_picture_url || null,
          seller_rating: product.seller?.average_seller_rating || 0,
          category_name: product.category?.category_name || '',
          image_count: imageCount,
          priority: priority
        };
      });

      console.log('✅ Pending products fetched:', transformedData.length, 'records');
      return transformedData;
    } catch (error: any) {
      console.error('❌ Error fetching pending products:', error?.message || error);
      return [];
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════════════
  // ANALYTICS DATA FETCHING - CHARTS
  // ═══════════════════════════════════════════════════════════════════════════════════

  /**
   * Fetch Revenue Trend - Area/Line Chart
   * Source: analytics_view_revenue_trend
   * Contains: Daily revenue, transaction counts, average values
   */
  async getRevenueTrend(): Promise<RevenueData[]> {
    try {
      if (!supabase) {
        console.error('❌ Supabase client not initialized');
        return [];
      }
      const { data, error } = await supabase
        .from('analytics_view_revenue_trend')
        .select('*')
        .order('date', { ascending: true });

      if (error) throw error;
      console.log('✅ Revenue trend fetched:', data?.length || 0, 'records');
      return data || [];
    } catch (error: any) {
      console.error('❌ Error fetching revenue trend:', error?.message || error);
      return [];
    }
  },

  /**
   * Fetch User Growth - Area Chart
   * Source: analytics_view_user_growth
   * Contains: New users, cumulative users, verified users
   */
  async getUserGrowth(): Promise<UserGrowthData[]> {
    try {
      if (!supabase) {
        console.error('❌ Supabase client not initialized');
        return [];
      }
      const { data, error } = await supabase
        .from('analytics_view_user_growth')
        .select('*')
        .order('date', { ascending: true });

      if (error) throw error;
      console.log('✅ User growth fetched:', data?.length || 0, 'records');
      return data || [];
    } catch (error: any) {
      console.error('❌ Error fetching user growth:', error?.message || error);
      return [];
    }
  },

  /**
   * Fetch Category Performance - Bar Chart
   * Source: analytics_view_category_performance
   * Contains: Top categories by revenue, product count, transaction count
   */
  async getCategoryPerformance(limit: number = 10): Promise<CategoryPerformanceData[]> {
    try {
      if (!supabase) {
        console.error('❌ Supabase client not initialized');
        return [];
      }
      const { data, error } = await supabase
        .from('analytics_view_category_performance')
        .select('*')
        .order('total_revenue', { ascending: false })
        .limit(limit);

      if (error) throw error;
      console.log('✅ Category performance fetched:', data?.length || 0, 'records');
      return data || [];
    } catch (error: any) {
      console.error('❌ Error fetching category performance:', error?.message || error);
      return [];
    }
  },

  /**
   * Fetch Top Sellers - Bar Chart
   * Source: analytics_view_top_sellers
   * Contains: Top sellers by revenue with rankings and ratings
   */
  async getTopSellers(limit: number = 10): Promise<TopSellerData[]> {
    try {
      if (!supabase) {
        console.error('❌ Supabase client not initialized');
        return [];
      }
      const { data, error } = await supabase
        .from('analytics_view_top_sellers')
        .select('*')
        .order('total_revenue', { ascending: false })
        .limit(limit);

      if (error) throw error;
      console.log('✅ Top sellers fetched:', data?.length || 0, 'records');
      return data || [];
    } catch (error: any) {
      console.error('❌ Error fetching top sellers:', error?.message || error);
      return [];
    }
  },

  /**
   * Fetch Transaction Status Distribution - Donut/Pie Chart
   * Source: analytics_view_transaction_status
   * Contains: Status breakdown with counts and percentages
   */
  async getTransactionStatusDistribution(): Promise<TransactionStatusData[]> {
    try {
      if (!supabase) {
        console.error('❌ Supabase client not initialized');
        return [];
      }
      const { data, error } = await supabase
        .from('analytics_view_transaction_status')
        .select('*')
        .order('count', { ascending: false });

      if (error) throw error;
      console.log('✅ Transaction status distribution fetched:', data?.length || 0, 'records');
      return data || [];
    } catch (error: any) {
      console.error('❌ Error fetching transaction status distribution:', error?.message || error);
      return [];
    }
  },

  /**
   * Fetch Product Trend - Line Chart
   * Source: analytics_view_product_trend
   * Contains: Daily product creation trend by status and listing type (90 days)
   */
  async getProductTrend(): Promise<ProductTrendData[]> {
    try {
      if (!supabase) {
        console.error('❌ Supabase client not initialized');
        return [];
      }
      const { data, error } = await supabase
        .from('analytics_view_product_trend')
        .select('*')
        .order('date', { ascending: true });

      if (error) throw error;
      console.log('✅ Product trend fetched:', data?.length || 0, 'records');
      return data || [];
    } catch (error: any) {
      console.error('❌ Error fetching product trend:', error?.message || error);
      return [];
    }
  },

  /**
   * Fetch Daily Platform Metrics - KPI Dashboard
   * Source: mv_daily_platform_metrics
   * Contains: 13 key metrics for today (active users, listings, transactions, revenue, etc)
   */
  async getDailyPlatformMetrics(): Promise<DailyPlatformMetrics | null> {
    try {
      if (!supabase) {
        console.error('❌ Supabase client not initialized');
        return null;
      }
      const { data, error } = await supabase
        .from('mv_daily_platform_metrics')
        .select('*')
        .single();

      if (error) {
        console.error('❌ Error fetching daily metrics:', error?.message || error);
        return null;
      }
      console.log('✅ Daily platform metrics fetched successfully');
      return data as DailyPlatformMetrics;
    } catch (error: any) {
      console.error('❌ Error fetching daily metrics:', error?.message || error);
      return null;
    }
  },

  /**
   * Fetch Monthly Category Pareto - Pareto Analysis Chart
   * Source: mv_monthly_category_pareto
   * Contains: Category revenue distribution with cumulative percentages for 12 months
   */
  async getMonthlyCategoryPareto(): Promise<MonthlyCategoryPareto[]> {
    try {
      if (!supabase) {
        console.error('❌ Supabase client not initialized');
        return [];
      }
      const { data, error } = await supabase
        .from('mv_monthly_category_pareto')
        .select('*')
        .order('month', { ascending: false })
        .order('revenue_rank', { ascending: true });

      if (error) {
        console.error('❌ Error fetching category pareto:', error?.message || error);
        return [];
      }
      console.log('✅ Monthly category pareto fetched:', data?.length || 0, 'records');
      return data as MonthlyCategoryPareto[];
    } catch (error: any) {
      console.error('❌ Error fetching category pareto:', error?.message || error);
      return [];
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════════════
  // ADMIN STATISTICS & PLATFORM METRICS
  // ═══════════════════════════════════════════════════════════════════════════════════

  /**
   * Fetch Platform Statistics - Simplified KPI Summary
   * Aggregates top metrics for quick overview
   */
  async getPlatformStats(): Promise<AdminStats | null> {
    try {
      if (!supabase) {
        console.error('❌ Supabase client not initialized');
        return null;
      }

      const overview = await this.getPlatformOverview();
      if (!overview) return null;

      return {
        totalUsers: overview.total_active_users || 0,
        totalProducts: overview.total_products || 0,
        pendingProducts: overview.pending_products || 0,
        approvedProducts: overview.approved_products || 0,
        totalTransactions: overview.total_transactions || 0,
        totalRevenue: overview.total_revenue || 0
      };
    } catch (error: any) {
      console.error('❌ Error getting platform stats:', error?.message || error);
      return null;
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════════════
  // USER MANAGEMENT FUNCTIONS
  // ═══════════════════════════════════════════════════════════════════════════════════

  /**
   * Get All Users - Admin User Management
   */
  async getAllUsers() {
    try {
      if (!supabase) {
        console.error('❌ Supabase client not initialized');
        return [];
      }

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      console.log('✅ All users fetched:', data?.length || 0, 'records');
      return data || [];
    } catch (error: any) {
      console.error('❌ Error getting all users:', error?.message || error);
      return [];
    }
  },

  /**
   * Get Specific User Analytics
   */
  async getUserAnalytics(userId: string) {
    try {
      if (!supabase) {
        console.error('❌ Supabase client not initialized');
        return null;
      }

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      console.log('✅ User analytics fetched for:', userId);
      return data;
    } catch (error: any) {
      console.error('❌ Error getting user analytics:', error?.message || error);
      return null;
    }
  },

  /**
   * Get Recent Transactions (Alternative)
   */
  async getAllTransactions() {
    try {
      if (!supabase) {
        console.error('❌ Supabase client not initialized');
        return [];
      }

      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      console.log('✅ All transactions fetched:', data?.length || 0, 'records');
      return data || [];
    } catch (error: any) {
      console.error('❌ Error getting all transactions:', error?.message || error);
      return [];
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════════════
  // ADMIN ACTION FUNCTIONS - PRODUCT MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════════════

  /**
   * Approve Pending Product
   */
  async approveProduct(productId: number): Promise<AdminActionResult> {
    try {
      if (!supabase) {
        console.error('❌ Supabase client not initialized');
        return { success: false, error: 'Supabase not initialized' };
      }

      const { error } = await supabase
        .from('products')
        .update({ status: 'APPROVED' })
        .eq('product_id', productId);

      if (error) throw error;
      console.log('✅ Product approved successfully:', productId);
      return { success: true, message: 'Product approved successfully' };
    } catch (error: any) {
      console.error('❌ Error approving product:', error?.message || error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Reject Pending Product
   */
  async rejectProduct(productId: number, reason?: string): Promise<AdminActionResult> {
    try {
      if (!supabase) {
        console.error('❌ Supabase client not initialized');
        return { success: false, error: 'Supabase not initialized' };
      }

      const { error } = await supabase
        .from('products')
        .update({
          status: 'REJECTED',
          rejection_reason: reason || 'Rejected by admin'
        })
        .eq('product_id', productId);

      if (error) throw error;
      console.log('✅ Product rejected successfully:', productId);
      return { success: true, message: 'Product rejected successfully' };
    } catch (error: any) {
      console.error('❌ Error rejecting product:', error?.message || error);
      return { success: false, error: error.message };
    }
  },

  // ═══════════════════════════════════════════════════════════════════════════════════
  // ADMIN ACTION FUNCTIONS - USER MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════════════

  /**
   * Promote User to Admin
   */
  async promoteToAdmin(userId: string) {
    try {
      if (!supabase) {
        console.error('❌ Supabase client not initialized');
        return { success: false, error: 'Supabase not initialized' };
      }

      const { error } = await supabase
        .from('users')
        .update({ is_admin: true })
        .eq('user_id', userId);

      if (error) throw error;
      console.log('✅ User promoted to admin:', userId);
      return { success: true, message: 'User promoted to admin successfully' };
    } catch (error: any) {
      console.error('❌ Error promoting user:', error?.message || error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Demote Admin to User
   */
  async demoteFromAdmin(userId: string) {
    try {
      if (!supabase) {
        console.error('❌ Supabase client not initialized');
        return { success: false, error: 'Supabase not initialized' };
      }

      const { error } = await supabase
        .from('users')
        .update({ is_admin: false })
        .eq('user_id', userId);

      if (error) throw error;
      console.log('✅ Admin demoted to user:', userId);
      return { success: true, message: 'Admin demoted successfully' };
    } catch (error: any) {
      console.error('❌ Error demoting admin:', error?.message || error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Suspend User Account
   */
  async suspendUser(userId: string, reason?: string): Promise<AdminActionResult> {
    try {
      if (!supabase) {
        console.error('❌ Supabase client not initialized');
        return { success: false, error: 'Supabase not initialized' };
      }

      const { error } = await supabase
        .from('users')
        .update({
          is_active: false,
          suspension_reason: reason || 'Suspended by admin'
        })
        .eq('user_id', userId);

      if (error) throw error;
      console.log('✅ User suspended:', userId);
      return { success: true, message: 'User suspended successfully' };
    } catch (error: any) {
      console.error('❌ Error suspending user:', error?.message || error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Unsuspend User Account
   */
  async unsuspendUser(userId: string): Promise<AdminActionResult> {
    try {
      if (!supabase) {
        console.error('❌ Supabase client not initialized');
        return { success: false, error: 'Supabase not initialized' };
      }

      const { error } = await supabase
        .from('users')
        .update({
          is_active: true,
          suspension_reason: null
        })
        .eq('user_id', userId);

      if (error) throw error;
      console.log('✅ User unsuspended:', userId);
      return { success: true, message: 'User unsuspended successfully' };
    } catch (error: any) {
      console.error('❌ Error unsuspending user:', error?.message || error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Verify User Account
   */
  async verifyUser(userId: string): Promise<AdminActionResult> {
    try {
      if (!supabase) {
        console.error('❌ Supabase client not initialized');
        return { success: false, error: 'Supabase not initialized' };
      }

      const { error } = await supabase
        .from('users')
        .update({
          is_verified: true,
          verified_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) throw error;
      console.log('✅ User verified:', userId);
      return { success: true, message: 'User verified successfully' };
    } catch (error: any) {
      console.error('❌ Error verifying user:', error?.message || error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get Total Products Sold - Sum of all quantities in completed transactions across all sellers
   * Fetches from transactions table where transaction_status is 'COMPLETED'
   */
  async getTotalProductsSold(): Promise<number> {
    try {
      if (!supabase) {
        console.error('❌ Supabase client not initialized');
        return 0;
      }

      const { data, error } = await supabase
        .from('transactions')
        .select('quantity', { count: 'exact' })
        .eq('transaction_status', 'COMPLETED');

      if (error) throw error;
      
      // Sum all quantities from completed transactions
      const totalSold = data?.reduce((sum, transaction) => sum + (transaction.quantity || 0), 0) || 0;
      console.log('✅ Total products sold fetched:', totalSold);
      return totalSold;
    } catch (error: any) {
      console.error('❌ Error fetching total products sold:', error?.message || error);
      return 0;
    }
  },

  /**
   * Get Blockchain Pending Count - Count transactions where is_blockchain_pending = TRUE
   * Queries the transactions table directly for accurate pending blockchain records
   */
  async getBlockchainPendingCount(): Promise<number> {
    try {
      if (!supabase) {
        console.error('❌ Supabase client not initialized');
        return 0;
      }

      const { count, error } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('is_blockchain_pending', true);

      if (error) throw error;
      
      console.log('✅ Blockchain pending count fetched:', count || 0);
      return count || 0;
    } catch (error: any) {
      console.error('❌ Error fetching blockchain pending count:', error?.message || error);
      return 0;
    }
  },

  /**
   * Get Blockchain Confirmed Count - Count transactions where blockchain_confirmed_at IS NOT NULL
   * Queries the transactions table directly for accurate confirmed blockchain records
   */
  async getBlockchainConfirmedCount(): Promise<number> {
    try {
      if (!supabase) {
        console.error('❌ Supabase client not initialized');
        return 0;
      }

      const { count, error } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .not('blockchain_confirmed_at', 'is', null);

      if (error) throw error;
      
      console.log('✅ Blockchain confirmed count fetched:', count || 0);
      return count || 0;
    } catch (error: any) {
      console.error('❌ Error fetching blockchain confirmed count:', error?.message || error);
      return 0;
    }
  },

  /**
   * Get Total Pending Transactions - Count transactions where transaction_status = 'PENDING'
   */
  async getTotalPendingTransactions(): Promise<number> {
    try {
      if (!supabase) {
        console.error('❌ Supabase client not initialized');
        return 0;
      }

      const { count, error } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('transaction_status', 'PENDING');

      if (error) throw error;
      
      console.log('✅ Total pending transactions fetched:', count || 0);
      return count || 0;
    } catch (error: any) {
      console.error('❌ Error fetching pending transactions:', error?.message || error);
      return 0;
    }
  },

  /**
   * Get Total Accepted Transactions - Count transactions where transaction_status = 'ACCEPTED'
   */
  async getTotalAcceptedTransactions(): Promise<number> {
    try {
      if (!supabase) {
        console.error('❌ Supabase client not initialized');
        return 0;
      }

      const { count, error } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('transaction_status', 'ACCEPTED');

      if (error) throw error;
      
      console.log('✅ Total accepted transactions fetched:', count || 0);
      return count || 0;
    } catch (error: any) {
      console.error('❌ Error fetching accepted transactions:', error?.message || error);
      return 0;
    }
  },

  /**
   * Promote User to Admin
   * Only existing admins can promote other users
   * Once promoted, fellow admins cannot demote them
   */
  async promoteUserToAdmin(userId: number, targetUserId: number): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      if (!supabase) {
        return { success: false, error: 'Supabase client not initialized' };
      }

      // Check if the current user is an admin
      const { data: currentUser, error: currentUserError } = await supabase
        .from('users')
        .select('is_admin')
        .eq('user_id', userId)
        .single();

      if (currentUserError || !currentUser?.is_admin) {
        return { success: false, error: 'Only admins can promote users' };
      }

      // Check if target user exists
      const { data: targetUser, error: targetUserError } = await supabase
        .from('users')
        .select('is_admin')
        .eq('user_id', targetUserId)
        .single();

      if (targetUserError || !targetUser) {
        return { success: false, error: 'Target user not found' };
      }

      // If target is already admin, skip
      if (targetUser.is_admin) {
        return { success: false, error: 'User is already an admin' };
      }

      // Promote the user
      const { error: updateError } = await supabase
        .from('users')
        .update({ is_admin: true })
        .eq('user_id', targetUserId);

      if (updateError) {
        return { success: false, error: updateError.message };
      }

      console.log(`✅ User ${targetUserId} promoted to admin by user ${userId}`);
      return { success: true, message: `User promoted to admin successfully` };
    } catch (error: any) {
      console.error('❌ Error promoting user to admin:', error?.message || error);
      return { success: false, error: error?.message || 'Unknown error' };
    }
  },

  /**
   * Delete User
   * Only admins can delete users
   * Cannot delete yourself
   * Deletes all user-related data (products, orders, etc.)
   */
  async deleteUser(currentUserId: number, targetUserId: number): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      if (!supabase) {
        return { success: false, error: 'Supabase client not initialized' };
      }

      // Check if current user is an admin
      const { data: currentUser, error: currentUserError } = await supabase
        .from('users')
        .select('is_admin')
        .eq('user_id', currentUserId)
        .single();

      if (currentUserError || !currentUser?.is_admin) {
        return { success: false, error: 'Only admins can delete users' };
      }

      // Cannot delete yourself
      if (currentUserId === targetUserId) {
        return { success: false, error: 'You cannot delete your own account' };
      }

      // Check if target user exists
      const { data: targetUser, error: targetUserError } = await supabase
        .from('users')
        .select('user_id, username')
        .eq('user_id', targetUserId)
        .single();

      if (targetUserError || !targetUser) {
        return { success: false, error: 'Target user not found' };
      }

      // Delete user (cascade delete handled by database)
      const { error: deleteError } = await supabase
        .from('users')
        .delete()
        .eq('user_id', targetUserId);

      if (deleteError) {
        return { success: false, error: deleteError.message };
      }

      console.log(`✅ User ${targetUserId} (${targetUser.username}) deleted by admin ${currentUserId}`);
      return { success: true, message: `User ${targetUser.username} deleted successfully` };
    } catch (error: any) {
      console.error('❌ Error deleting user:', error?.message || error);
      return { success: false, error: error?.message || 'Unknown error' };
    }
  },

  /**
   * Refresh Materialized Views
   * Manually trigger refresh for all materialized views
   * Used by admin dashboard to get latest data
   */
  async refreshMaterializedViews(): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      if (!supabase) {
        return { success: false, error: 'Supabase client not initialized' };
      }

      console.log('🔄 Refreshing materialized views...');

      // Refresh mv_daily_platform_metrics
      const { error: dailyError } = await supabase.rpc('refresh_mv_daily_platform_metrics');
      if (dailyError) {
        console.warn('⚠️ Error refreshing mv_daily_platform_metrics:', dailyError.message);
        // Continue with other views even if one fails
      } else {
        console.log('✅ mv_daily_platform_metrics refreshed');
      }

      // Refresh mv_monthly_category_pareto
      const { error: paretoError } = await supabase.rpc('refresh_mv_monthly_category_pareto');
      if (paretoError) {
        console.warn('⚠️ Error refreshing mv_monthly_category_pareto:', paretoError.message);
      } else {
        console.log('✅ mv_monthly_category_pareto refreshed');
      }

      console.log('✅ Materialized views refresh completed');
      return { success: true, message: 'Materialized views refreshed successfully' };
    } catch (error: any) {
      console.error('❌ Error refreshing materialized views:', error?.message || error);
      return { success: false, error: error?.message || 'Unknown error' };
    }
  },

  /**
   * Generate Admin Report PDF
   * Creates comprehensive PDF with all admin dashboard data
   * Includes: Overview, Products, Transactions, Users, Charts data
   */
  async generateAdminReportPDF(
    overview: any,
    transactions: any[],
    userActivity: any[],
    pendingProducts: any[],
    categoryData: any[],
    transactionStatusData: any[]
  ): Promise<Blob | null> {
    try {
      // Using jsPDF for PDF generation
      const doc = new jsPDF();
      let yPosition = 20;

      // Green color scheme
      const primaryGreen = [32, 135, 86]; // #208756
      const lightGreen = [232, 244, 240]; // #e8f4f0
      const darkGreen = [26, 109, 69]; // #1a6d45

      // Add green header background
      doc.setFillColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
      doc.rect(0, 0, 210, 50, 'F');

      // Add CSU Logo (if available)
      try {
        const logoUrl = '/Caraga_State_University1.png';
        doc.addImage(logoUrl, 'PNG', 15, 8, 20, 20);
      } catch (logoError) {
        console.warn('Logo not available, continuing without logo');
      }

      // Title and subtitle in white text
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.text('CSU Marketplace', 45, 18);
      doc.setFontSize(11);
      doc.text('Admin Report', 45, 28);

      // Reset text color
      doc.setTextColor(0, 0, 0);
      
      yPosition = 58;

      // Date with green accent
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const reportDate = new Date().toLocaleString('en-PH');
      doc.setTextColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
      doc.setFont('helvetica', 'bold');
      doc.text('Generated:', 20, yPosition);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      doc.text(reportDate, 50, yPosition);
      yPosition += 15;

      // Platform Overview Section
      doc.setFillColor(lightGreen[0], lightGreen[1], lightGreen[2]);
      doc.rect(15, yPosition - 5, 180, 7, 'F');
      doc.setTextColor(darkGreen[0], darkGreen[1], darkGreen[2]);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('Platform Overview', 20, yPosition);
      yPosition += 10;

      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      const overviewData = [
        [`Active Users: ${overview?.total_active_users || 0}`, `Total Products: ${overview?.total_products || 0}`],
        [`Approved Products: ${overview?.approved_products || 0}`, `Pending Products: ${overview?.pending_products || 0}`],
        [`Total Transactions: ${overview?.total_transactions || 0}`, `Completed: ${overview?.completed_transactions || 0}`],
        [`Total Revenue: PHP ${Number(overview?.total_revenue || 0).toLocaleString('en-PH')}`, `Avg Transaction: PHP ${Number(overview?.avg_transaction_value || 0).toLocaleString('en-PH')}`],
        [`7-Day Revenue: PHP ${Number(overview?.revenue_7d || 0).toLocaleString('en-PH')}`, `30-Day Revenue: PHP ${Number(overview?.revenue_30d || 0).toLocaleString('en-PH')}`],
      ];

      overviewData.forEach((row) => {
        doc.text(`• ${row[0]}`, 25, yPosition);
        doc.text(`• ${row[1]}`, 110, yPosition);
        yPosition += 6;
      });

      yPosition += 5;

      // Recent Transactions Summary
      doc.setFillColor(lightGreen[0], lightGreen[1], lightGreen[2]);
      doc.rect(15, yPosition - 5, 180, 7, 'F');
      doc.setTextColor(darkGreen[0], darkGreen[1], darkGreen[2]);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('Recent Transactions Summary', 20, yPosition);
      yPosition += 8;

      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      const transactionSummary = transactions.slice(0, 5);
      transactionSummary.forEach((tx) => {
        const amount = `PHP ${Number(tx.total_amount || 0).toLocaleString('en-PH')}`;
        const status = tx.transaction_status;
        doc.text(`• ${tx.item_name} - ${amount} (${status})`, 25, yPosition);
        yPosition += 5;
      });

      yPosition += 5;

      // Pending Products Summary
      if (pendingProducts.length > 0) {
        doc.setFillColor(lightGreen[0], lightGreen[1], lightGreen[2]);
        doc.rect(15, yPosition - 5, 180, 7, 'F');
        doc.setTextColor(darkGreen[0], darkGreen[1], darkGreen[2]);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text('Pending Products for Approval', 20, yPosition);
        yPosition += 8;

        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        pendingProducts.slice(0, 5).forEach((product) => {
          const hours = Math.round((new Date().getTime() - new Date(product.created_at).getTime()) / 3600000);
          doc.text(`• ${product.product_name} by ${product.seller_name} (${hours}h pending)`, 25, yPosition);
          yPosition += 5;
        });
        yPosition += 5;
      }

      // Category Performance Summary
      if (categoryData.length > 0) {
        doc.setFillColor(lightGreen[0], lightGreen[1], lightGreen[2]);
        doc.rect(15, yPosition - 5, 180, 7, 'F');
        doc.setTextColor(darkGreen[0], darkGreen[1], darkGreen[2]);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text('Top Categories by Revenue', 20, yPosition);
        yPosition += 8;

        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        categoryData.slice(0, 5).forEach((category) => {
          const revenue = `PHP ${Number(category.total_revenue || 0).toLocaleString('en-PH')}`;
          doc.text(`• ${category.category_name} - ${revenue}`, 25, yPosition);
          yPosition += 5;
        });
        yPosition += 5;
      }

      // Check if we need a new page
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }

      // User Activity Summary
      if (userActivity.length > 0) {
        doc.setFillColor(lightGreen[0], lightGreen[1], lightGreen[2]);
        doc.rect(15, yPosition - 5, 180, 7, 'F');
        doc.setTextColor(darkGreen[0], darkGreen[1], darkGreen[2]);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text('Active Users Summary', 20, yPosition);
        yPosition += 8;

        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        const activeCount = userActivity.filter((u) => u.activity_status === 'Active').length;
        const moderateCount = userActivity.filter((u) => u.activity_status === 'Moderate').length;
        const inactiveCount = userActivity.filter((u) => u.activity_status === 'Inactive').length;

        doc.text(`• Active Users: ${activeCount}`, 25, yPosition);
        yPosition += 5;
        doc.text(`• Moderate Activity: ${moderateCount}`, 25, yPosition);
        yPosition += 5;
        doc.text(`• Inactive Users: ${inactiveCount}`, 25, yPosition);
        yPosition += 5;
      }

      yPosition += 5;

      // Transaction Status Distribution
      if (transactionStatusData.length > 0) {
        doc.setFillColor(lightGreen[0], lightGreen[1], lightGreen[2]);
        doc.rect(15, yPosition - 5, 180, 7, 'F');
        doc.setTextColor(darkGreen[0], darkGreen[1], darkGreen[2]);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text('Transaction Status Distribution', 20, yPosition);
        yPosition += 8;

        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        transactionStatusData.forEach((status) => {
          doc.text(`• ${status.transaction_status}: ${status.count} (${status.percentage}%)`, 25, yPosition);
          yPosition += 5;
        });
      }

      // Footer with green accent
      doc.setFillColor(lightGreen[0], lightGreen[1], lightGreen[2]);
      doc.rect(0, doc.internal.pageSize.getHeight() - 15, 210, 15, 'F');
      doc.setTextColor(darkGreen[0], darkGreen[1], darkGreen[2]);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.text('CSU Marketplace - Confidential Admin Report', 20, doc.internal.pageSize.getHeight() - 8);
      doc.text(`Report Generated: ${new Date().toLocaleString('en-PH')}`, 20, doc.internal.pageSize.getHeight() - 4);

      // Return as Blob
      return doc.output('blob');
    } catch (error: any) {
      console.error('❌ Error generating PDF report:', error?.message || error);
      return null;
    }
  }
};

export default adminService;

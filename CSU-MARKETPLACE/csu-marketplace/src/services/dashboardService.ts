import { supabase } from '../lib/supabase';

// ═══════════════════════════════════════════════════════════════════════════════════
// DASHBOARD TYPESCRIPT INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════════

export interface DashboardOverview {
  user_id: string;
  username: string;
  total_products_posted: number;
  total_products_sold: number;
  total_orders_as_buyer: number;
  total_orders_as_seller: number;
  total_revenue: number;
  average_seller_rating: number;
  total_reviews_received: number;
  active_listings: number;
  pending_listings: number;
  pending_orders_as_seller: number;
  pending_orders_as_buyer: number;
  sales_30d: number;
  revenue_30d: number;
  total_product_favorites: number;
  items_in_cart: number;
}

export interface MonthlyRevenue {
  seller_id: string;
  month: string;
  transaction_count: number;
  monthly_revenue: number;
  avg_transaction_value: number;
  sales: number;
  rentals: number;
  services: number;
}

export interface CategoryPerformance {
  user_id: string;
  category_id: string;
  category_name: string;
  product_count: number;
  completed_transactions: number;
  total_revenue: number;
  total_views: number;
  total_favorites: number;
}

export interface TopProduct {
  product_id: number;
  product_name: string;
  price: number;
  listing_type: string;
  view_count: number;
  created_at: string;
  category_name: string;
  seller_username: string;
  seller_name: string;
  favorite_count: number;
  sales_count: number;
  total_revenue: number;
  view_rank: number;
  favorite_rank: number;
  user_id?: string;
}

export interface SalesTrend {
  seller_id: string;
  date: string;
  daily_sales: number;
  cumulative_sales: number;
  for_sale: number;
  for_rent: number;
  services: number;
}

export interface RevenueTrend {
  date: string;
  seller_id: string;
  transactions: number;
  daily_revenue: number;
  avg_transaction_value: number;
  cumulative_revenue: number;
  sales: number;
  rentals: number;
  services: number;
}

export interface RecentActivity {
  user_id: string;
  activity_type: string;
  related_id: string;
  activity_description: string;
  activity_metric: number;
  activity_timestamp: string;
  category_name: string;
  listing_type: 'FOR_SALE' | 'FOR_RENT' | 'SERVICE';
  user_name?: string;
}

export interface OrderStatusDistribution {
  seller_id: string;
  order_status: string;
  count: number;
  percentage: number;
  total_value: number;
}

// ═══════════════════════════════════════════════════════════════════════════════════
// DASHBOARD SERVICE - FETCH ALL DATA
// ═══════════════════════════════════════════════════════════════════════════════════

export const dashboardService = {
  /**
   * Fetch Dashboard Overview - KPI Cards
   * Charts: 4 KPI Cards (Total Sales, Total Orders, Products Sold, Active Listings)
   */
  async getDashboardOverview(userId: string): Promise<DashboardOverview | null> {
    try {
      if (!supabase) {
        console.error('❌ Supabase client not initialized');
        return null;
      }
      const { data, error } = await supabase
        .from('user_view_dashboard_overview')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      return data;
    } catch (error: any) {
      console.error('❌ Error fetching dashboard overview:', error?.message || error);
      return null;
    }
  },

  /**
   * Fetch Real Total Products Sold Count - Same logic as Seller Profile
   * Counts completed transactions where seller_id matches
  /**
   * Fetch Real Total Products Sold Count - Same logic as Seller Profile
   * Counts ONLY FOR_SALE completed transactions where seller_id matches
   * This gives accurate sold count for products (excluding rentals and services)
   */
  async getRealTotalProductsSold(sellerId: string): Promise<number> {
    try {
      if (!supabase) {
        console.error('❌ Supabase client not initialized');
        return 0;
      }

      console.log('🔍 Fetching products sold for seller_id:', sellerId);
      const { data, error } = await supabase
        .from('transactions')
        .select('listing_type')
        .eq('seller_id', sellerId)
        .eq('transaction_status', 'COMPLETED');

      if (error) {
        console.error('❌ Error fetching total products sold:', error);
        return 0;
      }

      console.log('📊 Raw transaction data:', data);
      
      // Count only FOR_SALE transactions (matching Seller Profile logic)
      let totalSold = 0;
      (data || []).forEach((tx: any) => {
        console.log(`  Processing tx: listing_type="${tx.listing_type}"`);
        if (tx.listing_type === 'FOR_SALE') {
          totalSold++;
        }
      });

      console.log('📦 Real total products sold for seller:', sellerId, '=', totalSold, 'records:', data?.length || 0);
      return totalSold;
    } catch (error: any) {
      console.error('❌ Exception fetching total products sold:', error);
      return 0;
    }
  },

  /**
   * Fetch REAL Total Revenue from ALL completed transactions
   * Calculates: item_price * quantity for each completed transaction
   * This gives accurate revenue across all products
   */
  async getRealTotalRevenue(sellerId: string): Promise<number> {
    try {
      if (!supabase) {
        console.error('❌ Supabase client not initialized');
        return 0;
      }

      console.log('🔍 Fetching total revenue for seller_id:', sellerId);
      const { data, error } = await supabase
        .from('transactions')
        .select('item_price, quantity')
        .eq('seller_id', sellerId)
        .eq('transaction_status', 'COMPLETED');

      if (error) {
        console.error('❌ Error fetching total revenue:', error);
        return 0;
      }

      console.log('💳 Raw transaction data:', data);
      const totalRevenue = (data || []).reduce((sum: number, tx: any) => {
        const price = parseFloat(tx.item_price) || 0;
        const quantity = parseInt(tx.quantity) || 1;
        const amount = price * quantity;
        console.log('  Processing transaction: price=' + tx.item_price + ', qty=' + tx.quantity + ' → amount=' + amount);
        return sum + amount;
      }, 0);

      console.log('💰 Real total revenue for seller:', sellerId, '=', totalRevenue, 'records:', data?.length || 0);
      return totalRevenue;
    } catch (error: any) {
      console.error('❌ Exception fetching total revenue:', error);
      return 0;
    }
  },

  /**
   * Fetch REAL Total Products Sold from ALL users (Global)
   * Counts all FOR_SALE completed transactions across all sellers
   * This is the marketplace-wide metric
   */
  async getRealGlobalTotalProductsSold(): Promise<number> {
    try {
      if (!supabase) {
        console.error('❌ Supabase client not initialized');
        return 0;
      }

      console.log('🔍 Fetching global total products sold (all sellers)');
      const { data, error } = await supabase
        .from('transactions')
        .select('listing_type')
        .eq('transaction_status', 'COMPLETED');

      if (error) {
        console.error('❌ Error fetching global total products sold:', error);
        return 0;
      }

      console.log('📊 Raw global transaction data:', data);
      
      // Count only FOR_SALE transactions globally (matching Seller Profile logic)
      let totalSold = 0;
      (data || []).forEach((tx: any) => {
        console.log(`  Processing global tx: listing_type="${tx.listing_type}"`);
        if (tx.listing_type === 'FOR_SALE') {
          totalSold++;
        }
      });

      console.log('📦 Real GLOBAL total products sold =', totalSold, 'records:', data?.length || 0);
      return totalSold;
    } catch (error: any) {
      console.error('❌ Exception fetching global total products sold:', error);
      return 0;
    }
  },

  /**
   * Fetch Monthly Revenue - Revenue Line/Area Chart
   * Chart Type: LINE CHART / AREA CHART
   * Used for: Last 12 months revenue trend
   */
  async getMonthlyRevenue(sellerId: string): Promise<MonthlyRevenue[]> {
    try {
      if (!supabase) {
        console.error('❌ Supabase client not initialized');
        return [];
      }
      const { data, error } = await supabase
        .from('user_analytics_my_monthly_revenue')
        .select('*')
        .eq('seller_id', sellerId)
        .order('month', { ascending: true });

      if (error) throw error;
      console.log('✅ Monthly revenue fetched:', data?.length || 0, 'rows');
      return data || [];
    } catch (error: any) {
      console.error('❌ Error fetching monthly revenue:', error?.message || error);
      return [];
    }
  },

  /**
   * Fetch Sales Trend - Daily/Weekly Sales
   * Chart Type: LINE CHART
   * Used for: Sales count trend over 90 days
   */
  async getSalesTrend(sellerId: string): Promise<SalesTrend[]> {
    try {
      if (!supabase) {
        console.error('❌ Supabase client not initialized');
        return [];
      }
      const { data, error } = await supabase
        .from('user_analytics_my_sales_trend')
        .select('*')
        .eq('seller_id', sellerId)
        .order('date', { ascending: true });

      if (error) throw error;
      console.log('✅ Sales trend fetched:', data?.length || 0, 'rows');
      return data || [];
    } catch (error: any) {
      console.error('❌ Error fetching sales trend:', error?.message || error);
      return [];
    }
  },

  /**
   * Fetch Revenue Trend - Daily Revenue
   * Chart Type: LINE CHART / AREA CHART
   * Used for: Daily revenue trend over 90 days
   */
  async getRevenueTrend(sellerId: string): Promise<RevenueTrend[]> {
    try {
      if (!supabase) {
        console.error('❌ Supabase client not initialized');
        return [];
      }
      const { data, error } = await supabase
        .from('user_analytics_my_revenue_trend')
        .select('*')
        .eq('seller_id', sellerId)
        .order('date', { ascending: true });

      if (error) throw error;
      console.log('✅ Revenue trend fetched:', data?.length || 0, 'rows');
      return data || [];
    } catch (error: any) {
      console.error('❌ Error fetching revenue trend:', error?.message || error);
      return [];
    }
  },

  /**
   * Fetch Category Performance - Pie/Donut Chart
   * Chart Type: PIE CHART / DONUT CHART
   * Used for: Income breakdown by category
   */
  async getCategoryPerformance(userId: string): Promise<CategoryPerformance[]> {
    try {
      if (!supabase) {
        console.error('❌ Supabase client not initialized');
        return [];
      }
      const { data, error } = await supabase
        .from('user_analytics_my_category_performance')
        .select('*')
        .eq('user_id', userId)
        .order('total_revenue', { ascending: false });

      if (error) throw error;
      console.log('✅ Category performance fetched:', data?.length || 0, 'rows');
      return data || [];
    } catch (error: any) {
      console.error('❌ Error fetching category performance:', error?.message || error);
      return [];
    }
  },

  /**
   * Fetch Top Products - Bar Chart / Data Table
   * Chart Type: BAR CHART
   * Used for: Top 4 products by views/sales
   */
  async getTopProducts(userId: string, limit: number = 4): Promise<TopProduct[]> {
    try {
      if (!supabase) {
        console.error('❌ Supabase client not initialized');
        return [];
      }
      const { data, error } = await supabase
        .from('analytics_view_top_products')
        .select('*')
        .eq('user_id', userId)
        .limit(limit);

      if (error) throw error;
      console.log('✅ Top products fetched:', data?.length || 0, 'rows');
      console.log('📊 Top products data:', data);
      
      // Ensure view_count is included
      const productsWithViews = (data || []).map(product => ({
        ...product,
        view_count: product.view_count || 0
      }));
      
      console.log('📈 Products with view counts:', productsWithViews);
      return productsWithViews;
    } catch (error: any) {
      console.error('❌ Error fetching top products:', error?.message || error);
      return [];
    }
  },

  /**
   * Fetch Recent Activity - Activity Feed
   * Chart Type: ACTIVITY FEED
   * Used for: Latest events (views, favorites, orders, listings)
   */
  async getRecentActivity(userId: string, limit: number = 10): Promise<RecentActivity[]> {
    try {
      if (!supabase) {
        console.error('❌ Supabase client not initialized');
        return [];
      }
      const { data, error } = await supabase
        .from('user_view_recent_activity')
        .select('*')
        .eq('user_id', userId)
        .order('activity_timestamp', { ascending: false })
        .limit(limit);

      if (error) throw error;
      console.log('✅ Recent activity fetched:', data?.length || 0, 'rows');
      return data || [];
    } catch (error: any) {
      console.error('❌ Error fetching recent activity:', error?.message || error);
      return [];
    }
  },

  /**
   * Fetch Order Status Distribution - Donut Chart
   * Chart Type: DONUT CHART
   * Used for: Order status breakdown (pending, accepted, completed, etc.)
   */
  async getOrderStatusDistribution(sellerId: string): Promise<OrderStatusDistribution[]> {
    try {
      if (!supabase) {
        console.error('❌ Supabase client not initialized');
        return [];
      }
      const { data, error } = await supabase
        .from('user_analytics_my_order_status_distribution')
        .select('*')
        .eq('seller_id', sellerId)
        .order('count', { ascending: false });

      if (error) throw error;
      console.log('✅ Order status distribution fetched:', data?.length || 0, 'rows');
      return data || [];
    } catch (error: any) {
      console.error('❌ Error fetching order status distribution:', error?.message || error);
      return [];
    }
  },

  /**
   * Load All Dashboard Data in Parallel
   * Combines all fetch operations for optimal performance
   */
  async loadAllDashboardData(userId: string, sellerId: string) {
    try {
      console.log('📊 Loading complete dashboard data...');
      
      if (!supabase) {
        throw new Error('Supabase client not initialized');
      }

      const [
        overview,
        monthlyRevenue,
        salesTrend,
        revenueTrend,
        categoryPerformance,
        topProducts,
        recentActivity,
        orderStatusDistribution,
        realTotalProductsSold,
        realTotalRevenue,
        realGlobalProductsSold
      ] = await Promise.all([
        this.getDashboardOverview(userId),
        this.getMonthlyRevenue(sellerId).catch(err => {
          console.error('❌ Error fetching monthly revenue:', err);
          return [];
        }),
        this.getSalesTrend(sellerId).catch(err => {
          console.error('❌ Error fetching sales trend:', err);
          return [];
        }),
        this.getRevenueTrend(sellerId).catch(err => {
          console.error('❌ Error fetching revenue trend:', err);
          return [];
        }),
        this.getCategoryPerformance(userId).catch(err => {
          console.error('❌ Error fetching category performance:', err);
          return [];
        }),
        this.getTopProducts(userId, 4).catch(err => {
          console.error('❌ Error fetching top products:', err);
          return [];
        }),
        this.getRecentActivity(userId, 10).catch(err => {
          console.error('❌ Error fetching recent activity:', err);
          return [];
        }),
        this.getOrderStatusDistribution(sellerId).catch(err => {
          console.error('❌ Error fetching order status distribution:', err);
          return [];
        }),
        this.getRealTotalProductsSold(sellerId).catch(err => {
          console.error('❌ Error fetching real total products sold:', err);
          return 0;
        }),
        this.getRealTotalRevenue(sellerId).catch(err => {
          console.error('❌ Error fetching real total revenue:', err);
          return 0;
        }),
        this.getRealGlobalTotalProductsSold().catch(err => {
          console.error('❌ Error fetching real global total products sold:', err);
          return 0;
        })
      ]);

      console.log('✅ Dashboard data loaded successfully');
      console.log('📊 Real Total Products Sold:', realTotalProductsSold);
      console.log('💰 Real Total Revenue:', realTotalRevenue);
      console.log('📦 Real Global Products Sold:', realGlobalProductsSold);

      // Update overview with real data
      const updatedOverview = overview ? {
        ...overview,
        total_products_sold: realTotalProductsSold,
        total_revenue: realTotalRevenue
      } : null;

      return {
        overview: updatedOverview,
        monthlyRevenue: monthlyRevenue || [],
        salesTrend: salesTrend || [],
        revenueTrend: revenueTrend || [],
        categoryPerformance: categoryPerformance || [],
        topProducts: topProducts || [],
        recentActivity: recentActivity || [],
        orderStatusDistribution: orderStatusDistribution || [],
        realTotalProductsSold,
        realTotalRevenue,
        realGlobalProductsSold
      };
    } catch (error) {
      console.error('❌ Error loading dashboard data:', error);
      throw error;
    }
  }
};

export default dashboardService;

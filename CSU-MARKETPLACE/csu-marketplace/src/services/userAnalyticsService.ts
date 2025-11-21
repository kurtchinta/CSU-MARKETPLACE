/**
 * User Analytics Service
 * Provides comprehensive analytics for regular users
 */

import { supabase } from '../lib/supabase';

// ============================================================================
// INTERFACES
// ============================================================================

export interface UserDashboardStats {
  totalListings: number;
  activeListings: number;
  pendingListings: number;
  rejectedListings: number;
  totalOrders: number;
  completedOrders: number;
  pendingOrders: number;
  totalSpent: number;
  totalEarned: number;
  averageOrderValue: number;
  totalViews: number;
  totalReviews: number;
  averageRating: number;
  newOrdersToday: number;
  newListingsToday: number;
}

export interface UserListingPerformance {
  productId: number;
  productName: string;
  price: number;
  totalViews: number;
  totalOrders: number;
  totalRevenue: number;
  averageRating: number;
  reviewCount: number;
  imageUrl?: string;
  status: string;
}

export interface UserOrderHistory {
  orderId: number;
  productName: string;
  sellerName: string;
  amount: number;
  status: string;
  orderDate: string;
  imageUrl?: string;
}

export interface UserSalesHistory {
  orderId: number;
  productName: string;
  buyerName: string;
  amount: number;
  status: string;
  orderDate: string;
  imageUrl?: string;
}

export interface UserRecentActivity {
  activityId: number;
  activityType: string;
  description: string;
  timestamp: string;
  icon?: string;
}

export interface UserCategoryBreakdown {
  categoryName: string;
  productCount: number;
  totalRevenue: number;
  percentage: number;
}

export interface UserMonthlyRevenue {
  month: string;
  revenue: number;
  orderCount: number;
}

export interface UserReviewSummary {
  reviewId: number;
  productName: string;
  rating: number;
  comment: string;
  reviewerName: string;
  createdAt: string;
}

// ============================================================================
// SERVICE CLASS
// ============================================================================

class UserAnalyticsService {
  /**
   * Get comprehensive dashboard statistics for a user
   */
  async getDashboardStats(userId: string): Promise<UserDashboardStats> {
    try {
      if (!supabase) {
        throw new Error('Supabase client not initialized');
      }

      console.log('📊 Fetching dashboard stats for user:', userId);

      // Fetch all data in parallel
      const [
        listingsData,
        ordersData,
        salesData,
        reviewsData,
        viewsData
      ] = await Promise.all([
        this.getUserListings(userId),
        this.getUserOrders(userId),
        this.getUserSales(userId),
        this.getUserReviews(userId),
        this.getUserProductViews(userId)
      ]);

      // Calculate listings stats
      const totalListings = listingsData.length;
      const activeListings = listingsData.filter(p => p.status === 'approved').length;
      const pendingListings = listingsData.filter(p => p.status === 'pending').length;
      const rejectedListings = listingsData.filter(p => p.status === 'rejected').length;

      // Calculate today's new listings
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const newListingsToday = listingsData.filter(p => {
        const createdAt = new Date(p.created_at);
        return createdAt >= today;
      }).length;

      // Calculate orders stats with product prices
      const totalOrders = ordersData.length;
      const completedOrders = ordersData.filter(o => o.order_status === 'completed').length;
      const pendingOrders = ordersData.filter(o => ['pending', 'accepted'].includes(o.order_status)).length;
      
      // Calculate total spent by fetching product prices
      let totalSpent = 0;
      for (const order of ordersData) {
        const { data: product } = await supabase!
          .from('products')
          .select('price')
          .eq('product_id', order.product_id)
          .single();
        if (product) {
          totalSpent += (product.price * order.buyer_quantity);
        }
      }
      const averageOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;

      // Calculate today's new orders
      const newOrdersToday = ordersData.filter(o => {
        const createdAt = new Date(o.created_at);
        return createdAt >= today;
      }).length;

      // Calculate sales stats with product prices
      let totalEarned = 0;
      for (const sale of salesData) {
        const { data: product } = await supabase!
          .from('products')
          .select('price')
          .eq('product_id', sale.product_id)
          .single();
        if (product) {
          totalEarned += (product.price * sale.buyer_quantity);
        }
      }

      // Calculate reviews stats
      const totalReviews = reviewsData.length;
      const averageRating = totalReviews > 0
        ? reviewsData.reduce((sum, r) => sum + (r.rating || 0), 0) / totalReviews
        : 0;

      // Calculate total views
      const totalViews = viewsData.reduce((sum, v) => sum + (v.view_count || 0), 0);

      const stats: UserDashboardStats = {
        totalListings,
        activeListings,
        pendingListings,
        rejectedListings,
        totalOrders,
        completedOrders,
        pendingOrders,
        totalSpent,
        totalEarned,
        averageOrderValue,
        totalViews,
        totalReviews,
        averageRating,
        newOrdersToday,
        newListingsToday
      };

      console.log('✅ Dashboard stats loaded:', stats);
      return stats;
    } catch (error) {
      console.error('❌ Error fetching dashboard stats:', error);
      throw error;
    }
  }

  /**
   * Get user's product listings
   */
  private async getUserListings(userId: string) {
    const { data, error } = await supabase!
      .from('products')
      .select('product_id, product_name, status, price, created_at')
      .eq('user_id', userId);

    if (error) throw error;
    return data || [];
  }

  /**
   * Get user's orders (as buyer)
   */
  private async getUserOrders(userId: string) {
    const { data, error } = await supabase!
      .from('order_details')
      .select('order_id, order_status, created_at, product_id, buyer_quantity')
      .eq('buyer_id', userId);

    if (error) throw error;
    return data || [];
  }

  /**
   * Get user's sales (as seller)
   */
  private async getUserSales(userId: string) {
    const { data, error } = await supabase!
      .from('order_details')
      .select('order_id, order_status, created_at, product_id, buyer_quantity')
      .eq('seller_id', userId);

    if (error) throw error;
    return data || [];
  }

  /**
   * Get reviews for user's products
   */
  private async getUserReviews(userId: string) {
    // First get user's product IDs
    const { data: products } = await supabase!
      .from('products')
      .select('product_id')
      .eq('user_id', userId);

    if (!products || products.length === 0) return [];

    const productIds = products.map(p => p.product_id);

    // Then get reviews for those products
    const { data, error } = await supabase!
      .from('reviews')
      .select('review_id, rating, product_id')
      .in('product_id', productIds);

    if (error) throw error;
    return data || [];
  }

  /**
   * Get view counts for user's products
   */
  private async getUserProductViews(userId: string) {
    const { data, error } = await supabase!
      .from('products')
      .select('product_id, view_count')
      .eq('user_id', userId);

    if (error) throw error;
    return data || [];
  }

  /**
   * Get top performing listings
   */
  async getTopListings(userId: string, limit: number = 5): Promise<UserListingPerformance[]> {
    try {
      const { data, error } = await supabase!
        .from('products')
        .select(`
          product_id,
          product_name,
          price,
          status,
          view_count,
          product_images(image_url),
          reviews(rating)
        `)
        .eq('user_id', userId)
        .order('view_count', { ascending: false })
        .limit(limit);

      if (error) throw error;

      const listings: UserListingPerformance[] = (data || []).map((product: any) => {
        const reviews = product.reviews || [];
        const avgRating = reviews.length > 0
          ? reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length
          : 0;

        return {
          productId: product.product_id,
          productName: product.product_name,
          price: product.price,
          totalViews: product.view_count || 0,
          totalOrders: 0, // Will be calculated separately
          totalRevenue: 0, // Will be calculated separately
          averageRating: avgRating,
          reviewCount: reviews.length,
          imageUrl: product.product_images?.[0]?.image_url,
          status: product.status
        };
      });

      return listings;
    } catch (error) {
      console.error('❌ Error fetching top listings:', error);
      return [];
    }
  }

  /**
   * Get recent order history (as buyer)
   */
  async getRecentOrders(userId: string, limit: number = 10): Promise<UserOrderHistory[]> {
    try {
      const { data, error } = await supabase!
        .from('order_details')
        .select(`
          order_id,
          order_status,
          created_at,
          product_id,
          seller_id,
          buyer_quantity
        `)
        .eq('buyer_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      // Fetch product and seller details separately
      const orders = await Promise.all((data || []).map(async (order: any) => {
        const [productData, sellerData] = await Promise.all([
          supabase!.from('products').select('product_name, price, product_images(image_url)').eq('product_id', order.product_id).single(),
          supabase!.from('users').select('first_name, last_name').eq('user_id', order.seller_id).single()
        ]);

        const amount = (productData.data?.price || 0) * order.buyer_quantity;

        return {
          orderId: order.order_id,
          productName: productData.data?.product_name || 'Unknown Product',
          sellerName: `${sellerData.data?.first_name || ''} ${sellerData.data?.last_name || ''}`.trim() || 'Unknown Seller',
          amount: amount,
          status: order.order_status.toUpperCase(),
          orderDate: order.created_at,
          imageUrl: productData.data?.product_images?.[0]?.image_url
        };
      }));

      return orders;
    } catch (error) {
      console.error('❌ Error fetching recent orders:', error);
      return [];
    }
  }

  /**
   * Get recent sales history (as seller)
   */
  async getRecentSales(userId: string, limit: number = 10): Promise<UserSalesHistory[]> {
    try {
      const { data, error } = await supabase!
        .from('order_details')
        .select(`
          order_id,
          order_status,
          created_at,
          product_id,
          buyer_id,
          buyer_quantity
        `)
        .eq('seller_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      // Fetch product and buyer details separately
      const sales = await Promise.all((data || []).map(async (sale: any) => {
        const [productData, buyerData] = await Promise.all([
          supabase!.from('products').select('product_name, price, product_images(image_url)').eq('product_id', sale.product_id).single(),
          supabase!.from('users').select('first_name, last_name').eq('user_id', sale.buyer_id).single()
        ]);

        const amount = (productData.data?.price || 0) * sale.buyer_quantity;

        return {
          orderId: sale.order_id,
          productName: productData.data?.product_name || 'Unknown Product',
          buyerName: `${buyerData.data?.first_name || ''} ${buyerData.data?.last_name || ''}`.trim() || 'Unknown Buyer',
          amount: amount,
          status: sale.order_status.toUpperCase(),
          orderDate: sale.created_at,
          imageUrl: productData.data?.product_images?.[0]?.image_url
        };
      }));

      return sales;
    } catch (error) {
      console.error('❌ Error fetching recent sales:', error);
      return [];
    }
  }

  /**
   * Get recent activity timeline
   */
  async getRecentActivity(userId: string, limit: number = 20): Promise<UserRecentActivity[]> {
    try {
      const activities: UserRecentActivity[] = [];

      // Get recent listings
      const { data: listings } = await supabase!
        .from('products')
        .select('product_id, product_name, status, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);

      (listings || []).forEach((listing: any) => {
        activities.push({
          activityId: listing.product_id,
          activityType: 'listing_created',
          description: `Created listing: ${listing.product_name}`,
          timestamp: listing.created_at,
          icon: ''
        });
      });

      // Get recent orders
      const { data: orders } = await supabase!
        .from('order_details')
        .select('order_id, created_at, product_id')
        .eq('buyer_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);

      // Fetch product names separately for orders
      for (const order of orders || []) {
        const { data: product } = await supabase!
          .from('products')
          .select('product_name')
          .eq('product_id', order.product_id)
          .single();

        activities.push({
          activityId: order.order_id,
          activityType: 'order_placed',
          description: `Placed order for: ${product?.product_name || 'Unknown'}`,
          timestamp: order.created_at,
          icon: '🛒'
        });
      }

      // Get recent sales
      const { data: sales } = await supabase!
        .from('order_details')
        .select('order_id, created_at, product_id')
        .eq('seller_id', userId)
        .order('created_at', { ascending: false })
        .limit(5);

      // Fetch product names separately for sales
      for (const sale of sales || []) {
        const { data: product } = await supabase!
          .from('products')
          .select('product_name')
          .eq('product_id', sale.product_id)
          .single();

        activities.push({
          activityId: sale.order_id,
          activityType: 'sale_made',
          description: `Sold: ${product?.product_name || 'Unknown'}`,
          timestamp: sale.created_at,
          icon: ''
        });
      }

      // Sort by timestamp and limit
      return activities
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limit);
    } catch (error) {
      console.error('❌ Error fetching recent activity:', error);
      return [];
    }
  }

  /**
   * Get category breakdown for user's listings
   */
  async getCategoryBreakdown(userId: string): Promise<UserCategoryBreakdown[]> {
    try {
      const { data, error } = await supabase!
        .from('products')
        .select(`
          category_id,
          price,
          category:categories(category_name)
        `)
        .eq('user_id', userId)
        .eq('status', 'approved');

      if (error) throw error;

      const categoryMap = new Map<string, { count: number; revenue: number }>();
      let totalProducts = 0;

      (data || []).forEach((product: any) => {
        const categoryName = product.category?.category_name || 'Uncategorized';
        const existing = categoryMap.get(categoryName) || { count: 0, revenue: 0 };
        categoryMap.set(categoryName, {
          count: existing.count + 1,
          revenue: existing.revenue + (product.price || 0)
        });
        totalProducts++;
      });

      return Array.from(categoryMap.entries()).map(([categoryName, stats]) => ({
        categoryName,
        productCount: stats.count,
        totalRevenue: stats.revenue,
        percentage: totalProducts > 0 ? (stats.count / totalProducts) * 100 : 0
      }));
    } catch (error) {
      console.error('❌ Error fetching category breakdown:', error);
      return [];
    }
  }

  /**
   * Get monthly revenue trend (last 6 months)
   */
  async getMonthlyRevenue(userId: string): Promise<UserMonthlyRevenue[]> {
    try {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const { data, error } = await supabase!
        .from('order_details')
        .select('created_at, order_status, product_id, buyer_quantity')
        .eq('seller_id', userId)
        .gte('created_at', sixMonthsAgo.toISOString());

      if (error) throw error;

      const monthlyData = new Map<string, { revenue: number; count: number }>();

      // Calculate revenue for each order
      for (const order of data || []) {
        const { data: product } = await supabase!
          .from('products')
          .select('price')
          .eq('product_id', order.product_id)
          .single();

        if (product) {
          const amount = product.price * order.buyer_quantity;
          const date = new Date(order.created_at);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          const existing = monthlyData.get(monthKey) || { revenue: 0, count: 0 };
          monthlyData.set(monthKey, {
            revenue: existing.revenue + amount,
            count: existing.count + 1
          });
        }
      }

      return Array.from(monthlyData.entries())
        .map(([month, stats]) => ({
          month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          revenue: stats.revenue,
          orderCount: stats.count
        }))
        .sort((a, b) => a.month.localeCompare(b.month));
    } catch (error) {
      console.error('❌ Error fetching monthly revenue:', error);
      return [];
    }
  }

  /**
   * Get recent reviews for user's products
   */
  async getRecentReviews(userId: string, limit: number = 10): Promise<UserReviewSummary[]> {
    try {
      // First get user's product IDs
      const { data: products } = await supabase!
        .from('products')
        .select('product_id')
        .eq('user_id', userId);

      if (!products || products.length === 0) return [];

      const productIds = products.map(p => p.product_id);

      // Then get reviews for those products
      const { data, error } = await supabase!
        .from('reviews')
        .select(`
          review_id,
          rating,
          comment,
          created_at,
          product_id,
          user_id
        `)
        .in('product_id', productIds)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      // Fetch product and reviewer details separately
      const reviews = await Promise.all((data || []).map(async (review: any) => {
        const [productData, reviewerData] = await Promise.all([
          supabase!.from('products').select('product_name').eq('product_id', review.product_id).single(),
          supabase!.from('users').select('first_name, last_name').eq('user_id', review.user_id).single()
        ]);

        return {
          reviewId: review.review_id,
          productName: productData.data?.product_name || 'Unknown Product',
          rating: review.rating,
          comment: review.comment || '',
          reviewerName: `${reviewerData.data?.first_name || ''} ${reviewerData.data?.last_name || ''}`.trim() || 'Anonymous',
          createdAt: review.created_at
        };
      }));

      return reviews;
    } catch (error) {
      console.error('❌ Error fetching recent reviews:', error);
      return [];
    }
  }
}

// Export singleton instance
export const userAnalytics = new UserAnalyticsService();

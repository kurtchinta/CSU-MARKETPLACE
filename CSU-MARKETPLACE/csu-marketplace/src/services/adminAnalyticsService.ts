/**
 * Admin Analytics Service
 * Integrates all database views and materialized views for comprehensive admin dashboard
 * Version: V7.0.0
 * Date: November 13, 2025
 */

import { supabase as supabaseClient } from '../lib/supabase';

// Ensure supabase is initialized - use non-null assertion since we control the environment
const supabase = supabaseClient!;

// ============================================================================
// INTERFACES FOR DASHBOARD DATA
// ============================================================================

export interface AdminDashboardStats {
  // User Statistics
  totalUsers: number;
  newUsersToday: number;
  verifiedUsers: number;
  totalAdmins: number;

  // Product Statistics
  totalProducts: number;
  pendingProducts: number;
  approvedProducts: number;
  rejectedProducts: number;
  newProductsToday: number;

  // Transaction Statistics
  totalTransactions: number;
  pendingTransactions: number;
  completedTransactions: number;
  completedToday: number;
  totalRevenue: number;
  revenueToday: number;

  // Order Statistics
  pendingOrders: number;

  // Review Statistics
  totalReviews: number;
  averageRating: number;

  // Blockchain Statistics
  pendingBlockchainTx: number;
  confirmedBlockchainTx: number;
}

export interface CategoryPerformance {
  categoryId: number;
  categoryName: string;
  iconName: string;
  totalProducts: number;
  approvedProducts: number;
  pendingProducts: number;
  totalViews: number;
  totalFavorites: number;
  totalTransactions: number;
  completedTransactions: number;
  totalRevenue: number;
  avgTransactionValue: number;
  minPrice: number;
  maxPrice: number;
  activeSellers: number;
  lastUpdated: string;
}

export interface TopSeller {
  userId: string;
  username: string;
  firstName: string;
  lastName: string;
  profilePicture: string | null;
  department: string | null;
  totalProductsSold: number;
  totalRevenue: number;
  averageSellerRating: number;
  totalReviewsReceived: number;
  activeListings: number;
  approvedListings: number;
  totalViews: number;
  totalFavorites: number;
  completedOrders: number;
  memberSince: string;
  lastUpdated: string;
}

export interface TrendingProduct {
  productId: number;
  productName: string;
  price: number;
  views: number;
  favorites: number;
  transactions: number;
  revenue: number;
  rating: number;
  reviewCount: number;
  seller: {
    userId: string;
    username: string;
  };
  category: string;
  status: string;
  trendScore: number;
  lastUpdated: string;
}

export interface ActiveProduct {
  productId: number;
  productName: string;
  description: string;
  price: number;
  quantity: number;
  listingType: string;
  status: string;
  viewCount: number;
  favoriteCount: number;
  createdAt: string;
  updatedAt: string;
  seller: {
    userId: string;
    username: string;
    firstName: string;
    lastName: string;
  };
  category: {
    categoryId: number;
    categoryName: string;
  };
  imageUrls: string[];
}

export interface UserProfile {
  userId: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  department: string | null;
  yearLevel: string | null;
  profilePicture: string | null;
  bio: string | null;
  isAdmin: boolean;
  walletAddress: string | null;
  isActive: boolean;
  isVerified: boolean;
  createdAt: string;
  lastActiveAt: string;
  totalProductsPosted: number;
  totalProductsSold: number;
  totalOrdersAsBuyer: number;
  totalOrdersAsSeller: number;
  totalRevenue: number;
  averageSellerRating: number;
  totalReviewsReceived: number;
  profileViews: number;
  totalFavoritesReceived: number;
}

export interface TransactionDetail {
  transactionId: string;
  buyerId: string;
  buyerName: string;
  sellerId: string;
  sellerName: string;
  productId: number;
  productName: string;
  itemPrice: number;
  quantity: number;
  totalAmount: number;
  paymentMethod: string;
  transactionStatus: string;
  blockchainTxHash: string | null;
  isBlockchainPending: boolean;
  createdAt: string;
  completedAt: string | null;
  reviewId: number | null;
  reviewRating: number | null;
  reviewCreatedAt: string | null;
}

export interface SellerPendingOrder {
  orderId: string;
  buyerId: string;
  buyerName: string;
  buyerUsername: string;
  productId: number;
  productName: string;
  productPrice: number;
  quantity: number;
  listingType: string;
  orderStatus: string;
  createdAt: string;
  serviceDuration: string | null;
}

export interface UserWishlistItem {
  favoriteId: number;
  userId: string;
  productId: number;
  productName: string;
  price: number;
  viewCount: number;
  favoriteCount: number;
  sellerUsername: string;
  categoryName: string;
  primaryImage: string | null;
  addedAt: string;
}

export interface RecentReview {
  reviewId: number;
  rating: number;
  reviewText: string;
  response: string | null;
  respondedAt: string | null;
  createdAt: string;
  reviewerId: string;
  reviewerUsername: string;
  reviewerName: string;
  reviewerPicture: string | null;
  sellerId: string;
  sellerUsername: string;
  sellerName: string;
  sellerPicture: string | null;
  productId: number;
  productName: string;
  transactionId: string;
  transactionStatus: string;
  transactionCompletedAt: string | null;
}

export interface AnalyticsEvent {
  eventId: number;
  eventType: string;
  userId: string;
  productId: number | null;
  categoryId: number | null;
  sessionId: string;
  metadata: Record<string, any>;
  createdAt: string;
}

export interface DailySnapshot {
  snapshotId: number;
  snapshotDate: string;
  totalUsers: number;
  activeUsers: number;
  newUsers: number;
  totalProducts: number;
  newProducts: number;
  totalTransactions: number;
  completedTransactions: number;
  dailyRevenue: number;
  averageTxValue: number;
  topCategoryId: number;
}

export interface RecentOrder {
  transactionId: string;
  orderId: string;
  createdAt: string;
  transactionStatus: string;
  itemName: string;
  itemPrice: number;
  quantity: number;
  buyerName: string;
  sellerName: string;
  productName: string;
  categoryName: string;
  statusLabel: string;
  hoursSinceCreated: number;
}

export interface RecentActivity {
  userId: string;
  activityType: string;
  activityDescription: string;
  entityType: string;
  entityId: string;
  createdAt: string;
  activityLabel: string;
}

export interface OrderSummary {
  status: string;
  count: number;
  totalAmount: number;
}

export interface TopCategoryStats {
  categoryId: number;
  categoryName: string;
  iconName: string;
  totalProducts: number;
  uniqueSellers: number;
  totalTransactions: number;
  completedTransactions: number;
  totalRevenue: number;
  avgTransactionValue: number;
  totalViews: number;
  totalFavorites: number;
  conversionRate: number;
  revenueSharePercent: number;
}

// ============================================================================
// ADMIN DASHBOARD STATS SERVICE
// ============================================================================

export async function getDashboardStats(): Promise<AdminDashboardStats> {
  try {
    console.log('📊 Analytics: Fetching dashboard stats from vw_admin_dashboard_stats...');

    const { data, error } = await supabase
      .from('vw_admin_dashboard_stats')
      .select('*')
      .single();

    if (error) {
      console.error('Analytics Error:', error);
      throw error;
    }

    return {
      totalUsers: data.total_users || 0,
      newUsersToday: data.new_users_today || 0,
      verifiedUsers: data.verified_users || 0,
      totalAdmins: data.total_admins || 0,
      totalProducts: data.total_products || 0,
      pendingProducts: data.pending_products || 0,
      approvedProducts: data.approved_products || 0,
      rejectedProducts: data.rejected_products || 0,
      newProductsToday: data.new_products_today || 0,
      totalTransactions: data.total_transactions || 0,
      pendingTransactions: data.pending_transactions || 0,
      completedTransactions: data.completed_transactions || 0,
      completedToday: data.completed_today || 0,
      totalRevenue: parseFloat(data.total_revenue) || 0,
      revenueToday: parseFloat(data.revenue_today) || 0,
      pendingOrders: data.pending_orders || 0,
      totalReviews: data.total_reviews || 0,
      averageRating: parseFloat(data.average_rating) || 0,
      pendingBlockchainTx: data.pending_blockchain_tx || 0,
      confirmedBlockchainTx: data.confirmed_blockchain_tx || 0,
    };
  } catch (error: any) {
    console.error('Analytics: Error fetching dashboard stats:', error);
    throw new Error(error.message || 'Failed to fetch dashboard stats');
  }
}

// ============================================================================
// CATEGORY PERFORMANCE - MATERIALIZED VIEW
// ============================================================================

export async function getCategoryPerformance(): Promise<CategoryPerformance[]> {
  try {
    console.log('📈 Analytics: Fetching category performance from mv_category_performance...');

    const { data, error } = await supabase
      .from('mv_category_performance')
      .select('*')
      .order('total_revenue', { ascending: false });

    if (error) {
      console.error('Analytics Error:', error);
      throw error;
    }

    return (data || []).map((item: any) => ({
      categoryId: item.category_id,
      categoryName: item.category_name,
      iconName: item.icon_name,
      totalProducts: item.total_products || 0,
      approvedProducts: item.approved_products || 0,
      pendingProducts: item.pending_products || 0,
      totalViews: item.total_views || 0,
      totalFavorites: item.total_favorites || 0,
      totalTransactions: item.total_transactions || 0,
      completedTransactions: item.completed_transactions || 0,
      totalRevenue: parseFloat(item.total_revenue) || 0,
      avgTransactionValue: parseFloat(item.avg_transaction_value) || 0,
      minPrice: parseFloat(item.min_price) || 0,
      maxPrice: parseFloat(item.max_price) || 0,
      activeSellers: item.active_sellers || 0,
      lastUpdated: item.last_updated,
    }));
  } catch (error: any) {
    console.error('Analytics: Error fetching category performance:', error);
    throw new Error(error.message || 'Failed to fetch category performance');
  }
}

// ============================================================================
// TOP SELLERS - MATERIALIZED VIEW
// ============================================================================

export async function getTopSellers(limit: number = 20): Promise<TopSeller[]> {
  try {
    console.log(`📈 Analytics: Fetching top ${limit} sellers from mv_top_sellers...`);

    const { data, error } = await supabase
      .from('mv_top_sellers')
      .select('*')
      .limit(limit);

    if (error) {
      console.error('Analytics Error:', error);
      throw error;
    }

    return (data || []).map((item: any) => ({
      userId: item.user_id,
      username: item.username,
      firstName: item.first_name,
      lastName: item.last_name,
      profilePicture: item.profile_picture,
      department: item.department,
      totalProductsSold: item.total_products_sold || 0,
      totalRevenue: parseFloat(item.total_revenue) || 0,
      averageSellerRating: parseFloat(item.average_seller_rating) || 0,
      totalReviewsReceived: item.total_reviews_received || 0,
      activeListings: item.active_listings || 0,
      approvedListings: item.approved_listings || 0,
      totalViews: item.total_views || 0,
      totalFavorites: item.total_favorites || 0,
      completedOrders: item.completed_orders || 0,
      memberSince: item.member_since,
      lastUpdated: item.last_updated,
    }));
  } catch (error: any) {
    console.error('Analytics: Error fetching top sellers:', error);
    throw new Error(error.message || 'Failed to fetch top sellers');
  }
}

// ============================================================================
// TRENDING PRODUCTS - MATERIALIZED VIEW
// ============================================================================

export async function getTrendingProducts(limit: number = 20): Promise<TrendingProduct[]> {
  try {
    console.log(`📈 Analytics: Fetching top ${limit} trending products from mv_trending_products...`);

    const { data, error } = await supabase
      .from('mv_trending_products')
      .select('*')
      .limit(limit);

    if (error) {
      console.error('Analytics Error:', error);
      throw error;
    }

    return (data || []).map((item: any) => ({
      productId: item.product_id,
      productName: item.product_name,
      price: parseFloat(item.price) || 0,
      views: item.views || 0,
      favorites: item.favorites || 0,
      transactions: item.transactions || 0,
      revenue: parseFloat(item.revenue) || 0,
      rating: parseFloat(item.rating) || 0,
      reviewCount: item.review_count || 0,
      seller: {
        userId: item.seller_id,
        username: item.seller_username,
      },
      category: item.category_name,
      status: item.status,
      trendScore: parseFloat(item.trend_score) || 0,
      lastUpdated: item.last_updated,
    }));
  } catch (error: any) {
    console.error('Analytics: Error fetching trending products:', error);
    throw new Error(error.message || 'Failed to fetch trending products');
  }
}

// ============================================================================
// ACTIVE PRODUCTS - REGULAR VIEW
// ============================================================================

export async function getActiveProducts(limit: number = 50): Promise<ActiveProduct[]> {
  try {
    console.log(`📈 Analytics: Fetching ${limit} active products from vw_active_products...`);

    const { data, error } = await supabase
      .from('vw_active_products')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Analytics Error:', error);
      throw error;
    }

    return (data || []).map((item: any) => ({
      productId: item.product_id,
      productName: item.product_name,
      description: item.description,
      price: parseFloat(item.price) || 0,
      quantity: item.quantity || 0,
      listingType: item.listing_type,
      status: item.status,
      viewCount: item.view_count || 0,
      favoriteCount: item.favorite_count || 0,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      seller: {
        userId: item.seller_id,
        username: item.seller_username,
        firstName: item.seller_first_name,
        lastName: item.seller_last_name,
      },
      category: {
        categoryId: item.category_id,
        categoryName: item.category_name,
      },
      imageUrls: item.image_urls || [],
    }));
  } catch (error: any) {
    console.error('Analytics: Error fetching active products:', error);
    throw new Error(error.message || 'Failed to fetch active products');
  }
}

// ============================================================================
// USER PROFILES - REGULAR VIEW
// ============================================================================

export async function getUserProfiles(limit: number = 50): Promise<UserProfile[]> {
  try {
    console.log(`📈 Analytics: Fetching ${limit} user profiles from vw_user_profiles...`);

    const { data, error } = await supabase
      .from('vw_user_profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Analytics Error:', error);
      throw error;
    }

    return (data || []).map((item: any) => ({
      userId: item.user_id,
      username: item.username,
      email: item.email,
      firstName: item.first_name,
      lastName: item.last_name,
      department: item.department,
      yearLevel: item.year_level,
      profilePicture: item.profile_picture,
      bio: item.bio,
      isAdmin: item.is_admin,
      walletAddress: item.wallet_address,
      isActive: item.is_active,
      isVerified: item.is_verified,
      createdAt: item.created_at,
      lastActiveAt: item.last_active_at,
      totalProductsPosted: item.total_products_posted || 0,
      totalProductsSold: item.total_products_sold || 0,
      totalOrdersAsBuyer: item.total_orders_as_buyer || 0,
      totalOrdersAsSeller: item.total_orders_as_seller || 0,
      totalRevenue: parseFloat(item.total_revenue) || 0,
      averageSellerRating: parseFloat(item.average_seller_rating) || 0,
      totalReviewsReceived: item.total_reviews_received || 0,
      profileViews: item.profile_views || 0,
      totalFavoritesReceived: item.total_favorites_received || 0,
    }));
  } catch (error: any) {
    console.error('Analytics: Error fetching user profiles:', error);
    throw new Error(error.message || 'Failed to fetch user profiles');
  }
}

// ============================================================================
// TRANSACTION DETAILS - REGULAR VIEW
// ============================================================================

export async function getTransactionDetails(limit: number = 50): Promise<TransactionDetail[]> {
  try {
    console.log(`📈 Analytics: Fetching ${limit} transaction details from vw_transaction_details...`);

    const { data, error } = await supabase
      .from('vw_transaction_details')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Analytics Error:', error);
      throw error;
    }

    return (data || []).map((item: any) => ({
      transactionId: item.transaction_id,
      buyerId: item.buyer_id,
      buyerName: `${item.buyer_first_name} ${item.buyer_last_name}`,
      sellerId: item.seller_id,
      sellerName: `${item.seller_first_name} ${item.seller_last_name}`,
      productId: item.product_id,
      productName: item.product_name,
      itemPrice: parseFloat(item.item_price) || 0,
      quantity: item.quantity || 1,
      totalAmount: parseFloat(item.total_amount) || 0,
      paymentMethod: item.payment_method,
      transactionStatus: item.transaction_status,
      blockchainTxHash: item.blockchain_tx_hash,
      isBlockchainPending: item.is_blockchain_pending,
      createdAt: item.created_at,
      completedAt: item.completed_at,
      reviewId: item.review_id,
      reviewRating: item.review_rating,
      reviewCreatedAt: item.review_created_at,
    }));
  } catch (error: any) {
    console.error('Analytics: Error fetching transaction details:', error);
    throw new Error(error.message || 'Failed to fetch transaction details');
  }
}

// ============================================================================
// SELLER PENDING ORDERS - REGULAR VIEW
// ============================================================================

export async function getSellerPendingOrders(sellerId?: string): Promise<SellerPendingOrder[]> {
  try {
    console.log('📈 Analytics: Fetching pending orders from vw_seller_pending_orders...');

    let query = supabase
      .from('vw_seller_pending_orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (sellerId) {
      query = query.eq('seller_id', sellerId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Analytics Error:', error);
      throw error;
    }

    return (data || []).map((item: any) => ({
      orderId: item.order_id,
      buyerId: item.buyer_id,
      buyerName: `${item.buyer_first_name} ${item.buyer_last_name}`,
      buyerUsername: item.buyer_username,
      productId: item.product_id,
      productName: item.product_name,
      productPrice: parseFloat(item.product_price) || 0,
      quantity: item.quantity || 1,
      listingType: item.listing_type,
      orderStatus: item.order_status,
      createdAt: item.created_at,
      serviceDuration: item.service_duration,
    }));
  } catch (error: any) {
    console.error('Analytics: Error fetching pending orders:', error);
    throw new Error(error.message || 'Failed to fetch pending orders');
  }
}

// ============================================================================
// USER WISHLIST - REGULAR VIEW
// ============================================================================

export async function getUserWishlist(userId: string): Promise<UserWishlistItem[]> {
  try {
    console.log(`📈 Analytics: Fetching wishlist for user ${userId} from vw_user_wishlist...`);

    const { data, error } = await supabase
      .from('vw_user_wishlist')
      .select('*')
      .eq('user_id', userId)
      .order('added_at', { ascending: false });

    if (error) {
      console.error('Analytics Error:', error);
      throw error;
    }

    return (data || []).map((item: any) => ({
      favoriteId: item.favorite_id,
      userId: item.user_id,
      productId: item.product_id,
      productName: item.product_name,
      price: parseFloat(item.price) || 0,
      viewCount: item.view_count || 0,
      favoriteCount: item.favorite_count || 0,
      sellerUsername: item.seller_username,
      categoryName: item.category_name,
      primaryImage: item.primary_image,
      addedAt: item.added_at,
    }));
  } catch (error: any) {
    console.error('Analytics: Error fetching user wishlist:', error);
    throw new Error(error.message || 'Failed to fetch user wishlist');
  }
}

// ============================================================================
// RECENT REVIEWS - REGULAR VIEW
// ============================================================================

export async function getRecentReviews(limit: number = 50): Promise<RecentReview[]> {
  try {
    console.log(`📈 Analytics: Fetching ${limit} recent reviews from vw_recent_reviews...`);

    const { data, error } = await supabase
      .from('vw_recent_reviews')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Analytics Error:', error);
      throw error;
    }

    return (data || []).map((item: any) => ({
      reviewId: item.review_id,
      rating: item.rating,
      reviewText: item.review_text,
      response: item.response,
      respondedAt: item.responded_at,
      createdAt: item.created_at,
      reviewerId: item.reviewer_id,
      reviewerUsername: item.reviewer_username,
      reviewerName: `${item.reviewer_first_name} ${item.reviewer_last_name}`,
      reviewerPicture: item.reviewer_picture,
      sellerId: item.seller_id,
      sellerUsername: item.seller_username,
      sellerName: `${item.seller_first_name} ${item.seller_last_name}`,
      sellerPicture: item.seller_picture,
      productId: item.product_id,
      productName: item.product_name,
      transactionId: item.transaction_id,
      transactionStatus: item.transaction_status,
      transactionCompletedAt: item.transaction_completed_at,
    }));
  } catch (error: any) {
    console.error('Analytics: Error fetching recent reviews:', error);
    throw new Error(error.message || 'Failed to fetch recent reviews');
  }
}

// ============================================================================
// ANALYTICS EVENTS - BEHAVIOR TRACKING
// ============================================================================

export async function getAnalyticsEvents(
  eventType?: string,
  limit: number = 100
): Promise<AnalyticsEvent[]> {
  try {
    console.log(`📈 Analytics: Fetching ${limit} analytics events...`);

    let query = supabase
      .from('analytics_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (eventType) {
      query = query.eq('event_type', eventType);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Analytics Error:', error);
      throw error;
    }

    return (data || []).map((item: any) => ({
      eventId: item.event_id,
      eventType: item.event_type,
      userId: item.user_id,
      productId: item.product_id,
      categoryId: item.category_id,
      sessionId: item.session_id,
      metadata: item.metadata || {},
      createdAt: item.created_at,
    }));
  } catch (error: any) {
    console.error('Analytics: Error fetching analytics events:', error);
    throw new Error(error.message || 'Failed to fetch analytics events');
  }
}

// ============================================================================
// DAILY ANALYTICS SNAPSHOTS
// ============================================================================

export async function getDailySnapshots(days: number = 30): Promise<DailySnapshot[]> {
  try {
    console.log(`📈 Analytics: Fetching last ${days} days of snapshots...`);

    const { data, error } = await supabase
      .from('analytics_snapshots')
      .select('*')
      .gte('snapshot_date', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
      .order('snapshot_date', { ascending: false });

    if (error) {
      console.error('Analytics Error:', error);
      throw error;
    }

    return (data || []).map((item: any) => ({
      snapshotId: item.snapshot_id,
      snapshotDate: item.snapshot_date,
      totalUsers: item.total_users || 0,
      activeUsers: item.active_users || 0,
      newUsers: item.new_users || 0,
      totalProducts: item.total_products || 0,
      newProducts: item.new_products || 0,
      totalTransactions: item.total_transactions || 0,
      completedTransactions: item.completed_transactions || 0,
      dailyRevenue: parseFloat(item.daily_revenue) || 0,
      averageTxValue: parseFloat(item.average_tx_value) || 0,
      topCategoryId: item.top_category_id,
    }));
  } catch (error: any) {
    console.error('Analytics: Error fetching daily snapshots:', error);
    throw new Error(error.message || 'Failed to fetch daily snapshots');
  }
}

// ============================================================================
// REFRESH MATERIALIZED VIEWS
// ============================================================================

export async function refreshMaterializedViews(): Promise<void> {
  try {
    console.log('🔄 Analytics: Refreshing all materialized views...');

    const views = [
      'mv_category_performance',
      'mv_top_sellers',
      'mv_trending_products',
    ];

    for (const view of views) {
      try {
        await supabase.rpc(`refresh_${view}`);
        console.log(`✅ Refreshed ${view}`);
      } catch (err) {
        console.warn(`⚠️ Could not refresh ${view}, it may be refreshing automatically`);
      }
    }

    console.log('✅ Materialized views refresh completed');
  } catch (error: any) {
    console.error('Analytics: Error refreshing materialized views:', error);
    throw new Error(error.message || 'Failed to refresh materialized views');
  }
}

// ============================================================================
// RECENT ORDERS - REGULAR VIEW
// ============================================================================

export async function getRecentOrders(limit: number = 50): Promise<RecentOrder[]> {
  try {
    console.log(`📈 Analytics: Fetching ${limit} recent orders from vw_admin_recent_orders...`);

    const { data, error } = await supabase
      .from('vw_admin_recent_orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Analytics Error:', error);
      throw error;
    }

    return (data || []).map((item: any) => ({
      transactionId: item.transaction_id,
      orderId: item.order_id,
      createdAt: item.created_at,
      transactionStatus: item.transaction_status,
      itemName: item.item_name,
      itemPrice: parseFloat(item.item_price) || 0,
      quantity: item.quantity || 1,
      buyerName: item.buyer_name,
      sellerName: item.seller_name,
      productName: item.product_name,
      categoryName: item.category_name,
      statusLabel: item.status_label,
      hoursSinceCreated: parseFloat(item.hours_since_created) || 0,
    }));
  } catch (error: any) {
    console.error('Analytics: Error fetching recent orders:', error);
    throw new Error(error.message || 'Failed to fetch recent orders');
  }
}

// ============================================================================
// RECENT ACTIVITY - REGULAR VIEW
// ============================================================================

export async function getRecentActivity(limit: number = 50): Promise<RecentActivity[]> {
  try {
    console.log(`📈 Analytics: Fetching ${limit} recent activity from vw_user_recent_activity...`);

    const { data, error } = await supabase
      .from('vw_user_recent_activity')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Analytics Error:', error);
      throw error;
    }

    return (data || []).map((item: any) => ({
      userId: item.user_id,
      activityType: item.activity_type,
      activityDescription: item.activity_description,
      entityType: item.entity_type,
      entityId: item.entity_id,
      createdAt: item.created_at,
      activityLabel: item.activity_label,
    }));
  } catch (error: any) {
    console.error('Analytics: Error fetching recent activity:', error);
    throw new Error(error.message || 'Failed to fetch recent activity');
  }
}

// ============================================================================
// ORDER SUMMARY BY STATUS
// ============================================================================

export async function getOrderSummary(): Promise<OrderSummary[]> {
  try {
    console.log('📈 Analytics: Fetching order summary by status...');

    const { data, error } = await supabase
      .from('transactions')
      .select('transaction_status, item_price')
      .order('transaction_status');

    if (error) {
      console.error('Analytics Error:', error);
      throw error;
    }

    // Group by status
    const summaryMap = new Map<string, { count: number; totalAmount: number }>();

    (data || []).forEach((item: any) => {
      const status = item.transaction_status || 'UNKNOWN';
      const price = parseFloat(item.item_price) || 0;

      if (!summaryMap.has(status)) {
        summaryMap.set(status, { count: 0, totalAmount: 0 });
      }

      const current = summaryMap.get(status)!;
      current.count += 1;
      current.totalAmount += price;
    });

    return Array.from(summaryMap.entries()).map(([status, stats]) => ({
      status,
      count: stats.count,
      totalAmount: stats.totalAmount,
    }));
  } catch (error: any) {
    console.error('Analytics: Error fetching order summary:', error);
    throw new Error(error.message || 'Failed to fetch order summary');
  }
}

// ============================================================================
// TOP CATEGORIES STATISTICS SERVICE
// ============================================================================

export async function getTopCategoriesStats(limit: number = 15): Promise<TopCategoryStats[]> {
  try {
    console.log(`📊 Analytics: Fetching top categories from vw_admin_top_categories (limit: ${limit})...`);

    const { data, error } = await supabase
      .from('vw_admin_top_categories')
      .select(`
        category_id,
        category_name,
        icon_name,
        total_products,
        unique_sellers,
        total_transactions,
        completed_transactions,
        total_revenue,
        avg_transaction_value,
        total_views,
        total_favorites,
        conversion_rate,
        revenue_share_percent
      `)
      .order('total_revenue', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Analytics Error:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      console.log('Analytics: No category stats found');
      return [];
    }

    return data.map(stat => ({
      categoryId: stat.category_id || 0,
      categoryName: stat.category_name || 'Unknown',
      iconName: stat.icon_name || '📦',
      totalProducts: stat.total_products || 0,
      uniqueSellers: stat.unique_sellers || 0,
      totalTransactions: stat.total_transactions || 0,
      completedTransactions: stat.completed_transactions || 0,
      totalRevenue: parseFloat(stat.total_revenue) || 0,
      avgTransactionValue: parseFloat(stat.avg_transaction_value) || 0,
      totalViews: stat.total_views || 0,
      totalFavorites: stat.total_favorites || 0,
      conversionRate: parseFloat(stat.conversion_rate) || 0,
      revenueSharePercent: parseFloat(stat.revenue_share_percent) || 0,
    }));
  } catch (error: any) {
    console.error('Analytics: Error fetching top categories stats:', error);
    throw new Error(error.message || 'Failed to fetch top categories stats');
  }
}

// ============================================================================
// DAILY REVENUE VIEW
// ============================================================================

export async function getDailyRevenue(days: number = 30): Promise<Array<{ date: string; dateLabel: string; revenue: number; completedTransactions: number; uniqueBuyers: number; uniqueSellers: number }>> {
  try {
    console.log(`📊 Analytics: Fetching daily revenue for last ${days} days from vw_admin_daily_revenue...`);

    const { data, error } = await supabase
      .from('vw_admin_daily_revenue')
      .select('*')
      .order('date', { ascending: false })
      .limit(days);

    if (error) {
      console.error('Analytics: Error fetching daily revenue:', error);
      throw error;
    }

    return (data || []).map((item: any) => ({
      date: item.date,
      dateLabel: item.date_label,
      revenue: parseFloat(item.revenue) || 0,
      completedTransactions: item.completed_transactions || 0,
      uniqueBuyers: item.unique_buyers || 0,
      uniqueSellers: item.unique_sellers || 0
    }));
  } catch (error: any) {
    console.error('Analytics: Error fetching daily revenue:', error);
    throw new Error(error.message || 'Failed to fetch daily revenue');
  }
}

// ============================================================================
// EXPORT ALL ANALYTICS DATA FOR ADMIN
// ============================================================================

export async function getAllAdminAnalytics() {
  try {
    console.log('📊 Analytics: Fetching complete admin analytics...');

    const [
      stats,
      categories,
      topSellers,
      trendingProducts,
      activeProducts,
      userProfiles,
      transactions,
      recentReviews,
      dailySnapshots,
    ] = await Promise.all([
      getDashboardStats(),
      getCategoryPerformance(),
      getTopSellers(20),
      getTrendingProducts(20),
      getActiveProducts(50),
      getUserProfiles(50),
      getTransactionDetails(50),
      getRecentReviews(50),
      getDailySnapshots(30),
    ]);

    return {
      stats,
      categories,
      topSellers,
      trendingProducts,
      activeProducts,
      userProfiles,
      transactions,
      recentReviews,
      dailySnapshots,
      lastFetch: new Date().toISOString(),
    };
  } catch (error: any) {
    console.error('Analytics: Error fetching all admin analytics:', error);
    throw new Error(error.message || 'Failed to fetch all admin analytics');
  }
}

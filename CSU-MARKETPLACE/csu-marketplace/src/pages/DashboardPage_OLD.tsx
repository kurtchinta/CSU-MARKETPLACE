import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { userAnalytics } from '../services/userAnalyticsService';
import type { 
  UserDashboardStats, 
  UserOrderHistory, 
  UserSalesHistory, 
  UserRecentActivity, 
  UserCategoryBreakdown, 
  UserMonthlyRevenue, 
  UserReviewSummary 
} from '../services/userAnalyticsService';
import { supabase } from '../lib/supabase';
import { 
  TrendingUp, 
  Package, 
  ShoppingCart, 
  DollarSign, 
  Eye, 
  Star, 
  Activity,
  Users,
  BarChart3,
  AlertCircle,
  ArrowUp
} from 'lucide-react';

interface SellerPerformanceScorecard {
  user_id: string;
  username: string;
  full_name: string;
  total_products_sold: number;
  total_revenue: number;
  average_seller_rating: number;
  total_reviews_received: number;
  active_listings: number;
  avg_completion_hours: number;
  sales_last_30d: number;
  seller_tier: string;
  revenue_percentile: number;
  rating_percentile: number;
}

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const [stats, setStats] = useState<UserDashboardStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<UserOrderHistory[]>([]);
  const [recentSales, setRecentSales] = useState<UserSalesHistory[]>([]);
  const [recentActivity, setRecentActivity] = useState<UserRecentActivity[]>([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState<UserCategoryBreakdown[]>([]);
  const [monthlyRevenue, setMonthlyRevenue] = useState<UserMonthlyRevenue[]>([]);
  const [recentReviews, setRecentReviews] = useState<UserReviewSummary[]>([]);
  const [sellerPerformance, setSellerPerformance] = useState<SellerPerformanceScorecard | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'sales' | 'orders' | 'reviews'>('overview');

  // BLOCK ADMINS - Don't render anything for admins
  const isAdmin = profile?.role_id === 1 || profile?.is_admin === true;
  if (isAdmin) {
    navigate('/admin', { replace: true });
    return null;
  }

  useEffect(() => {
    const loadDashboardData = async () => {
      if (!user?.id) {
        console.log('⏳ Waiting for user ID...');
        return;
      }

      try {
        setLoading(true);
        console.log('📊 Loading comprehensive dashboard data for user:', user.id);

        // Load all data in parallel
        const [
          statsData,
          ordersData,
          salesData,
          activityData,
          categoryData,
          revenueData,
          reviewsData
        ] = await Promise.all([
          userAnalytics.getDashboardStats(user.id),
          userAnalytics.getRecentOrders(user.id, 10),
          userAnalytics.getRecentSales(user.id, 10),
          userAnalytics.getRecentActivity(user.id, 15),
          userAnalytics.getCategoryBreakdown(user.id),
          userAnalytics.getMonthlyRevenue(user.id),
          userAnalytics.getRecentReviews(user.id, 5)
        ]);

        setStats(statsData);
        setRecentOrders(ordersData);
        setRecentSales(salesData);
        setRecentActivity(activityData);
        setCategoryBreakdown(categoryData);
        setMonthlyRevenue(revenueData);
        setRecentReviews(reviewsData);

        // Load seller performance scorecard from materialized view
        if (supabase) {
          const { data: performanceData } = await supabase
            .from('mv_seller_performance_scorecard')
            .select('*')
            .eq('user_id', user.id)
            .single();
          
          if (performanceData) {
            setSellerPerformance(performanceData);
          }
        }

        console.log('✅ Dashboard data loaded successfully');
      } catch (error) {
        console.error('❌ Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [user?.id]);

  // Format currency
  const formatCurrency = (amount: number) => `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

  // Format date
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  // Format time ago
  const timeAgo = (dateString: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(dateString).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Activity className="w-16 h-16 mx-auto mb-4 text-green-600 animate-spin" />
          <p className="text-gray-600 font-medium text-lg">Loading Your Dashboard...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
          <p className="text-gray-600 font-medium">Failed to load dashboard data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="shadow-2xl" style={{ backgroundColor: '#208756' }}>
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-black text-white">
                Welcome back, {profile?.first_name}! 👋
              </h1>
              <p className="text-white/90 mt-1">Here's what's happening with your marketplace</p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition-all flex items-center gap-2"
            >
              <Activity className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Listings */}
          <div className="bg-white rounded-xl p-6 shadow-sm border-l-4 hover:shadow-lg transition-shadow" style={{ borderColor: '#219343' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#219343' }}>
                <Package className="w-6 h-6 text-white" />
              </div>
              {stats.newListingsToday > 0 && (
                <div className="flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full bg-green-100 text-green-700">
                  <ArrowUp className="w-3 h-3" />
                  {stats.newListingsToday} new
                </div>
              )}
            </div>
            <p className="text-sm font-medium text-gray-600 mb-1">Total Listings</p>
            <p className="text-3xl font-bold text-gray-900">{stats.totalListings}</p>
            <p className="text-xs text-gray-500 mt-2">
              {stats.activeListings} active • {stats.pendingListings} pending • {stats.rejectedListings} rejected
            </p>
          </div>

          {/* Total Orders */}
          <div className="bg-white rounded-xl p-6 shadow-sm border-l-4 border-blue-500 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <ShoppingCart className="w-6 h-6 text-white" />
              </div>
              {stats.newOrdersToday > 0 && (
                <div className="flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                  <ArrowUp className="w-3 h-3" />
                  {stats.newOrdersToday} new
                </div>
              )}
            </div>
            <p className="text-sm font-medium text-gray-600 mb-1">Total Orders</p>
            <p className="text-3xl font-bold text-gray-900">{stats.totalOrders}</p>
            <p className="text-xs text-gray-500 mt-2">
              {stats.completedOrders} completed • {stats.pendingOrders} pending
            </p>
          </div>

          {/* Total Earned */}
          <div className="bg-white rounded-xl p-6 shadow-sm border-l-4 hover:shadow-lg transition-shadow" style={{ borderColor: '#FFCF50' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#FFCF50' }}>
                <TrendingUp className="w-6 h-6" style={{ color: '#219343' }} />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-600 mb-1">Total Earned</p>
            <p className="text-3xl font-bold" style={{ color: '#219343' }}>{formatCurrency(stats.totalEarned)}</p>
            <p className="text-xs text-gray-500 mt-2">From {recentSales.length} sales</p>
          </div>

          {/* Total Spent */}
          <div className="bg-white rounded-xl p-6 shadow-sm border-l-4 hover:shadow-lg transition-shadow" style={{ borderColor: '#FF7F1C' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#FF7F1C' }}>
                <DollarSign className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-600 mb-1">Total Spent</p>
            <p className="text-3xl font-bold text-gray-900">{formatCurrency(stats.totalSpent)}</p>
            <p className="text-xs text-gray-500 mt-2">
              Avg: {formatCurrency(stats.averageOrderValue)} per order
            </p>
          </div>
        </div>

        {/* Secondary Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                <Eye className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Views</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalViews.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-yellow-500 to-yellow-600 flex items-center justify-center">
                <Star className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Average Rating</p>
                <p className="text-2xl font-bold text-gray-900 flex items-center gap-1">
                  <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                  {stats.averageRating.toFixed(1)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-pink-500 to-pink-600 flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Reviews</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalReviews}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 border-b border-gray-200 bg-white rounded-t-xl px-6 pt-4 shadow-sm">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'sales', label: 'Sales', icon: TrendingUp },
            { id: 'orders', label: 'Orders', icon: ShoppingCart },
            { id: 'reviews', label: 'Reviews', icon: Star }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-6 py-3 font-medium transition-colors border-b-2 flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'text-white'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
                style={activeTab === tab.id ? {
                  borderColor: '#219343',
                  color: '#219343'
                } : {}}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-b-xl shadow-sm p-6">
          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Sales Trend Chart */}
              {monthlyRevenue.length > 0 && (
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Your Sales</h3>
                      <div className="flex items-center gap-4 mt-2">
                        <button className="text-sm font-semibold px-3 py-1 rounded-lg" style={{ backgroundColor: '#f0f8f6', color: '#208756' }}>
                          Day
                        </button>
                        <button className="text-sm text-gray-500 hover:text-gray-700">Week</button>
                        <button className="text-sm text-gray-500 hover:text-gray-700">Month</button>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold" style={{ color: '#208756' }}>
                        {formatCurrency(monthlyRevenue.reduce((sum, r) => sum + r.revenue, 0))}
                      </p>
                      <p className="text-sm text-gray-500">Total Income</p>
                    </div>
                  </div>

                  {/* Chart */}
                  <div className="relative h-48">
                    <svg className="w-full h-full" viewBox="0 0 800 200" preserveAspectRatio="none">
                      {/* Grid lines */}
                      <line x1="0" y1="50" x2="800" y2="50" stroke="#f0f0f0" strokeWidth="1" />
                      <line x1="0" y1="100" x2="800" y2="100" stroke="#f0f0f0" strokeWidth="1" />
                      <line x1="0" y1="150" x2="800" y2="150" stroke="#f0f0f0" strokeWidth="1" />

                      {/* Sales curve */}
                      {(() => {
                        const maxRevenue = Math.max(...monthlyRevenue.map(r => r.revenue), 1);
                        const points = monthlyRevenue.map((revenue, index) => {
                          const x = (index / (monthlyRevenue.length - 1)) * 800;
                          const y = 180 - ((revenue.revenue / maxRevenue) * 160);
                          return `${x},${y}`;
                        }).join(' ');
                        
                        return (
                          <>
                            {/* Area fill */}
                            <polygon
                              points={`0,200 ${points} 800,200`}
                              fill="url(#salesGradient)"
                              opacity="0.3"
                            />
                            {/* Line */}
                            <polyline
                              points={points}
                              fill="none"
                              stroke="#208756"
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            {/* Data points */}
                            {monthlyRevenue.map((revenue, index) => {
                              const x = (index / (monthlyRevenue.length - 1)) * 800;
                              const y = 180 - ((revenue.revenue / maxRevenue) * 160);
                              return (
                                <circle
                                  key={index}
                                  cx={x}
                                  cy={y}
                                  r="4"
                                  fill="white"
                                  stroke="#208756"
                                  strokeWidth="2"
                                />
                              );
                            })}
                          </>
                        );
                      })()}

                      {/* Gradient definition */}
                      <defs>
                        <linearGradient id="salesGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#208756" stopOpacity="0.8" />
                          <stop offset="100%" stopColor="#208756" stopOpacity="0.1" />
                        </linearGradient>
                      </defs>
                    </svg>

                    {/* Peak indicator */}
                    {(() => {
                      const maxRevenue = Math.max(...monthlyRevenue.map(r => r.revenue));
                      const peakIndex = monthlyRevenue.findIndex(r => r.revenue === maxRevenue);
                      if (peakIndex !== -1) {
                        const peakMonth = monthlyRevenue[peakIndex];
                        return (
                          <div 
                            className="absolute bg-white rounded-lg shadow-lg px-3 py-2 border border-gray-200"
                            style={{
                              left: `${(peakIndex / (monthlyRevenue.length - 1)) * 100}%`,
                              top: '20%',
                              transform: 'translateX(-50%)'
                            }}
                          >
                            <p className="text-xs text-gray-600">{peakMonth.month}</p>
                            <p className="text-sm font-bold" style={{ color: '#208756' }}>
                              {formatCurrency(peakMonth.revenue)}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>

                  {/* Month labels */}
                  <div className="flex justify-between mt-4 text-xs text-gray-500 px-2">
                    {monthlyRevenue.map((revenue, index) => (
                      <span key={index}>{revenue.month.substring(0, 3)}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Activity */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Activity</h3>
                <div className="space-y-3">
                  {recentActivity.length === 0 ? (
                    <p className="text-center py-8 text-gray-500">No recent activity</p>
                  ) : (
                    recentActivity.slice(0, 8).map((activity, index) => (
                      <div key={index} className="flex items-start gap-3 pb-3 border-b border-gray-100 last:border-0">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#f0f8f6' }}>
                          {activity.activityType === 'product_created' && <Package className="w-4 h-4" style={{ color: '#208756' }} />}
                          {activity.activityType === 'listing_created' && <Package className="w-4 h-4" style={{ color: '#208756' }} />}
                          {activity.activityType === 'order_placed' && <ShoppingCart className="w-4 h-4" style={{ color: '#208756' }} />}
                          {activity.activityType === 'order_received' && <TrendingUp className="w-4 h-4" style={{ color: '#208756' }} />}
                          {activity.activityType === 'review_received' && <Star className="w-4 h-4" style={{ color: '#208756' }} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900">{activity.description}</p>
                          <p className="text-xs text-gray-500 mt-1">{timeAgo(activity.timestamp)}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Seller Performance */}
              {sellerPerformance && (
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Seller Performance</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 rounded-lg" style={{ backgroundColor: '#f0f8f6' }}>
                      <p className="text-2xl font-bold" style={{ color: '#208756' }}>{sellerPerformance.total_products_sold}</p>
                      <p className="text-xs text-gray-600 mt-1">Products Sold</p>
                    </div>
                    <div className="text-center p-4 rounded-lg" style={{ backgroundColor: '#f0f8f6' }}>
                      <p className="text-2xl font-bold" style={{ color: '#208756' }}>{formatCurrency(sellerPerformance.total_revenue)}</p>
                      <p className="text-xs text-gray-600 mt-1">Total Revenue</p>
                    </div>
                    <div className="text-center p-4 rounded-lg" style={{ backgroundColor: '#f0f8f6' }}>
                      <p className="text-2xl font-bold" style={{ color: '#208756' }}>{sellerPerformance.average_seller_rating.toFixed(1)} ⭐</p>
                      <p className="text-xs text-gray-600 mt-1">Avg Rating</p>
                    </div>
                    <div className="text-center p-4 rounded-lg" style={{ backgroundColor: '#f0f8f6' }}>
                      <p className="text-2xl font-bold" style={{ color: '#208756' }}>{sellerPerformance.seller_tier}</p>
                      <p className="text-xs text-gray-600 mt-1">Seller Tier</p>
                    </div>
                  </div>
                  <div className="mt-4 p-4 rounded-lg bg-gray-50">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Revenue Percentile:</span>
                      <span className="font-bold" style={{ color: '#208756' }}>{(sellerPerformance.revenue_percentile * 100).toFixed(0)}%</span>
                    </div>
                    <div className="flex items-center justify-between text-sm mt-2">
                      <span className="text-gray-600">Rating Percentile:</span>
                      <span className="font-bold" style={{ color: '#208756' }}>{(sellerPerformance.rating_percentile * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Category Breakdown */}
              {categoryBreakdown.length > 0 && (
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Sales by Category</h3>
                  <div className="space-y-3">
                    {categoryBreakdown.slice(0, 5).map((category, index) => (
                      <div key={index}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">{category.categoryName}</span>
                          <span className="text-sm font-bold" style={{ color: '#208756' }}>{formatCurrency(category.totalRevenue)}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="h-2 rounded-full transition-all"
                            style={{ 
                              backgroundColor: '#208756',
                              width: `${(category.totalRevenue / categoryBreakdown[0].totalRevenue) * 100}%`
                            }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{category.productCount} products</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SALES TAB */}
          {activeTab === 'sales' && (
            <div className="space-y-6">
              {/* Monthly Revenue Chart */}
              {monthlyRevenue.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-500" />
                    Revenue Trend (Last 6 Months)
                  </h3>
                  <div className="space-y-3">
                    {monthlyRevenue.map((month, idx) => {
                      const maxRevenue = Math.max(...monthlyRevenue.map(m => m.revenue), 1);
                      const widthPercent = (month.revenue / maxRevenue) * 100;
                      return (
                        <div key={idx} className="flex items-center gap-4">
                          <div className="w-24 text-sm font-medium text-gray-700">{month.month}</div>
                          <div className="flex-1 bg-gray-100 rounded-full h-10 relative overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500 flex items-center justify-between px-4"
                              style={{
                                width: `${widthPercent}%`,
                                background: 'linear-gradient(to right, #219343, #42D674)'
                              }}
                            >
                              <span className="text-xs font-bold text-white">{formatCurrency(month.revenue)}</span>
                              <span className="text-xs font-medium text-white">{month.orderCount} orders</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Recent Sales */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-green-500" />
                  Recent Sales ({recentSales.length})
                </h3>
                {recentSales.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <DollarSign className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-gray-600">No sales yet</p>
                    <p className="text-sm text-gray-500 mt-1">Your sales will appear here when customers buy your products</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentSales.map(sale => (
                      <div key={sale.orderId} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        {sale.imageUrl ? (
                          <img src={sale.imageUrl} alt={sale.productName} className="w-16 h-16 object-cover rounded-lg" />
                        ) : (
                          <div className="w-16 h-16 bg-gray-300 rounded-lg flex items-center justify-center">
                            <Package className="w-8 h-8 text-gray-500" />
                          </div>
                        )}
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">{sale.productName}</p>
                          <p className="text-sm text-gray-600">Buyer: {sale.buyerName}</p>
                          <p className="text-xs text-gray-500 mt-1">{formatDate(sale.orderDate)}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold" style={{ color: '#219343' }}>{formatCurrency(sale.amount)}</p>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            sale.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                            sale.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                            sale.status === 'ACCEPTED' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {sale.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ORDERS TAB */}
          {activeTab === 'orders' && (
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-blue-500" />
                My Orders ({recentOrders.length})
              </h3>
              {recentOrders.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <ShoppingCart className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-gray-600">No orders yet</p>
                  <button
                    onClick={() => navigate('/browse')}
                    className="mt-4 px-4 py-2 rounded-lg font-medium text-white"
                    style={{ backgroundColor: '#219343' }}
                  >
                    Start Shopping
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentOrders.map(order => (
                    <div key={order.orderId} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      {order.imageUrl ? (
                        <img src={order.imageUrl} alt={order.productName} className="w-16 h-16 object-cover rounded-lg" />
                      ) : (
                        <div className="w-16 h-16 bg-gray-300 rounded-lg flex items-center justify-center">
                          <Package className="w-8 h-8 text-gray-500" />
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{order.productName}</p>
                        <p className="text-sm text-gray-600">Seller: {order.sellerName}</p>
                        <p className="text-xs text-gray-500 mt-1">{formatDate(order.orderDate)}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900">{formatCurrency(order.amount)}</p>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          order.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                          order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                          order.status === 'ACCEPTED' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {order.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* REVIEWS TAB */}
          {activeTab === 'reviews' && (
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500" />
                Recent Reviews ({recentReviews.length})
              </h3>
              {recentReviews.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <Star className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-gray-600">No reviews yet</p>
                  <p className="text-sm text-gray-500 mt-1">Reviews from customers will appear here</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentReviews.map(review => (
                    <div key={review.reviewId} className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold text-gray-900">{review.productName}</p>
                          <p className="text-sm text-gray-600">{review.reviewerName}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map(star => (
                            <Star
                              key={star}
                              className={`w-4 h-4 ${
                                star <= review.rating
                                  ? 'text-yellow-400 fill-yellow-400'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      {review.comment && (
                        <p className="text-gray-700 text-sm mb-2">{review.comment}</p>
                      )}
                      <p className="text-xs text-gray-500">{formatDate(review.createdAt)}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;

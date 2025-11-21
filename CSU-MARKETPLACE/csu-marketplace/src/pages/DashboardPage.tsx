import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { 
  Package, ShoppingCart, TrendingUp, Star, Activity, AlertCircle, 
  DollarSign, ArrowUp, Users,
  MapPin, FileText, Clock, Award, BarChart3, PieChart
} from 'lucide-react';

// CSU Green Theme Colors
const CSU_GREEN = '#208756';
const CSU_GREEN_LIGHT = '#f0f8f5';

// Chart Colors (matching reference design)
const CHART_COLORS = ['#208756', '#FFCF50', '#4285F4', '#FF7F1C', '#34A853', '#EA4335', '#9C27B0', '#00BCD4'];

// Database View Interfaces
interface DashboardOverview {
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

interface MonthlyRevenue {
  user_id: string;
  month: string;
  month_label: string;
  transaction_count: number;
  monthly_revenue: number;
  avg_transaction_value: number;
}

interface CategoryRevenue {
  user_id: string;
  category_name: string;
  product_count: number;
  category_revenue: number;
  sales_count: number;
}

interface RecentActivity {
  activity_id: number;
  user_id: string;
  activity_type: string;
  description: string;
  timestamp: string;
  related_id: number;
}

interface SalesPerformance {
  user_id: string;
  sale_date: string;
  week_start: string;
  month_start: string;
  daily_sales_count: number;
  daily_revenue: number;
  weekly_sales_count: number;
  weekly_revenue: number;
  monthly_sales_count: number;
  monthly_revenue: number;
}

interface TopProduct {
  user_id: string;
  product_id: number;
  product_name: string;
  price: number;
  view_count: number;
  category_name: string;
  sales_count: number;
  total_revenue: number;
  favorite_count: number;
  avg_rating: number;
  review_count: number;
  image_url: string;
}

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { profile, user } = useAuth();

  useEffect(() => {
    document.title = 'Dashboard - CSU Marketplace';
  }, []);

  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [monthlyRevenue, setMonthlyRevenue] = useState<MonthlyRevenue[]>([]);
  const [categoryRevenue, setCategoryRevenue] = useState<CategoryRevenue[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [salesPerformance, setSalesPerformance] = useState<SalesPerformance[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [revenuePeriod, setRevenuePeriod] = useState<'daily' | 'weekly' | 'monthly'>('monthly');

  // Block admins
  const isAdmin = profile?.role_id === 1 || profile?.is_admin === true;
  if (isAdmin) {
    navigate('/admin', { replace: true });
    return null;
  }

  useEffect(() => {
    if (user?.id) {
      loadDashboardData();
    }
  }, [user?.id]);

  const loadDashboardData = async () => {
    if (!user?.id || !supabase) return;

    try {
      setLoading(true);
      console.log('📊 Loading comprehensive dashboard data for user:', user.id);

      // Load all views in parallel
      const [
        overviewData,
        monthlyData,
        categoryData,
        activityData,
        performanceData,
        topProductsData
      ] = await Promise.all([
        supabase.from('user_view_dashboard_overview').select('*').eq('user_id', user.id).single(),
        supabase.from('user_view_monthly_revenue').select('*').eq('user_id', user.id).order('month', { ascending: true }),
        supabase.from('user_view_category_revenue').select('*').eq('user_id', user.id).order('category_revenue', { ascending: false }).limit(6),
        supabase.from('user_view_recent_activity').select('*').eq('user_id', user.id).limit(10),
        supabase.from('user_view_sales_performance').select('*').eq('user_id', user.id).order('sale_date', { ascending: false }).limit(90),
        supabase.from('user_view_top_products').select('*').eq('user_id', user.id).limit(4)
      ]);

      if (overviewData.data) setOverview(overviewData.data);
      if (monthlyData.data) setMonthlyRevenue(monthlyData.data);
      if (categoryData.data) setCategoryRevenue(categoryData.data);
      if (activityData.data) setRecentActivity(activityData.data);
      if (performanceData.data) setSalesPerformance(performanceData.data);
      if (topProductsData.data) setTopProducts(topProductsData.data);

      console.log('✅ Dashboard data loaded successfully');
    } catch (error) {
      console.error('❌ Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getRevenueData = () => {
    if (revenuePeriod === 'daily') {
      return salesPerformance.slice(0, 7).reverse().map(p => ({
        label: new Date(p.sale_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        value: p.daily_revenue,
        count: p.daily_sales_count
      }));
    } else if (revenuePeriod === 'weekly') {
      const weeklyMap = new Map<string, { revenue: number; count: number }>();
      salesPerformance.slice(0, 56).forEach(p => {
        const key = p.week_start;
        const existing = weeklyMap.get(key) || { revenue: 0, count: 0 };
        weeklyMap.set(key, {
          revenue: existing.revenue + p.daily_revenue,
          count: existing.count + p.daily_sales_count
        });
      });
      return Array.from(weeklyMap.entries())
        .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
        .slice(-8)
        .map(([week, data]) => ({
          label: `W${new Date(week).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
          value: data.revenue,
          count: data.count
        }));
    } else {
      return monthlyRevenue.map(m => ({
        label: m.month_label.substring(0, 3),
        value: m.monthly_revenue,
        count: m.transaction_count
      }));
    }
  };

  const revenueData = getRevenueData();
  const maxRevenue = Math.max(...revenueData.map(d => d.value), 1);
  const totalCategoryRevenue = categoryRevenue.reduce((sum, c) => sum + c.category_revenue, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Activity className="w-16 h-16 mx-auto mb-4 animate-spin" style={{ color: CSU_GREEN }} />
          <p className="text-gray-600 font-medium text-lg">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
          <p className="text-gray-600 font-medium">Failed to load dashboard</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pb-12">
      <div className="max-w-[1600px] mx-auto px-6 py-8">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">Welcome back, {profile?.first_name}! 👋</h1>
          <p className="text-gray-600 mt-2 text-lg">Here's what's happening with your marketplace today</p>
        </div>

        {/* KPI Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Sales Card */}
          <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all border border-pink-200">
            <div className="flex items-center justify-between mb-4">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-pink-500 shadow-lg">
                <DollarSign className="w-7 h-7 text-white" />
              </div>
              <button className="px-3 py-1 bg-white rounded-lg text-xs font-semibold text-pink-600 shadow-sm">Export</button>
            </div>
            <h3 className="text-sm font-medium text-gray-600 mb-1">Total Sales</h3>
            <p className="text-3xl font-bold text-gray-900">{formatCurrency(overview.total_revenue)}</p>
            <p className="text-xs text-pink-600 mt-2 flex items-center gap-1">
              <ArrowUp className="w-3 h-3" />
              +{overview.sales_30d} from last month
            </p>
          </div>

          {/* Total Orders Card */}
          <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all border border-amber-200">
            <div className="flex items-center justify-between mb-4">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-amber-500 shadow-lg">
                <ShoppingCart className="w-7 h-7 text-white" />
              </div>
            </div>
            <h3 className="text-sm font-medium text-gray-600 mb-1">Total Orders</h3>
            <p className="text-3xl font-bold text-gray-900">{overview.total_orders_as_buyer}</p>
            <p className="text-xs text-amber-600 mt-2">+6% from yesterday</p>
          </div>

          {/* Products Sold Card */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all border border-green-200">
            <div className="flex items-center justify-between mb-4">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center shadow-lg" style={{ backgroundColor: CSU_GREEN }}>
                <Package className="w-7 h-7 text-white" />
              </div>
            </div>
            <h3 className="text-sm font-medium text-gray-600 mb-1">Products Sold</h3>
            <p className="text-3xl font-bold text-gray-900">{overview.total_products_sold}</p>
            <p className="text-xs mt-2" style={{ color: CSU_GREEN }}>+12% from yesterday</p>
          </div>

          {/* New Customers Card */}
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all border border-purple-200">
            <div className="flex items-center justify-between mb-4">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-purple-500 shadow-lg">
                <Users className="w-7 h-7 text-white" />
              </div>
            </div>
            <h3 className="text-sm font-medium text-gray-600 mb-1">Active Listings</h3>
            <p className="text-3xl font-bold text-gray-900">{overview.active_listings}</p>
            <p className="text-xs text-purple-600 mt-2">0.5% from yesterday</p>
          </div>
        </div>

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* LEFT: Revenue Chart (2/3 width) */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Your Sales</h3>
                <p className="text-sm text-gray-500 mt-1">Sales Summary</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setRevenuePeriod('daily')}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    revenuePeriod === 'daily' ? 'text-white shadow-md' : 'text-gray-600 bg-gray-100 hover:bg-gray-200'
                  }`}
                  style={revenuePeriod === 'daily' ? { backgroundColor: CSU_GREEN } : {}}
                >
                  Day
                </button>
                <button
                  onClick={() => setRevenuePeriod('weekly')}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    revenuePeriod === 'weekly' ? 'text-white shadow-md' : 'text-gray-600 bg-gray-100 hover:bg-gray-200'
                  }`}
                  style={revenuePeriod === 'weekly' ? { backgroundColor: CSU_GREEN } : {}}
                >
                  Week
                </button>
                <button
                  onClick={() => setRevenuePeriod('monthly')}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    revenuePeriod === 'monthly' ? 'text-white shadow-md' : 'text-gray-600 bg-gray-100 hover:bg-gray-200'
                  }`}
                  style={revenuePeriod === 'monthly' ? { backgroundColor: CSU_GREEN } : {}}
                >
                  Month
                </button>
              </div>
            </div>

            {/* Revenue Line Chart */}
            <div className="relative h-72">
              {revenueData.length > 0 ? (
                <svg className="w-full h-full" viewBox="0 0 800 300" preserveAspectRatio="none">
                  {/* Grid Lines */}
                  {[0, 1, 2, 3, 4].map(i => (
                    <line key={i} x1="0" y1={60 * i} x2="800" y2={60 * i} stroke="#f0f0f0" strokeWidth="1" />
                  ))}
                  
                  {/* Area Gradient Fill */}
                  <defs>
                    <linearGradient id="revenueGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor={CSU_GREEN} stopOpacity="0.3" />
                      <stop offset="100%" stopColor={CSU_GREEN} stopOpacity="0.05" />
                    </linearGradient>
                  </defs>

                  {(() => {
                    const points = revenueData.map((data, index) => {
                      const x = revenueData.length > 1 ? (index / (revenueData.length - 1)) * 800 : 400;
                      const y = 270 - ((data.value / maxRevenue) * 240);
                      return `${x},${y}`;
                    }).join(' ');
                    
                    return (
                      <>
                        <polygon points={`0,300 ${points} 800,300`} fill="url(#revenueGradient)" />
                        <polyline points={points} fill="none" stroke={CSU_GREEN} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                      </>
                    );
                  })()}

                  {/* Data Points */}
                  {revenueData.map((data, index) => {
                    const x = revenueData.length > 1 ? (index / (revenueData.length - 1)) * 800 : 400;
                    const y = 270 - ((data.value / maxRevenue) * 240);
                    const isMax = data.value === maxRevenue;
                    
                    return (
                      <g key={index}>
                        <circle cx={x} cy={y} r={isMax ? 7 : 5} fill="white" stroke={CSU_GREEN} strokeWidth="3" />
                        {isMax && (
                          <text x={x} y={y - 20} textAnchor="middle" fontSize="14" fill={CSU_GREEN} fontWeight="bold">
                            {formatCurrency(data.value)}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </svg>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <BarChart3 className="w-12 h-12 mb-2" />
                  <p>No sales data available</p>
                </div>
              )}
            </div>

            {/* X-Axis Labels */}
            <div className="flex justify-between mt-4 px-2">
              {revenueData.map((data, index) => (
                <span key={index} className="text-xs text-gray-500 font-medium">{data.label}</span>
              ))}
            </div>
          </div>

          {/* RIGHT: Visitor Insights */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Visitor Insights</h3>
            </div>

            {/* Multi-Line Chart */}
            <div className="relative h-48 mb-6">
              <svg className="w-full h-full" viewBox="0 0 400 200" preserveAspectRatio="none">
                {/* Grid */}
                {[0, 1, 2, 3].map(i => (
                  <line key={i} x1="0" y1={50 * i} x2="400" y2={50 * i} stroke="#f5f5f5" strokeWidth="1" />
                ))}

                {/* Loyal Customers Line (Green) */}
                <polyline
                  points="0,150 50,120 100,140 150,100 200,110 250,80 300,90 350,60 400,70"
                  fill="none"
                  stroke={CSU_GREEN}
                  strokeWidth="2"
                />

                {/* New Customers Line (Red) */}
                <polyline
                  points="0,180 50,160 100,170 150,140 200,150 250,120 300,130 350,100 400,110"
                  fill="none"
                  stroke="#FF6B6B"
                  strokeWidth="2"
                />

                {/* Unique Customers Line (Purple) */}
                <polyline
                  points="0,160 50,140 100,150 150,120 200,130 250,100 300,110 350,80 400,90"
                  fill="none"
                  stroke="#9C27B0"
                  strokeWidth="2"
                />
              </svg>
            </div>

            {/* Legend */}
            <div className="grid grid-cols-3 gap-2 text-xs mb-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CSU_GREEN }}></div>
                <span className="text-gray-600">Loyal</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-gray-600">New</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                <span className="text-gray-600">Unique</span>
              </div>
            </div>

            {/* Stats */}
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Total Views</span>
                <span className="text-lg font-bold text-gray-900">{overview.active_listings * 45}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">Favorites</span>
                <span className="text-lg font-bold text-gray-900">{overview.total_product_favorites}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Second Row - 3 Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Total Revenue Bar Chart */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-6">Total Revenue</h3>
            <div className="space-y-4">
              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day, index) => {
                const dayRevenue = salesPerformance[index]?.daily_revenue || 0;
                const percentage = maxRevenue > 0 ? (dayRevenue / maxRevenue) * 100 : 0;
                const isOnline = index % 2 === 0;
                
                return (
                  <div key={day}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-600">{day.substring(0, 3)}</span>
                      <span className="text-xs font-semibold text-gray-900">{formatCurrency(dayRevenue)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${percentage}%`,
                            backgroundColor: isOnline ? CSU_GREEN : '#FFB547'
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-4 mt-6 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CSU_GREEN }}></div>
                <span className="text-gray-600">Online Sales</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <span className="text-gray-600">Offline Sales</span>
              </div>
            </div>
          </div>

          {/* Customer Satisfaction */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-6">Customer Satisfaction</h3>
            <div className="relative h-48">
              <svg className="w-full h-full" viewBox="0 0 400 200" preserveAspectRatio="none">
                {/* Area fills */}
                <defs>
                  <linearGradient id="lastMonthGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#4285F4" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#4285F4" stopOpacity="0.05" />
                  </linearGradient>
                  <linearGradient id="thisMonthGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor={CSU_GREEN} stopOpacity="0.2" />
                    <stop offset="100%" stopColor={CSU_GREEN} stopOpacity="0.05" />
                  </linearGradient>
                </defs>

                {/* Last Month */}
                <polygon
                  points="0,200 0,120 50,110 100,115 150,105 200,110 250,100 300,105 350,95 400,100 400,200"
                  fill="url(#lastMonthGradient)"
                />
                <polyline
                  points="0,120 50,110 100,115 150,105 200,110 250,100 300,105 350,95 400,100"
                  fill="none"
                  stroke="#4285F4"
                  strokeWidth="2"
                />

                {/* This Month */}
                <polygon
                  points="0,200 0,100 50,90 100,95 150,85 200,90 250,80 300,85 350,75 400,80 400,200"
                  fill="url(#thisMonthGradient)"
                />
                <polyline
                  points="0,100 50,90 100,95 150,85 200,90 250,80 300,85 350,75 400,80"
                  fill="none"
                  stroke={CSU_GREEN}
                  strokeWidth="2"
                />
              </svg>
            </div>
            <div className="flex items-center justify-between mt-6">
              <div className="text-center">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span className="text-xs text-gray-600">Last Month</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(overview.revenue_30d * 0.8)}</p>
              </div>
              <div className="text-center">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CSU_GREEN }}></div>
                  <span className="text-xs text-gray-600">This Month</span>
                </div>
                <p className="text-2xl font-bold" style={{ color: CSU_GREEN }}>{formatCurrency(overview.revenue_30d)}</p>
              </div>
            </div>
          </div>

          {/* Target vs Reality */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-6">Target vs Reality</h3>
            <div className="relative h-48">
              {/* Bar Chart */}
              <div className="flex items-end justify-between h-full gap-2">
                {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month) => {
                  const realityHeight = Math.random() * 80 + 20;
                  const targetHeight = Math.random() * 80 + 20;
                  
                  return (
                    <div key={month} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full flex gap-0.5">
                        <div
                          className="flex-1 rounded-t transition-all hover:opacity-80"
                          style={{
                            height: `${realityHeight}px`,
                            backgroundColor: CSU_GREEN
                          }}
                        />
                        <div
                          className="flex-1 rounded-t transition-all hover:opacity-80"
                          style={{
                            height: `${targetHeight}px`,
                            backgroundColor: '#FFB547'
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center justify-between mt-6">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: CSU_GREEN_LIGHT }}>
                  <TrendingUp className="w-4 h-4" style={{ color: CSU_GREEN }} />
                </div>
                <div className="text-left">
                  <p className="text-xs text-gray-500">Reality Sales</p>
                  <p className="text-sm font-bold text-gray-900">{overview.total_products_sold}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-100">
                  <Award className="w-4 h-4 text-amber-600" />
                </div>
                <div className="text-left">
                  <p className="text-xs text-gray-500">Target Sales</p>
                  <p className="text-sm font-bold text-gray-900">{Math.round(overview.total_products_sold * 1.2)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Third Row - More Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Top Products */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900">Top Products</h3>
              <button
                onClick={() => navigate('/my-listings')}
                className="text-sm font-semibold px-3 py-1 rounded-lg hover:bg-gray-100 transition-colors"
                style={{ color: CSU_GREEN }}
              >
                See all
              </button>
            </div>
            <div className="space-y-4">
              {topProducts.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm text-gray-500">No products yet</p>
                </div>
              ) : (
                topProducts.map((product, index) => {
                  const percentage = totalCategoryRevenue > 0 ? (product.total_revenue / totalCategoryRevenue) * 100 : 0;
                  
                  return (
                    <div key={product.product_id} className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors" onClick={() => navigate(`/product/${product.product_id}`)}>
                      <span className="text-lg font-bold text-gray-400 w-8">{String(index + 1).padStart(2, '0')}</span>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900 truncate">{product.product_name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${percentage}%`,
                                backgroundColor: CHART_COLORS[index % CHART_COLORS.length]
                              }}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-900">{formatCurrency(product.total_revenue)}</p>
                        <p className="text-xs text-gray-500">{product.sales_count} sales</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Sales Mapping by Country */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-6">Sales Mapping by Location</h3>
            <div className="relative h-48 bg-gray-50 rounded-lg flex items-center justify-center mb-4">
              <MapPin className="w-16 h-16 text-gray-300" />
              <p className="absolute bottom-4 text-xs text-gray-500">Philippines - CSU Campus</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold" style={{ color: CSU_GREEN }}>{overview.active_listings}</p>
                <p className="text-xs text-gray-600 mt-1">Active Zones</p>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <p className="text-2xl font-bold text-gray-900">{overview.total_orders_as_buyer}</p>
                <p className="text-xs text-gray-600 mt-1">Total Orders</p>
              </div>
            </div>
          </div>

          {/* Volume vs Service Level */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-6">Volume vs Service Level</h3>
            <div className="relative h-48">
              <div className="flex items-end justify-between h-full gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((_, index) => {
                  const volumeHeight = Math.random() * 120 + 40;
                  const serviceHeight = Math.random() * 100 + 30;
                  
                  return (
                    <div key={index} className="flex-1 flex gap-1">
                      <div
                        className="flex-1 rounded-t transition-all hover:opacity-80"
                        style={{
                          height: `${volumeHeight}px`,
                          backgroundColor: CSU_GREEN
                        }}
                      />
                      <div
                        className="flex-1 rounded-t transition-all hover:opacity-80"
                        style={{
                          height: `${serviceHeight}px`,
                          backgroundColor: '#34D399'
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="flex items-center justify-between mt-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CSU_GREEN }}></div>
                <div>
                  <p className="text-xs text-gray-600">Volume</p>
                  <p className="text-sm font-bold text-gray-900">{overview.total_products_posted}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-400"></div>
                <div>
                  <p className="text-xs text-gray-600">Services</p>
                  <p className="text-sm font-bold text-gray-900">{overview.active_listings}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Row - Income Breakdown + Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Income Breakdown Donut Chart */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Income Breakdown</h3>
              <button className="px-4 py-2 rounded-lg text-sm font-semibold text-white shadow-md" style={{ backgroundColor: CSU_GREEN }}>
                Month
              </button>
            </div>

            <div className="flex items-center justify-between">
              {/* Donut Chart */}
              <div className="relative w-64 h-64">
                {categoryRevenue.length > 0 ? (
                  <>
                    <svg viewBox="0 0 200 200" className="w-full h-full transform -rotate-90">
                      {(() => {
                        let currentAngle = 0;
                        return categoryRevenue.map((category, index) => {
                          const percentage = (category.category_revenue / totalCategoryRevenue) * 100;
                          const angle = (percentage / 100) * 360;
                          const startAngle = currentAngle;
                          currentAngle += angle;
                          const startRad = (startAngle * Math.PI) / 180;
                          const endRad = (currentAngle * Math.PI) / 180;
                          const outerRadius = 95;
                          const innerRadius = 65;
                          const x1Outer = 100 + outerRadius * Math.cos(startRad);
                          const y1Outer = 100 + outerRadius * Math.sin(startRad);
                          const x2Outer = 100 + outerRadius * Math.cos(endRad);
                          const y2Outer = 100 + outerRadius * Math.sin(endRad);
                          const x1Inner = 100 + innerRadius * Math.cos(endRad);
                          const y1Inner = 100 + innerRadius * Math.sin(endRad);
                          const x2Inner = 100 + innerRadius * Math.cos(startRad);
                          const y2Inner = 100 + innerRadius * Math.sin(startRad);
                          const largeArc = angle > 180 ? 1 : 0;
                          const pathData = [
                            `M ${x1Outer} ${y1Outer}`,
                            `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${x2Outer} ${y2Outer}`,
                            `L ${x1Inner} ${y1Inner}`,
                            `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x2Inner} ${y2Inner}`,
                            'Z'
                          ].join(' ');
                          return (
                            <path
                              key={index}
                              d={pathData}
                              fill={CHART_COLORS[index % CHART_COLORS.length]}
                              className="hover:opacity-80 transition-opacity cursor-pointer"
                            />
                          );
                        });
                      })()}
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <p className="text-3xl font-bold text-gray-900">{formatCurrency(totalCategoryRevenue)}</p>
                        <p className="text-xs text-gray-500 mt-1">Total Income</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <PieChart className="w-16 h-16 text-gray-300" />
                  </div>
                )}
              </div>

              {/* Legend */}
              <div className="flex-1 pl-12 space-y-4">
                {categoryRevenue.map((category, index) => {
                  const percentage = totalCategoryRevenue > 0 ? ((category.category_revenue / totalCategoryRevenue) * 100).toFixed(1) : 0;
                  
                  return (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                        />
                        <span className="text-sm font-medium text-gray-700">{category.category_name}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-900">{formatCurrency(category.category_revenue)}</p>
                        <p className="text-xs text-gray-500">{percentage}%</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Latest Events */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900">Latest Events</h3>
              <button
                onClick={() => navigate('/my-orders')}
                className="text-sm font-semibold"
                style={{ color: CSU_GREEN }}
              >
                View all
              </button>
            </div>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {recentActivity.length === 0 ? (
                <div className="text-center py-12">
                  <Activity className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm text-gray-500">No recent activity</p>
                </div>
              ) : (
                recentActivity.map((activity) => (
                  <div key={activity.activity_id} className="flex items-start gap-3 pb-4 border-b border-gray-100 last:border-0">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: CSU_GREEN_LIGHT }}>
                      {activity.activity_type === 'listing_created' && <Package className="w-5 h-5" style={{ color: CSU_GREEN }} />}
                      {activity.activity_type === 'order_received' && <ShoppingCart className="w-5 h-5" style={{ color: CSU_GREEN }} />}
                      {activity.activity_type === 'order_placed' && <FileText className="w-5 h-5" style={{ color: CSU_GREEN }} />}
                      {activity.activity_type === 'review_received' && <Star className="w-5 h-5" style={{ color: CSU_GREEN }} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{activity.description}</p>
                      <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTime(activity.timestamp)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;

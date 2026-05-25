import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import dashboardService from '../services/dashboardService';
import type {
  DashboardOverview,
  MonthlyRevenue,
  CategoryPerformance,
  TopProduct,
  SalesTrend,
  RecentActivity,
  OrderStatusDistribution
} from '../services/dashboardService';
import { 
  Package, ShoppingCart, Star, AlertCircle, 
  Loader, Clock, Eye, TrendingUp, BarChart3, PieChart as PieChartIcon, Activity, Heart
} from 'lucide-react';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';
import Footer from '../components/Footer';

const CSU_GREEN = '#208756';

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { profile, user } = useAuth();

  // State for all dashboard data
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [monthlyRevenue, setMonthlyRevenue] = useState<MonthlyRevenue[]>([]);
  const [categoryPerformance, setCategoryPerformance] = useState<CategoryPerformance[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [salesTrend, setSalesTrend] = useState<SalesTrend[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [orderStatusDistribution, setOrderStatusDistribution] = useState<OrderStatusDistribution[]>([]);
  const [realTotalRevenue, setRealTotalRevenue] = useState<number>(0);
  const [realGlobalProductsSold, setRealGlobalProductsSold] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = 'Dashboard - CSU Marketplace';
  }, []);

  // Block admins
  useEffect(() => {
    const isAdmin = profile?.role_id === 1 || profile?.is_admin === true;
    if (isAdmin) {
      navigate('/admin', { replace: true });
    }
  }, [profile, navigate]);

  // Load all dashboard data
  useEffect(() => {
    if (user?.id) {
      loadDashboardData();
    }
  }, [user?.id]);

  const loadDashboardData = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      console.log('📊 Loading dashboard data for user:', user.id);

      const data = await dashboardService.loadAllDashboardData(
        user.id,
        user.id
      );

      console.log('✅ Dashboard data received:', {
        overview: data.overview,
        monthlyRevenue: data.monthlyRevenue?.length,
        salesTrend: data.salesTrend?.length,
        categoryPerformance: data.categoryPerformance?.length,
        topProducts: data.topProducts?.length,
        recentActivity: data.recentActivity?.length,
        orderStatusDistribution: data.orderStatusDistribution?.length,
        realTotalRevenue: data.realTotalRevenue,
        realGlobalProductsSold: data.realGlobalProductsSold
      });

      setOverview(data.overview);
      setMonthlyRevenue(data.monthlyRevenue || []);
      setSalesTrend(data.salesTrend || []);
      setCategoryPerformance(data.categoryPerformance || []);
      setTopProducts(data.topProducts || []);
      setRecentActivity(data.recentActivity || []);
      setOrderStatusDistribution(data.orderStatusDistribution || []);
      setRealTotalRevenue(data.realTotalRevenue || 0);
      setRealGlobalProductsSold(data.realGlobalProductsSold || 0);

      console.log('✅ All dashboard data loaded successfully');
    } catch (error) {
      console.error('❌ Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => 
    `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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

  // Ensure all 5 order statuses are shown (with 0 count if not present)
  const ensureAllOrderStatuses = (data: OrderStatusDistribution[]): OrderStatusDistribution[] => {
    if (data.length === 0) {
      return [
        { seller_id: user?.id || '', order_status: 'pending', count: 0, percentage: 0, total_value: 0 },
        { seller_id: user?.id || '', order_status: 'accepted', count: 0, percentage: 0, total_value: 0 },
        { seller_id: user?.id || '', order_status: 'completed', count: 0, percentage: 0, total_value: 0 },
        { seller_id: user?.id || '', order_status: 'rejected', count: 0, percentage: 0, total_value: 0 },
        { seller_id: user?.id || '', order_status: 'cancelled', count: 0, percentage: 0, total_value: 0 }
      ];
    }
    
    const statusMap = new Map(data.map(item => [item.order_status.toLowerCase(), item]));
    const allStatuses = ['pending', 'accepted', 'completed', 'rejected', 'cancelled'];
    
    return allStatuses.map(status => {
      if (statusMap.has(status)) {
        return statusMap.get(status)!;
      }
      // Return placeholder with 0 count for missing statuses
      return {
        seller_id: data[0]?.seller_id || '',
        order_status: status,
        count: 0,
        percentage: 0,
        total_value: 0
      };
    });
  };

  const COLORS = [
    CSU_GREEN,      // Primary green
    '#0ea5e9',      // Sky blue
    '#f59e0b',      // Amber
    '#ef4444',      // Red
    '#8b5cf6',      // Purple
    '#ec4899',      // Pink
    '#14b8a6',      // Teal
    '#6366f1'       // Indigo
  ];

  // Format month data for charts
  const monthlyRevenueChartData = monthlyRevenue.map(item => ({
    name: new Date(item.month).toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
    revenue: Math.round(item.monthly_revenue),
    transactions: item.transaction_count
  }));

  // Format sales trend data
  const salesTrendChartData = salesTrend.map(item => ({
    name: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    sales: item.daily_sales,
    forSale: item.for_sale,
    forRent: item.for_rent,
    services: item.services
  }));

  // Format category performance data
  const categoryChartData = categoryPerformance.map(cat => ({
    name: cat.category_name,
    revenue: Math.round(cat.total_revenue),
    transactions: cat.completed_transactions
  }));

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center flex-col">
        <Loader className="w-12 h-12 animate-spin mb-4" style={{ color: CSU_GREEN }} />
        <p className="text-gray-600">Loading Dashboard...</p>
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center flex-col">
        <AlertCircle className="w-16 h-16 mb-4 text-red-500" />
        <p className="text-gray-600 font-medium">Failed to load dashboard</p>
      </div>
    );
  }

  // Determine if user is new (registered within the last hour)
  const isNewUser = () => {
    if (!profile?.created_at) return false;
    const createdDate = new Date(profile.created_at);
    const now = new Date();
    const diffInMinutes = (now.getTime() - createdDate.getTime()) / (1000 * 60);
    return diffInMinutes < 60;
  };

  const isNew = isNewUser();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="flex-1">
        {/* Welcome Section - Stuck to Navbar */}
        <div className="w-full" style={{ backgroundColor: CSU_GREEN }}>
          <div className="max-w-7xl mx-auto px-4 py-5">
            <div className="relative">
              {/* Content */}
              <div className="relative z-10">
                {isNew ? (
                  <>
                    <h1 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                      Welcome to your Dashboard <span className="text-2xl inline-block animate-wave">👋</span>
                    </h1>
                    <p className="text-green-100 text-sm leading-relaxed">
                      Everything is set up and ready to go. Start exploring, create listings, and grow your marketplace presence.
                    </p>
                  </>
                ) : (
                  <>
                    <h1 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                      Welcome back, {profile?.first_name} <span className="text-2xl inline-block animate-wave">👋</span>
                    </h1>
                    <p className="text-green-100 text-sm leading-relaxed">
                      Great to see you again! Check your performance, manage your listings, and keep growing.
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-8">

          {/* KPI Cards - Unified Container */}
          <div className="bg-gradient-to-br from-white via-white to-green-50 rounded-2xl p-8 shadow-sm border border-gray-100 hover:shadow-xl transition-all mb-8" style={{ borderTop: `4px solid ${CSU_GREEN}` }}>
            <div className="mb-6 pb-6 border-b-2" style={{ borderColor: `${CSU_GREEN}20` }}>
              <h2 className="text-2xl font-bold text-gray-900">Performance Overview</h2>
              <p className="text-gray-500 text-sm mt-1">Your key metrics at a glance</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Total Revenue */}
              <div className="group p-6 rounded-xl bg-gradient-to-br from-white to-green-50 border-2 transition-all hover:shadow-lg hover:scale-105" style={{ borderColor: `${CSU_GREEN}30`, backgroundColor: `${CSU_GREEN}05` }}>
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-lg group-hover:scale-125 transition-transform" style={{ backgroundColor: `${CSU_GREEN}20` }}>
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                      <path d="M12 1v22m0 0c5.523 0 10-2.239 10-5s-4.477-5-10-5-10 2.239-10 5 4.477 5 10 5zm0 0c5.523 0 10-2.239 10-5V6c0 2.761-4.477 5-10 5s-10-2.239-10-5v12c0 2.761 4.477 5 10 5z" 
                          stroke={CSU_GREEN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div className="text-xs font-bold px-3 py-1 rounded-full" style={{ backgroundColor: `${CSU_GREEN}15`, color: CSU_GREEN }}>REVENUE</div>
                </div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Total Revenue</h3>
                <p className="text-2xl font-bold text-gray-900 mb-2">{formatCurrency(realTotalRevenue)}</p>
                <p className="text-xs text-gray-500">From all transactions</p>
              </div>

              {/* Total Products Sold */}
              <div className="group p-6 rounded-xl bg-gradient-to-br from-white to-green-50 border-2 transition-all hover:shadow-lg hover:scale-105" style={{ borderColor: `${CSU_GREEN}30`, backgroundColor: `${CSU_GREEN}05` }}>
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-lg group-hover:scale-125 transition-transform" style={{ backgroundColor: `${CSU_GREEN}20` }}>
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                      <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" 
                          stroke={CSU_GREEN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div className="text-xs font-bold px-3 py-1 rounded-full" style={{ backgroundColor: `${CSU_GREEN}15`, color: CSU_GREEN }}>PRODUCTS</div>
                </div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Products Sold</h3>
                <p className="text-2xl font-bold text-gray-900 mb-2">{realGlobalProductsSold}</p>
                <p className="text-xs text-gray-500">Total from all users</p>
              </div>

              {/* Active Listings */}
              <div className="group p-6 rounded-xl bg-gradient-to-br from-white to-green-50 border-2 transition-all hover:shadow-lg hover:scale-105" style={{ borderColor: `${CSU_GREEN}30`, backgroundColor: `${CSU_GREEN}05` }}>
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-lg group-hover:scale-125 transition-transform" style={{ backgroundColor: `${CSU_GREEN}20` }}>
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                      <path d="M9 5a2 2 0 100-4 2 2 0 000 4zm0 0h6m-6 0a7 7 0 100 14H3m12 0a7 7 0 100-14m0 14h6" 
                          stroke={CSU_GREEN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div className="text-xs font-bold px-3 py-1 rounded-full" style={{ backgroundColor: `${CSU_GREEN}15`, color: CSU_GREEN }}>ACTIVE</div>
                </div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Active Products</h3>
                <p className="text-2xl font-bold text-gray-900 mb-2">{overview.active_listings}</p>
                <p className="text-xs text-gray-500">Pending: <span style={{ color: CSU_GREEN, fontWeight: 'bold' }}>{overview.pending_listings}</span></p>
              </div>

              {/* Total Orders */}
              <div className="group p-6 rounded-xl bg-gradient-to-br from-white to-green-50 border-2 transition-all hover:shadow-lg hover:scale-105" style={{ borderColor: `${CSU_GREEN}30`, backgroundColor: `${CSU_GREEN}05` }}>
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 rounded-lg group-hover:scale-125 transition-transform" style={{ backgroundColor: `${CSU_GREEN}20` }}>
                    <Package className="w-6 h-6" style={{ color: CSU_GREEN }} />
                  </div>
                  <div className="text-xs font-bold px-3 py-1 rounded-full" style={{ backgroundColor: `${CSU_GREEN}15`, color: CSU_GREEN }}>ORDERS</div>
                </div>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Total Orders</h3>
                <p className="text-2xl font-bold text-gray-900 mb-2">{overview.total_orders_as_buyer}</p>
                <p className="text-xs text-gray-500">As seller: <span style={{ color: CSU_GREEN, fontWeight: 'bold' }}>{overview.total_orders_as_seller}</span></p>
              </div>
            </div>
          </div>

          {/* Data Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-lg transition-all" style={{ borderTop: `3px solid ${CSU_GREEN}` }}>
              <div className="flex items-center gap-2 mb-6">
                <div className="p-2 rounded-lg" style={{ backgroundColor: `${CSU_GREEN}10` }}>
                  <Package className="w-5 h-5" style={{ color: CSU_GREEN }} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Order Status</h3>
              </div>
              {orderStatusDistribution.length > 0 ? (
                <div className="grid grid-cols-2 gap-4 items-center">
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={ensureAllOrderStatuses(orderStatusDistribution).map(item => {
                          let statusColor = CSU_GREEN;
                          switch(item.order_status.toLowerCase()) {
                            case 'completed': statusColor = '#10b981'; break;
                            case 'pending': statusColor = '#f59e0b'; break;
                            case 'accepted': statusColor = '#3b82f6'; break;
                            case 'rejected': statusColor = '#ef4444'; break;
                            case 'cancelled': statusColor = '#6b7280'; break;
                            default: statusColor = CSU_GREEN;
                          }
                          return { name: item.order_status, value: item.count, color: statusColor };
                        })}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={85}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {ensureAllOrderStatuses(orderStatusDistribution).map((item, index) => {
                          let statusColor = CSU_GREEN;
                          switch(item.order_status.toLowerCase()) {
                            case 'completed': statusColor = '#10b981'; break;
                            case 'pending': statusColor = '#f59e0b'; break;
                            case 'accepted': statusColor = '#3b82f6'; break;
                            case 'rejected': statusColor = '#ef4444'; break;
                            case 'cancelled': statusColor = '#6b7280'; break;
                            default: statusColor = CSU_GREEN;
                          }
                          return <Cell key={`cell-${index}`} fill={statusColor} />;
                        })}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#fff', border: `1px solid ${CSU_GREEN}`, borderRadius: '6px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1.5 max-h-64 overflow-y-auto pr-2">
                    {ensureAllOrderStatuses(orderStatusDistribution).map((status, idx) => {
                      let statusColor = CSU_GREEN;
                      switch(status.order_status.toLowerCase()) {
                        case 'completed': statusColor = '#10b981'; break;
                        case 'pending': statusColor = '#f59e0b'; break;
                        case 'accepted': statusColor = '#3b82f6'; break;
                        case 'rejected': statusColor = '#ef4444'; break;
                        case 'cancelled': statusColor = '#6b7280'; break;
                        default: statusColor = CSU_GREEN;
                      }
                      
                      return (
                        <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-gray-50 transition-all group" style={{ backgroundColor: `${statusColor}08` }}>
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 group-hover:scale-125 transition-transform" style={{ backgroundColor: statusColor }} />
                            <p className="text-xs font-semibold text-gray-800 capitalize truncate" style={{ color: statusColor }}>{status.order_status}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <p className="text-xs font-bold" style={{ color: statusColor }}>{status.count}</p>
                            <p className="text-xs text-gray-400 w-8 text-right font-semibold">{status.percentage}%</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8 text-sm">No data</p>
              )}
            </div>

            {/* Sales Trend - GROUPED BAR CHART */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-lg transition-all" style={{ borderTop: `3px solid ${CSU_GREEN}` }}>
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-5 h-5" style={{ color: CSU_GREEN }} />
                <h3 className="text-lg font-bold text-gray-900">Sales Trend (Last 7 Days)</h3>
              </div>
              {salesTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart 
                    data={salesTrendChartData}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={true} />
                    <XAxis 
                      dataKey="name" 
                      stroke="#6b7280" 
                      style={{ fontSize: '13px', fontWeight: 500 }}
                      tick={{ fill: '#6b7280' }}
                    />
                    <YAxis 
                      stroke="#6b7280" 
                      style={{ fontSize: '13px', fontWeight: 500 }}
                      tick={{ fill: '#6b7280' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#fff', 
                        border: `2px solid ${CSU_GREEN}`, 
                        borderRadius: '10px', 
                        boxShadow: '0 8px 16px rgba(0,0,0,0.12)',
                        padding: '12px'
                      }}
                      labelStyle={{ color: '#1f2937', fontWeight: 600, fontSize: '13px' }}
                      cursor={{ fill: 'rgba(32, 135, 86, 0.05)' }}
                    />
                    <Legend 
                      wrapperStyle={{ fontSize: '13px', fontWeight: 500, paddingTop: '20px' }}
                      verticalAlign="bottom"
                      height={30}
                    />
                    <Bar 
                      dataKey="forSale" 
                      fill="#fbbf24" 
                      name="For Sale" 
                      radius={[6, 6, 0, 0]}
                      barSize={32}
                    />
                    <Bar 
                      dataKey="forRent" 
                      fill="#ef4444" 
                      name="For Rent" 
                      radius={[6, 6, 0, 0]}
                      barSize={32}
                    />
                    <Bar 
                      dataKey="services" 
                      fill="#22c55e" 
                      name="Services" 
                      radius={[6, 6, 0, 0]}
                      barSize={32}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-gray-500 text-center py-8">No sales data</p>
              )}
            </div>
          </div>

          {/* Category Performance & Top Products */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Monthly Revenue Trend - STACKED AREA CHART */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-lg transition-all" style={{ borderTop: `3px solid ${CSU_GREEN}` }}>
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5" style={{ color: CSU_GREEN }} />
                <h3 className="text-lg font-bold text-gray-900">Monthly Revenue Trend</h3>
              </div>
              {monthlyRevenue.length > 0 ? (
                <ResponsiveContainer width="100%" height={320}>
                  <AreaChart data={monthlyRevenueChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRevenue1" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#fbbf24" stopOpacity={0.1}/>
                      </linearGradient>
                      <linearGradient id="colorRevenue2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1}/>
                      </linearGradient>
                      <linearGradient id="colorRevenue3" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0.1}/>
                      </linearGradient>
                      <linearGradient id="colorRevenue4" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={true} />
                    <XAxis 
                      dataKey="name" 
                      stroke="#6b7280" 
                      style={{ fontSize: '13px', fontWeight: 500 }}
                      tick={{ fill: '#6b7280' }}
                    />
                    <YAxis 
                      stroke="#6b7280" 
                      style={{ fontSize: '13px', fontWeight: 500 }}
                      tick={{ fill: '#6b7280' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#fff', 
                        border: `2px solid ${CSU_GREEN}`, 
                        borderRadius: '10px', 
                        boxShadow: '0 8px 16px rgba(0,0,0,0.12)',
                        padding: '12px'
                      }}
                      formatter={(value: any) => `₱${Number(value).toLocaleString('en-PH', { minimumFractionDigits: 0 })}`}
                      labelStyle={{ color: '#1f2937', fontWeight: 600, fontSize: '13px' }}
                      cursor={{ fill: 'rgba(32, 135, 86, 0.05)' }}
                    />
                    <Legend 
                      wrapperStyle={{ fontSize: '13px', fontWeight: 500, paddingTop: '20px' }}
                      iconType="line"
                      verticalAlign="bottom"
                      height={30}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="revenue" 
                      stackId="1"
                      stroke="#fbbf24" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorRevenue1)"
                      name="Q1 Revenue"
                      dot={{ fill: '#fbbf24', r: 4 }}
                      activeDot={{ r: 7, fill: '#fbbf24' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="transactions" 
                      stackId="1"
                      stroke="#ef4444" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorRevenue2)"
                      name="Q2 Revenue"
                      dot={{ fill: '#ef4444', r: 4 }}
                      activeDot={{ r: 7, fill: '#ef4444' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="avgValue" 
                      stackId="1"
                      stroke="#22c55e" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorRevenue3)"
                      name="Q3 Revenue"
                      dot={{ fill: '#22c55e', r: 4 }}
                      activeDot={{ r: 7, fill: '#22c55e' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="avgValue" 
                      stackId="1"
                      stroke="#3b82f6" 
                      strokeWidth={2.5}
                      fillOpacity={1} 
                      fill="url(#colorRevenue4)"
                      name="Q4 Revenue"
                      dot={false}
                      activeDot={{ r: 6 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-gray-500 text-center py-8">No revenue data</p>
              )}
            </div>

            {/* Top Products */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-lg transition-all" style={{ borderTop: `3px solid ${CSU_GREEN}` }}>
              <div className="flex items-center gap-2 mb-6">
                <div className="p-2 rounded-lg" style={{ backgroundColor: `${CSU_GREEN}10` }}>
                  <Star className="w-5 h-5" style={{ color: CSU_GREEN }} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Top Products</h3>
              </div>
              {topProducts.length > 0 ? (
                <div className="space-y-3">
                  {topProducts.slice(0, 5).map((product, idx) => (
                    <div 
                      key={idx} 
                      className="group flex items-center gap-4 p-4 bg-white rounded-xl cursor-pointer transition-all hover:bg-gradient-to-r hover:from-gray-50 hover:to-white shadow-sm border border-gray-200 hover:border-gray-300 hover:shadow-md" 
                      onClick={() => navigate(`/product/${product.product_id}`)}
                    >
                      {/* Rank Badge */}
                      <div className="flex-shrink-0">
                        <span 
                          className="text-sm font-bold text-white rounded-full w-8 h-8 flex items-center justify-center shadow-md" 
                          style={{ backgroundColor: CSU_GREEN }}
                        >
                          {idx + 1}
                        </span>
                      </div>

                      {/* Product Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate text-sm group-hover:text-[#208756] transition-colors">{product.product_name}</p>
                        
                        {/* Icons & Metrics Display */}
                        <div className="flex items-center gap-4 mt-2.5 flex-wrap">
                          {/* Views */}
                          <div className="flex items-center gap-1">
                            <svg className="w-3 h-3 group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="none">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <circle cx="12" cy="12" r="3" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            <span className="text-xs text-gray-500">{product.view_count}</span>
                          </div>

                          {/* Sold - Using Cart Icon */}
                          <div className="flex items-center gap-1">
                            <svg className="w-3 h-3 group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="none">
                              <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" 
                                  stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            <span className="text-xs text-gray-500">{product.sales_count}</span>
                          </div>

                          {/* Favorites */}
                          <div className="flex items-center gap-1">
                            <svg className="w-3 h-3 group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="none">
                              <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" 
                                  stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            <span className="text-xs text-gray-500">{product.favorite_count}</span>
                          </div>
                        </div>
                      </div>

                      {/* Revenue Section */}
                      <div className="text-right flex-shrink-0">
                        <p className="font-bold text-gray-900 text-sm group-hover:text-[#208756] transition-colors">{formatCurrency(product.total_revenue)}</p>
                        <p className="text-xs text-gray-500 group-hover:text-gray-700 transition-colors">{formatCurrency(product.price)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No products yet</p>
              )}
            </div>
          </div>

          {/* Order Status & Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Order Status Distribution - COLORFUL DONUT CHART */}
            {/* Category Performance - DONUT CHART */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-lg transition-all" style={{ borderTop: `3px solid ${CSU_GREEN}` }}>
              <div className="flex items-center gap-2 mb-6">
                <div className="p-2 rounded-lg" style={{ backgroundColor: `${CSU_GREEN}10` }}>
                  <PieChartIcon className="w-5 h-5" style={{ color: CSU_GREEN }} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Category Performance</h3>
              </div>
              {categoryPerformance.length > 0 ? (
                <div className="grid grid-cols-2 gap-4 items-center">
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={categoryChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={85}
                        paddingAngle={2}
                        dataKey="revenue"
                      >
                        {categoryChartData.map((_entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: any) => `₱${Number(value).toLocaleString()}`}
                        contentStyle={{ backgroundColor: '#fff', border: `1px solid ${CSU_GREEN}`, borderRadius: '6px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1.5 max-h-64 overflow-y-auto pr-2">
                    {categoryChartData.map((cat, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-gray-50 transition-all group" style={{ backgroundColor: `${COLORS[idx % COLORS.length]}08` }}>
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div 
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0 group-hover:scale-125 transition-transform" 
                            style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                          />
                          <p className="text-xs font-semibold text-gray-800 truncate" style={{ color: COLORS[idx % COLORS.length] }}>{cat.name}</p>
                        </div>
                        <p className="text-xs font-bold" style={{ color: COLORS[idx % COLORS.length] }}>{cat.transactions}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8 text-sm">No data</p>
              )}
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-lg transition-all" style={{ borderTop: `3px solid ${CSU_GREEN}` }}>
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-5 h-5" style={{ color: CSU_GREEN }} />
                <h3 className="text-lg font-bold text-gray-900">Recent Activity</h3>
              </div>
              {recentActivity.length > 0 ? (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {recentActivity.slice(0, 10).map((activity, idx) => {
                    let activityLabel = '';
                    let activityColor = CSU_GREEN;
                    
                    switch(activity.activity_type) {
                      case 'product_created':
                        // Show SERVICE POSTED for services, PRODUCT POSTED for others
                        activityLabel = activity.listing_type === 'SERVICE' ? 'SERVICE POSTED' : 'PRODUCT POSTED';
                        activityColor = '#f59e0b';
                        break;
                      case 'product_favorite':
                        activityLabel = 'ADDED TO FAVORITES';
                        activityColor = '#ef4444';
                        break;
                      case 'order_placed':
                        activityLabel = 'SOLD';
                        activityColor = '#10b981';
                        break;
                      case 'product_view':
                        activityLabel = 'VIEWED';
                        activityColor = '#3b82f6';
                        break;
                      default:
                        activityLabel = 'ACTIVITY';
                        activityColor = CSU_GREEN;
                    }
                    
                    return (
                      <div key={idx} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-all group" style={{ backgroundColor: `${activityColor}08` }}>
                        <div className="p-2.5 rounded-lg mt-1 flex-shrink-0 group-hover:scale-110 transition-transform" style={{ backgroundColor: `${activityColor}20` }}>
                          {activity.activity_type === 'product_created' && <Package className="w-4 h-4" style={{ color: activityColor }} />}
                          {activity.activity_type === 'product_favorite' && <Heart className="w-4 h-4" style={{ color: activityColor }} />}
                          {activity.activity_type === 'order_placed' && <ShoppingCart className="w-4 h-4" style={{ color: activityColor }} />}
                          {activity.activity_type === 'product_view' && <Eye className="w-4 h-4" style={{ color: activityColor }} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-semibold text-gray-900 truncate">{activity.activity_description}</p>
                            <span className="text-xs font-bold px-2 py-1 rounded-full flex-shrink-0" style={{ backgroundColor: `${activityColor}20`, color: activityColor }}>
                              {activityLabel}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-1 flex-wrap">
                              <p className="text-xs text-gray-500">{activity.category_name}</p>
                              {activity.activity_type === 'product_favorite' && activity.user_name && (
                                <p className="text-xs font-semibold px-2 py-0.5 rounded whitespace-nowrap" style={{ backgroundColor: `${activityColor}20`, color: activityColor }}>
                                  Added by: {activity.user_name}
                                </p>
                              )}
                              {activity.activity_type === 'product_view' && activity.user_name && (
                                <p className="text-xs font-semibold px-2 py-0.5 rounded whitespace-nowrap" style={{ backgroundColor: `${activityColor}20`, color: activityColor }}>
                                  {activity.user_name}
                                </p>
                              )}
                            </div>
                            <p className="text-xs text-gray-400 flex items-center gap-1 flex-shrink-0">
                              <Clock className="w-3 h-3" />
                              {formatTime(activity.activity_timestamp)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No recent activity</p>
              )}
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default DashboardPage;

import React, { useState, useEffect } from 'react';
import { productService, type Product } from '../services/productService';
import { useModal } from '../context/ModalContext';
import { supabase } from '../lib/supabase';
import ImageCarousel from '../components/ImageCarousel';

interface DashboardStats {
  totalUsers: number;
  totalProducts: number;
  pendingProducts: number;
  approvedProducts: number;
  rejectedProducts: number;
  totalTransactions: number;
}

interface PlatformOverview {
  total_users: number;
  active_users_7d: number;
  total_products: number;
  approved_products: number;
  pending_products: number;
  rejected_products: number;
  total_transactions: number;
  completed_transactions: number;
  pending_transactions: number;
  cancelled_transactions: number;
  total_revenue: number;
  revenue_7d: number;
  revenue_30d: number;
  avg_transaction_value: number;
  total_reviews: number;
  avg_platform_rating: number;
  last_updated: string;
}

interface RecentTransaction {
  transaction_id: string;
  buyer_username: string;
  buyer_name: string;
  seller_username: string;
  seller_name: string;
  product_name: string;
  category_name: string;
  item_price: number;
  quantity: number;
  total_amount: number;
  transaction_status: string;
  listing_type: string;
  created_at: string;
  completed_at: string | null;
  status_badge: string;
  status_color: string;
}

interface FunnelStage {
  stage: string;
  stage_order: number;
  count: number;
  percentage: number;
}

interface ProductTrend {
  date: string;
  total: number;
  approved: number;
  pending: number;
  rejected: number;
  for_sale: number;
  for_rent: number;
  services: number;
}

const AdminDashboard: React.FC = () => {
  const { showSuccess, showError, showWarning } = useModal();

  useEffect(() => {
    document.title = 'Admin Dashboard - CSU Marketplace';
  }, []);

  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalProducts: 0,
    pendingProducts: 0,
    approvedProducts: 0,
    rejectedProducts: 0,
    totalTransactions: 0
  });
  const [pendingProducts, setPendingProducts] = useState<Product[]>([]);
  const [approvedProducts, setApprovedProducts] = useState<Product[]>([]);
  const [rejectedProducts, setRejectedProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [platformOverview, setPlatformOverview] = useState<PlatformOverview | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([]);
  const [funnelData, setFunnelData] = useState<FunnelStage[]>([]);
  const [productTrend, setProductTrend] = useState<ProductTrend[]>([]);
  const [analyticsTab, setAnalyticsTab] = useState<'overview' | 'transactions' | 'funnel' | 'trends'>('overview');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadStats(),
        loadPendingProducts(),
        loadApprovedProducts(),
        loadRejectedProducts(),
        loadPlatformOverview(),
        loadRecentTransactions(),
        loadFunnelData(),
        loadProductTrend()
      ]);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      showError('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      if (!supabase) return;

      // Fetch total users
      const { count: usersCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      // Fetch product stats
      const { data: products } = await supabase
        .from('products')
        .select('status');

      const pendingCount = products?.filter(p => p.status.toUpperCase() === 'PENDING').length || 0;
      const approvedCount = products?.filter(p => p.status.toUpperCase() === 'APPROVED').length || 0;
      const rejectedCount = products?.filter(p => p.status.toUpperCase() === 'REJECTED').length || 0;

      console.log('📊 Dashboard Stats:', { totalProducts: products?.length, pendingCount, approvedCount, rejectedCount });

      // Fetch transaction count
      const { count: transactionsCount } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true });

      setStats({
        totalUsers: usersCount || 0,
        totalProducts: products?.length || 0,
        pendingProducts: pendingCount,
        approvedProducts: approvedCount,
        rejectedProducts: rejectedCount,
        totalTransactions: transactionsCount || 0
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadPendingProducts = async () => {
    try {
      console.log('🔄 Loading pending products from all users...');
      const result = await productService.getProducts({ status: 'PENDING' });
      if (result.success && result.data) {
        console.log(`✅ Found ${result.data.length} pending products`);
        setPendingProducts(result.data);
      } else {
        console.warn('⚠️ No pending products found or error:', result.error);
      }
    } catch (error) {
      console.error('❌ Error loading pending products:', error);
    }
  };

  const loadApprovedProducts = async () => {
    try {
      console.log('🔄 Loading approved products from all users...');
      const result = await productService.getProducts({ status: 'APPROVED' });
      if (result.success && result.data) {
        console.log(`✅ Found ${result.data.length} approved products`);
        setApprovedProducts(result.data);
      } else {
        console.warn('⚠️ No approved products found or error:', result.error);
      }
    } catch (error) {
      console.error('❌ Error loading approved products:', error);
    }
  };

  const loadRejectedProducts = async () => {
    try {
      console.log('🔄 Loading rejected products from all users...');
      const result = await productService.getProducts({ status: 'REJECTED' });
      if (result.success && result.data) {
        console.log(`✅ Found ${result.data.length} rejected products`);
        setRejectedProducts(result.data);
      } else {
        console.warn('⚠️ No rejected products found or error:', result.error);
      }
    } catch (error) {
      console.error('❌ Error loading rejected products:', error);
    }
  };

  const loadPlatformOverview = async () => {
    try {
      if (!supabase) return;
      
      const { data, error } = await supabase
        .from('admin_view_platform_overview')
        .select('*')
        .single();

      if (error) throw error;
      if (data) {
        setPlatformOverview(data);
        console.log('✅ Platform overview loaded:', data);
      }
    } catch (error) {
      console.error('❌ Error loading platform overview:', error);
    }
  };

  const loadRecentTransactions = async () => {
    try {
      if (!supabase) return;
      
      const { data, error } = await supabase
        .from('admin_view_recent_transactions')
        .select('*')
        .limit(10);

      if (error) throw error;
      if (data) {
        setRecentTransactions(data);
        console.log('✅ Recent transactions loaded:', data.length);
      }
    } catch (error) {
      console.error('❌ Error loading recent transactions:', error);
    }
  };

  const loadFunnelData = async () => {
    try {
      if (!supabase) return;
      
      const { data, error } = await supabase
        .from('mv_transaction_funnel')
        .select('*')
        .order('stage_order', { ascending: true });

      if (error) throw error;
      if (data) {
        setFunnelData(data);
        console.log('✅ Funnel data loaded:', data.length);
      }
    } catch (error) {
      console.error('❌ Error loading funnel data:', error);
    }
  };

  const loadProductTrend = async () => {
    try {
      if (!supabase) return;
      
      const { data, error } = await supabase
        .from('analytics_view_product_trend')
        .select('*')
        .order('date', { ascending: true })
        .limit(30);

      if (error) throw error;
      if (data) {
        setProductTrend(data);
        console.log('✅ Product trend loaded:', data.length);
      }
    } catch (error) {
      console.error('❌ Error loading product trend:', error);
    }
  };

  const handleApproveProduct = async (product: Product) => {
    setShowProductModal(false);
    showWarning(
      'Approve Product',
      `Are you sure you want to approve "${product.product_name}"?\n\nThis will make the product visible to all users in the marketplace.`,
      async () => {
        setActionLoading(true);
        try {
          console.log(`✅ Approving product: ${product.product_id} - ${product.product_name}`);
          const result = await productService.updateProductStatus(product.product_id, 'APPROVED' as any);
          if (result.success) {
            showSuccess('Product Approved', `"${product.product_name}" has been approved and is now visible in the marketplace.`);
            await loadDashboardData();
          } else {
            showError('Approval Failed', result.error || 'Failed to approve product');
          }
        } catch (error: any) {
          console.error('Error approving product:', error);
          showError('Error', error.message || 'An error occurred while approving the product');
        } finally {
          setActionLoading(false);
        }
      }
    );
  };

  const handleRejectProduct = async (product: Product) => {
    setShowProductModal(false);
    showWarning(
      'Reject Product',
      `Are you sure you want to reject "${product.product_name}"?\n\nThe seller will be notified and the product will not be visible in the marketplace.`,
      async () => {
        setActionLoading(true);
        try {
          console.log(`❌ Rejecting product: ${product.product_id} - ${product.product_name}`);
          const result = await productService.updateProductStatus(product.product_id, 'REJECTED' as any);
          if (result.success) {
            showSuccess('Product Rejected', `"${product.product_name}" has been rejected.`);
            await loadDashboardData();
          } else {
            showError('Rejection Failed', result.error || 'Failed to reject product');
          }
        } catch (error: any) {
          console.error('Error rejecting product:', error);
          showError('Error', error.message || 'An error occurred while rejecting the product');
        } finally {
          setActionLoading(false);
        }
      }
    );
  };

  const handleDeleteProduct = async (product: Product) => {
    setShowProductModal(false);
    showWarning(
      'Delete Product',
      `Are you sure you want to permanently delete "${product.product_name}"?\n\nThis action cannot be undone and will remove:\n• The product listing\n• All associated images\n• Product data`,
      async () => {
        setActionLoading(true);
        try {
          const result = await productService.adminDeleteProduct(product.product_id);
          if (result.success) {
            showSuccess('Product Deleted', `"${product.product_name}" has been permanently deleted.`);
            await loadDashboardData();
          } else {
            showError('Delete Failed', result.error || 'Failed to delete product');
          }
        } catch (error: any) {
          console.error('Error deleting product:', error);
          showError('Error', error.message || 'An error occurred while deleting the product');
        } finally {
          setActionLoading(false);
        }
      }
    );
  };

  const formatPrice = (price: number) => {
    return `₱${price.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
  };

  const openProductModal = (product: Product) => {
    setSelectedProduct(product);
    setShowProductModal(true);
  };

  const closeProductModal = () => {
    setShowProductModal(false);
    setSelectedProduct(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 mx-auto mb-4" style={{ borderBottomColor: '#208756' }}></div>
          <p className="text-gray-600 font-semibold">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-200">
            <h1 className="text-3xl font-bold mb-2" style={{ color: '#208756' }}>Admin Dashboard</h1>
            <p className="text-gray-600">Manage marketplace products and users</p>
          </div>
        </div>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-gray-600 text-sm font-semibold">Total Users</h3>
                <p className="text-3xl font-bold mt-2" style={{ color: '#208756' }}>{stats.totalUsers}</p>
              </div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#f0f8f6' }}>
                <svg className="w-6 h-6" style={{ color: '#208756' }} fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                </svg>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-gray-600 text-sm font-semibold">Total Products</h3>
                <p className="text-3xl font-bold mt-2" style={{ color: '#208756' }}>{stats.totalProducts}</p>
                <div className="mt-2 flex gap-2 text-xs">
                  <span className="text-gray-600">{stats.approvedProducts} Approved</span>
                  <span className="text-gray-400">•</span>
                  <span className="text-gray-600">{stats.rejectedProducts} Rejected</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#f0f8f6' }}>
                <svg className="w-6 h-6" style={{ color: '#208756' }} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 2a4 4 0 00-4 4v1H5a1 1 0 00-.994.89l-1 9A1 1 0 004 18h12a1 1 0 00.994-1.11l-1-9A1 1 0 0015 7h-1V6a4 4 0 00-4-4zm2 5V6a2 2 0 10-4 0v1h4zm-6 3a1 1 0 112 0 1 1 0 01-2 0zm7-1a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-gray-600 text-sm font-semibold">Pending Approvals</h3>
                <p className="text-3xl font-bold mt-2" style={{ color: '#208756' }}>{stats.pendingProducts}</p>
                {stats.pendingProducts > 0 && (
                  <p className="text-sm text-gray-500 mt-1">Requires attention</p>
                )}
              </div>
              <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#f0f8f6' }}>
                <svg className="w-6 h-6" style={{ color: '#208756' }} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Analytics Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold" style={{ color: '#208756' }}>Platform Analytics</h2>
          </div>

          {/* Analytics Tabs */}
          <div className="border-b border-gray-200 bg-white">
            <div className="flex space-x-1 p-4">
              <button
                onClick={() => setAnalyticsTab('overview')}
                className={`px-6 py-2.5 rounded-lg font-semibold transition-all ${
                  analyticsTab === 'overview'
                    ? 'text-white shadow-sm'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
                style={analyticsTab === 'overview' ? { backgroundColor: '#208756' } : {}}
              >
                Overview
              </button>
              <button
                onClick={() => setAnalyticsTab('transactions')}
                className={`px-6 py-2.5 rounded-lg font-semibold transition-all ${
                  analyticsTab === 'transactions'
                    ? 'text-white shadow-sm'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
                style={analyticsTab === 'transactions' ? { backgroundColor: '#208756' } : {}}
              >
                Transactions
              </button>
              <button
                onClick={() => setAnalyticsTab('funnel')}
                className={`px-6 py-2.5 rounded-lg font-semibold transition-all ${
                  analyticsTab === 'funnel'
                    ? 'text-white shadow-sm'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
                style={analyticsTab === 'funnel' ? { backgroundColor: '#208756' } : {}}
              >
                Funnel
              </button>
              <button
                onClick={() => setAnalyticsTab('trends')}
                className={`px-6 py-2.5 rounded-lg font-semibold transition-all ${
                  analyticsTab === 'trends'
                    ? 'text-white shadow-sm'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
                style={analyticsTab === 'trends' ? { backgroundColor: '#208756' } : {}}
              >
                Trends
              </button>
            </div>
          </div>

          <div className="p-6">
            {/* Overview Tab - Platform KPIs */}
            {analyticsTab === 'overview' && platformOverview && (
              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-4">Platform Overview</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="text-sm text-gray-600 mb-1">Total Revenue</div>
                    <div className="text-2xl font-bold" style={{ color: '#208756' }}>{formatPrice(platformOverview.total_revenue)}</div>
                    <div className="text-xs text-gray-500 mt-1">Lifetime</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="text-sm text-gray-600 mb-1">Revenue (30d)</div>
                    <div className="text-2xl font-bold" style={{ color: '#208756' }}>{formatPrice(platformOverview.revenue_30d)}</div>
                    <div className="text-xs text-gray-500 mt-1">Last 30 days</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="text-sm text-gray-600 mb-1">Avg Transaction</div>
                    <div className="text-2xl font-bold" style={{ color: '#208756' }}>{formatPrice(platformOverview.avg_transaction_value)}</div>
                    <div className="text-xs text-gray-500 mt-1">Per transaction</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="text-sm text-gray-600 mb-1">Platform Rating</div>
                    <div className="text-2xl font-bold" style={{ color: '#208756' }}>{platformOverview.avg_platform_rating?.toFixed(1) || '0.0'}</div>
                    <div className="text-xs text-gray-500 mt-1">{platformOverview.total_reviews || 0} reviews</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="text-sm text-gray-600 mb-2">User Activity</div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Total Users:</span>
                        <span className="font-semibold">{platformOverview.total_users}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Active (7d):</span>
                        <span className="font-semibold">{platformOverview.active_users_7d}</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="text-sm text-gray-600 mb-2">Product Stats</div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Total Products:</span>
                        <span className="font-semibold">{platformOverview.total_products}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Approved:</span>
                        <span className="font-semibold">{platformOverview.approved_products}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Pending:</span>
                        <span className="font-semibold">{platformOverview.pending_products}</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="text-sm text-gray-600 mb-2">Transactions</div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Total:</span>
                        <span className="font-semibold">{platformOverview.total_transactions}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Completed:</span>
                        <span className="font-semibold">{platformOverview.completed_transactions}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Pending:</span>
                        <span className="font-semibold">{platformOverview.pending_transactions}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Transactions Tab */}
            {analyticsTab === 'transactions' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-4">Recent Transactions</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Buyer</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Seller</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Product</th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">Amount</th>
                        <th className="text-center py-3 px-4 text-sm font-semibold text-gray-600">Status</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentTransactions.map((tx) => (
                        <tr key={tx.transaction_id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <div className="text-sm font-semibold text-gray-900">{tx.buyer_name}</div>
                            <div className="text-xs text-gray-500">@{tx.buyer_username}</div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-sm font-semibold text-gray-900">{tx.seller_name}</div>
                            <div className="text-xs text-gray-500">@{tx.seller_username}</div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-sm text-gray-900">{tx.product_name}</div>
                            <div className="text-xs text-gray-500">{tx.category_name}</div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="text-sm font-semibold" style={{ color: '#208756' }}>{formatPrice(tx.total_amount)}</div>
                            <div className="text-xs text-gray-500">x{tx.quantity}</div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="inline-block px-2 py-1 rounded-full text-xs font-semibold" 
                                  style={{ backgroundColor: tx.status_color, color: 'white' }}>
                              {tx.status_badge}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">
                            {new Date(tx.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {recentTransactions.length === 0 && (
                    <div className="text-center py-8 text-gray-500">No transactions yet</div>
                  )}
                </div>
              </div>
            )}

            {/* Funnel Tab */}
            {analyticsTab === 'funnel' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-4">Transaction Funnel (Last 30 Days)</h3>
                <div className="space-y-4">
                  {funnelData.map((stage) => (
                    <div key={stage.stage} className="relative">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-gray-700">{stage.stage}</span>
                        <span className="text-sm text-gray-600">{stage.count.toLocaleString()} ({stage.percentage.toFixed(1)}%)</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div 
                          className="h-3 rounded-full transition-all"
                          style={{ 
                            backgroundColor: '#208756',
                            width: `${stage.percentage}%`
                          }}
                        />
                      </div>
                    </div>
                  ))}
                  {funnelData.length === 0 && (
                    <div className="text-center py-8 text-gray-500">No funnel data available</div>
                  )}
                </div>
              </div>
            )}

            {/* Trends Tab */}
            {analyticsTab === 'trends' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-4">Product Listing Trends (Last 30 Days)</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Date</th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">Total</th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">Approved</th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">Pending</th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">Rejected</th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">For Sale</th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">Services</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productTrend.slice(0, 10).map((trend) => (
                        <tr key={trend.date} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4 text-sm text-gray-900">{new Date(trend.date).toLocaleDateString()}</td>
                          <td className="py-3 px-4 text-right text-sm font-semibold" style={{ color: '#208756' }}>{trend.total}</td>
                          <td className="py-3 px-4 text-right text-sm text-gray-600">{trend.approved}</td>
                          <td className="py-3 px-4 text-right text-sm text-gray-600">{trend.pending}</td>
                          <td className="py-3 px-4 text-right text-sm text-gray-600">{trend.rejected}</td>
                          <td className="py-3 px-4 text-right text-sm text-gray-600">{trend.for_sale}</td>
                          <td className="py-3 px-4 text-right text-sm text-gray-600">{trend.services}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {productTrend.length === 0 && (
                    <div className="text-center py-8 text-gray-500">No trend data available</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Product Management Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold" style={{ color: '#208756' }}>Product Management</h2>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 bg-white">
            <div className="flex space-x-1 p-4">
              <button
                onClick={() => setActiveTab('pending')}
                className={`px-6 py-2.5 rounded-lg font-semibold transition-all ${
                  activeTab === 'pending'
                    ? 'text-white shadow-sm'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
                style={activeTab === 'pending' ? { backgroundColor: '#208756' } : {}}
              >
                Pending ({stats.pendingProducts})
              </button>
              <button
                onClick={() => setActiveTab('approved')}
                className={`px-6 py-2.5 rounded-lg font-semibold transition-all ${
                  activeTab === 'approved'
                    ? 'text-white shadow-sm'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
                style={activeTab === 'approved' ? { backgroundColor: '#208756' } : {}}
              >
                Approved ({stats.approvedProducts})
              </button>
              <button
                onClick={() => setActiveTab('rejected')}
                className={`px-6 py-2.5 rounded-lg font-semibold transition-all ${
                  activeTab === 'rejected'
                    ? 'text-white shadow-sm'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
                style={activeTab === 'rejected' ? { backgroundColor: '#208756' } : {}}
              >
                Rejected ({stats.rejectedProducts})
              </button>
            </div>
          </div>

          <div className="p-6">
            {activeTab === 'pending' && pendingProducts.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: '#f0f8f6' }}>
                  <svg className="w-8 h-8" style={{ color: '#208756' }} fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">All caught up!</h3>
                <p className="text-gray-500">No pending products to review</p>
              </div>
            ) : activeTab === 'pending' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pendingProducts.map((product) => (
                  <div 
                    key={product.product_id}
                    className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-all cursor-pointer"
                    onClick={() => openProductModal(product)}
                  >
                    <div className="relative" style={{ paddingBottom: '75%' }}>
                      <div className="absolute inset-0">
                        <ImageCarousel 
                          images={product.images}
                          productName={product.product_name}
                          className="h-full w-full"
                        />
                      </div>
                      <div className="absolute top-3 right-3 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-sm" style={{ backgroundColor: '#208756' }}>
                        PENDING
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-900 mb-1 line-clamp-1">{product.product_name}</h3>
                      <p className="text-xs text-gray-500 mb-2">{product.category?.category_name}</p>
                      <p className="text-lg font-bold mb-2" style={{ color: '#208756' }}>{formatPrice(product.price)}</p>
                      <div className="flex items-center text-sm text-gray-600">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                        </svg>
                        <span>{product.seller?.username}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : activeTab === 'approved' && approvedProducts.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">No approved products</h3>
                <p className="text-gray-500">Approved products will appear here</p>
              </div>
            ) : activeTab === 'approved' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {approvedProducts.map((product) => (
                  <div 
                    key={product.product_id}
                    className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-all cursor-pointer"
                    onClick={() => openProductModal(product)}
                  >
                    <div className="relative" style={{ paddingBottom: '75%' }}>
                      <div className="absolute inset-0">
                        <ImageCarousel 
                          images={product.images}
                          productName={product.product_name}
                          className="h-full w-full"
                        />
                      </div>
                      <div className="absolute top-3 right-3 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-sm" style={{ backgroundColor: '#208756' }}>
                        APPROVED
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-900 mb-1 line-clamp-1">{product.product_name}</h3>
                      <p className="text-xs text-gray-500 mb-2">{product.category?.category_name}</p>
                      <p className="text-lg font-bold mb-2" style={{ color: '#208756' }}>{formatPrice(product.price)}</p>
                      <div className="flex items-center text-sm text-gray-600">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                        </svg>
                        <span>{product.seller?.username}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : activeTab === 'rejected' && rejectedProducts.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">No rejected products</h3>
                <p className="text-gray-500">Rejected products will appear here</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {rejectedProducts.map((product) => (
                  <div 
                    key={product.product_id}
                    className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-all cursor-pointer"
                    onClick={() => openProductModal(product)}
                  >
                    <div className="relative" style={{ paddingBottom: '75%' }}>
                      <div className="absolute inset-0">
                        <ImageCarousel 
                          images={product.images}
                          productName={product.product_name}
                          className="h-full w-full"
                        />
                      </div>
                      <div className="absolute top-3 right-3 bg-gray-500 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-sm">
                        REJECTED
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-900 mb-1 line-clamp-1">{product.product_name}</h3>
                      <p className="text-xs text-gray-500 mb-2">{product.category?.category_name}</p>
                      <p className="text-lg font-bold mb-2" style={{ color: '#208756' }}>{formatPrice(product.price)}</p>
                      <div className="flex items-center text-sm text-gray-600">
                        <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                        </svg>
                        <span>{product.seller?.username}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Product Detail Modal */}
      {showProductModal && selectedProduct && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200" 
          onClick={() => !actionLoading && closeProductModal()}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-gray-200 animate-in zoom-in duration-200" 
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-white px-6 py-4 flex justify-between items-center z-10 border-b border-gray-200 rounded-t-lg">
              <h2 className="text-xl font-bold text-[#208756]">Review Product</h2>
              <button
                onClick={() => !actionLoading && closeProductModal()}
                disabled={actionLoading}
                className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {/* Image Carousel */}
              <div className="mb-6">
                <div className="relative w-full bg-gray-900 rounded-lg overflow-hidden" style={{ paddingBottom: '56.25%' }}>
                  <div className="absolute inset-0">
                    <ImageCarousel 
                      images={selectedProduct.images}
                      productName={selectedProduct.product_name}
                      className="h-full w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Product Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xs font-semibold text-gray-600 uppercase mb-2">Product Name</h3>
                    <p className="text-xl font-bold" style={{ color: '#208756' }}>{selectedProduct.product_name}</p>
                  </div>

                  <div>
                    <h3 className="text-xs font-semibold text-gray-600 uppercase mb-2">Category</h3>
                    <p className="text-base font-semibold px-3 py-1.5 rounded-lg border border-gray-200 inline-block" style={{ backgroundColor: '#f0f8f6', color: '#208756' }}>
                      {selectedProduct.category?.category_name}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-xs font-semibold text-gray-600 uppercase mb-2">Price</h3>
                    <p className="text-2xl font-bold" style={{ color: '#208756' }}>{formatPrice(selectedProduct.price)}</p>
                  </div>

                  <div>
                    <h3 className="text-xs font-semibold text-gray-600 uppercase mb-2">Listing Type</h3>
                    <span className="inline-block px-3 py-1.5 rounded-lg font-semibold text-white"
                          style={{ backgroundColor: '#208756' }}>
                      {selectedProduct.listing_type.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-xl p-4 border border-gray-200" style={{ backgroundColor: '#f0f8f6' }}>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Seller Information</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between bg-white px-3 py-2 rounded-lg">
                        <span className="text-gray-600 text-sm">Username:</span>
                        <span className="font-semibold text-gray-900 text-sm">{selectedProduct.seller?.username}</span>
                      </div>
                      <div className="flex justify-between bg-white px-3 py-2 rounded-lg">
                        <span className="text-gray-600 text-sm">Department:</span>
                        <span className="font-semibold text-gray-900 text-sm">{selectedProduct.seller?.department}</span>
                      </div>
                      <div className="flex justify-between bg-white px-3 py-2 rounded-lg">
                        <span className="text-gray-600 text-sm">Posted:</span>
                        <span className="font-semibold text-gray-900 text-sm">{new Date(selectedProduct.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-semibold text-gray-600 uppercase mb-2">Description</h3>
                    <p className="text-gray-700 text-sm leading-relaxed bg-gray-50 p-4 rounded-lg border border-gray-200">
                      {selectedProduct.description}
                    </p>
                  </div>
                </div>
              </div>

              {/* Admin Actions */}
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-base font-semibold text-gray-700 mb-4">Admin Actions</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button
                    onClick={() => handleApproveProduct(selectedProduct)}
                    disabled={actionLoading}
                    className="bg-[#208756] hover:bg-[#1a6d45] text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {actionLoading ? (
                      <>
                        <svg className="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Processing...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Approve
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => handleRejectProduct(selectedProduct)}
                    disabled={actionLoading}
                    className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {actionLoading ? (
                      <>
                        <svg className="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Processing...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        Reject
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => handleDeleteProduct(selectedProduct)}
                    disabled={actionLoading}
                    className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {actionLoading ? (
                      <>
                        <svg className="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 818-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Processing...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        Delete
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import Footer from '../components/Footer';
import {
  BarChart3, TrendingUp, Users, Package, CheckCircle,
  AlertCircle, Activity, Search, RefreshCw, Download,
  ArrowUpRight, ArrowDownRight, Zap, Eye, Star,
  ThumbsUp, ThumbsDown, XCircle, Copy, ExternalLink, Check, Trash2, Edit
} from 'lucide-react';
import {
  BarChart, Bar, PieChart, Pie, LineChart, Line,
  Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ComposedChart
} from 'recharts';
import type {
  PlatformOverview,
  RecentTransaction,
  UserActivity,
  PendingProduct,
  RevenueData,
  UserGrowthData,
  TopSellerData,
  TransactionStatusData,
  ProductTrendData,
  DailyPlatformMetrics,
  MonthlyCategoryPareto
} from '../services/adminService';
import { adminService } from '../services/adminService';
import ImageCarousel from '../components/ImageCarousel';

const ADMIN_GREEN = '#208756';
const ADMIN_COLORS = [
  ADMIN_GREEN,
  '#0891b2',
  '#7c3aed',
  '#db2777',
  '#ea580c',
  '#059669'
];

// No duplicate interfaces - all imported from adminService via type imports

// ═══════════════════════════════════════════════════════════════════════════════════
// KPI CARD COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════════

interface KpiCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtext?: string;
  trend?: number;
  loading?: boolean;
}

const KpiCard: React.FC<KpiCardProps> = ({
  icon,
  label,
  value,
  subtext,
  trend,
  loading = false
}) => (
  <div className="group bg-white rounded-2xl p-6 hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-gray-200 overflow-hidden relative" style={{ borderTop: `4px solid ${ADMIN_GREEN}` }}>
    {/* Animated background effect */}
    <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-transparent to-gray-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
    
    <div className="relative z-10">
      <div className="flex items-start justify-between mb-4">
        <div
          className="p-4 rounded-xl group-hover:scale-110 transition-transform duration-300"
          style={{ backgroundColor: `${ADMIN_GREEN}15` }}
        >
          <div style={{ color: ADMIN_GREEN }} className="text-2xl">
            {icon}
          </div>
        </div>
        {trend !== undefined && (
          <div
            className="flex items-center gap-1 text-sm font-bold px-3 py-1.5 rounded-lg"
            style={{
              backgroundColor: trend >= 0 ? '#ecfdf5' : '#fef2f2',
              color: trend >= 0 ? '#059669' : '#dc2626'
            }}
          >
            {trend >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{label}</h3>
      <p className="text-4xl font-bold text-gray-900 mb-2">
        {loading ? '—' : typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      {subtext && <p className="text-xs text-gray-500 font-medium">{subtext}</p>}
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════════════
// CHARTS SECTION
// ═══════════════════════════════════════════════════════════════════════════════════

interface ChartsSectionProps {
  revenueData: RevenueData[];
  userGrowthData: UserGrowthData[];
  topSellersData: TopSellerData[];
  transactionStatusData: TransactionStatusData[];
  productTrendData: ProductTrendData[];
  dailyMetrics: DailyPlatformMetrics | null;
  categoryPareto: MonthlyCategoryPareto[];
}

const ChartsSection: React.FC<ChartsSectionProps> = ({
  topSellersData,
  transactionStatusData,
  productTrendData,
  dailyMetrics,
  categoryPareto
}) => (
  <div className="space-y-8">
    {/* 2-Column Charts Grid */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Product Trend Chart */}
      <div className="lg:col-span-1 bg-white rounded-2xl border border-gray-100 p-8 shadow-sm hover:shadow-lg transition-all" style={{ borderTop: `4px solid ${ADMIN_GREEN}` }}>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-3 mb-2">
              <div className="bg-green-100 p-2.5 rounded-lg">
                <TrendingUp size={20} style={{ color: ADMIN_GREEN }} />
              </div>
              Product Listing Trend
            </h3>
            <p className="text-sm text-gray-600">Product creation trends (Last 90 days)</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={productTrendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" stroke="#9ca3af" angle={-45} textAnchor="end" height={80} />
            <YAxis stroke="#9ca3af" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: `2px solid ${ADMIN_GREEN}`,
                borderRadius: '12px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}
            />
            <Legend wrapperStyle={{ paddingTop: '15px', fontSize: '12px' }} />
            <Line type="monotone" dataKey="new_products" stroke={ADMIN_GREEN} strokeWidth={2} dot={{ fill: ADMIN_GREEN, r: 3 }} name="New" />
            <Line type="monotone" dataKey="approved_products" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981', r: 3 }} name="Approved" />
            <Line type="monotone" dataKey="pending_products" stroke="#f59e0b" strokeWidth={2} dot={{ fill: '#f59e0b', r: 3 }} name="Pending" />
            <Line type="monotone" dataKey="rejected_products" stroke="#ef4444" strokeWidth={2} dot={{ fill: '#ef4444', r: 3 }} name="Rejected" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Listing Type Distribution Chart */}
      <div className="lg:col-span-1 bg-white rounded-2xl border border-gray-100 p-8 shadow-sm hover:shadow-lg transition-all" style={{ borderTop: `4px solid ${ADMIN_GREEN}` }}>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-3 mb-2">
              <div className="bg-indigo-100 p-2.5 rounded-lg">
                <BarChart3 size={20} style={{ color: '#6366f1' }} />
              </div>
              Listing Type Distribution
            </h3>
            <p className="text-sm text-gray-600">Product breakdown by type</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={productTrendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="date" stroke="#9ca3af" angle={-45} textAnchor="end" height={80} />
            <YAxis stroke="#9ca3af" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: `2px solid ${ADMIN_GREEN}`,
                borderRadius: '12px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}
            />
            <Legend wrapperStyle={{ paddingTop: '15px', fontSize: '12px' }} />
            <Bar dataKey="for_sale" fill="#3b82f6" name="For Sale" radius={[8, 8, 0, 0]} />
            <Bar dataKey="for_rent" fill="#8b5cf6" name="For Rent" radius={[8, 8, 0, 0]} />
            <Bar dataKey="services" fill="#ec4899" name="Services" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Top Sellers Chart */}
      <div className="lg:col-span-1 bg-white rounded-2xl border border-gray-100 p-8 shadow-sm hover:shadow-lg transition-all" style={{ borderTop: `4px solid ${ADMIN_GREEN}` }}>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-3 mb-2">
              <div className="bg-amber-100 p-2.5 rounded-lg">
                <BarChart3 size={20} style={{ color: '#b45309' }} />
              </div>
              Top 8 Sellers
            </h3>
            <p className="text-sm text-gray-600">Ranked by total revenue</p>
          </div>
        </div>
        
        {topSellersData.length > 0 ? (
          <div className="space-y-4">
            {/* Bar Chart */}
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topSellersData.slice(0, 8)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="username" stroke="#9ca3af" angle={-45} textAnchor="end" height={80} fontSize={12} />
                <YAxis stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: `2px solid ${ADMIN_GREEN}`,
                    borderRadius: '12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }}
                  formatter={(value: any, name: string) => {
                    if (name === 'total_revenue') return [`₱${Number(value).toLocaleString('en-PH')}`, 'Total Revenue'];
                    return value;
                  }}
                  labelFormatter={(label) => `Seller: ${label}`}
                />
                <Bar dataKey="total_revenue" fill={ADMIN_GREEN} name="Revenue" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>

            {/* Seller Details Table */}
            <div className="mt-6 space-y-2 max-h-64 overflow-y-auto">
              <div className="text-xs font-semibold text-gray-600 uppercase tracking-wider px-2">Top Performers</div>
              {topSellersData.slice(0, 8).map((seller, idx) => (
                <div key={seller.user_id} className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-100 hover:border-gray-200 transition-all">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full font-bold text-xs text-white" style={{ backgroundColor: ADMIN_GREEN }}>
                        {idx + 1}
                      </span>
                      <p className="text-sm font-bold text-gray-900 truncate">{seller.full_name}</p>
                      <span className="text-xs text-gray-500">@{seller.username}</span>
                    </div>
                    <div className="flex items-center gap-3 ml-8">
                      {/* Revenue Badge */}
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-semibold text-gray-700">₱{(seller.total_revenue / 1000).toFixed(1)}K</span>
                      </div>
                      {/* Rating Badge */}
                      <div className="flex items-center gap-0.5">
                        <svg className="w-3.5 h-3.5 text-yellow-400 fill-current" viewBox="0 0 20 20">
                          <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                        </svg>
                        <span className="text-xs font-semibold text-gray-700">
                          {seller.average_seller_rating > 0 ? seller.average_seller_rating.toFixed(1) : 'N/A'}
                        </span>
                      </div>
                      {/* Sales Count Badge */}
                      <div className="flex items-center gap-1">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
                          {seller.total_products_sold} sold
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center py-12 text-gray-500">
            <p>No seller data available</p>
          </div>
        )}
      </div>

      {/* Transaction Status Distribution */}
      <div className="lg:col-span-1 bg-white rounded-2xl border border-gray-100 p-8 shadow-sm hover:shadow-lg transition-all" style={{ borderTop: `4px solid ${ADMIN_GREEN}` }}>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-3 mb-2">
              <div className="bg-purple-100 p-2.5 rounded-lg">
                <Activity size={20} style={{ color: '#7c3aed' }} />
              </div>
              Transaction Status
            </h3>
            <p className="text-sm text-gray-600">Status breakdown</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={transactionStatusData as any}
              dataKey="count"
              nameKey="transaction_status"
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              label={(entry: any) => `${entry.transaction_status}\n${entry.percentage}%`}
              labelLine={false}
            >
              {transactionStatusData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={ADMIN_COLORS[index % ADMIN_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: `2px solid ${ADMIN_GREEN}`,
                borderRadius: '12px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Daily Metrics Pareto Chart - Simplified */}
      {dailyMetrics && (
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-8 shadow-sm hover:shadow-lg transition-all" style={{ borderTop: `4px solid ${ADMIN_GREEN}` }}>
          <div className="mb-8">
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-3 mb-2">
              <div className="bg-cyan-100 p-2.5 rounded-lg">
                <Zap size={20} style={{ color: '#0891b2' }} />
              </div>
              Daily Metrics Analysis
            </h3>
            <p className="text-sm text-gray-600">Today's top metrics with cumulative impact</p>
          </div>
          
          {(() => {
            const metricsData = [
              { name: 'Active Users', value: dailyMetrics?.active_users_24h || 0 },
              { name: 'New Users', value: dailyMetrics?.new_users_today || 0 },
              { name: 'Active Listings', value: dailyMetrics?.active_listings || 0 },
              { name: 'New Listings', value: dailyMetrics?.new_listings_today || 0 },
              { name: 'Transactions', value: dailyMetrics?.transactions_today || 0 },
              { name: 'Completed', value: dailyMetrics?.completed_today || 0 },
              { name: 'Product Views', value: dailyMetrics?.total_product_views || 0 },
              { name: 'Pending Approval', value: dailyMetrics?.pending_approvals || 0 }
            ];
            
            const sortedData = [...metricsData].sort((a, b) => b.value - a.value);
            const totalValue = sortedData.reduce((sum, item) => sum + item.value, 0);
            
            let cumulativeSum = 0;
            const chartData = sortedData.map((item) => {
              cumulativeSum += item.value;
              return {
                ...item,
                percentage: totalValue > 0 ? (item.value / totalValue) * 100 : 0,
                cumulative: (cumulativeSum / totalValue) * 100
              };
            });

            return (
              <div className="space-y-6">
                {/* Chart */}
                <ResponsiveContainer width="100%" height={320}>
                  <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 80 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" stroke="#9ca3af" angle={-45} textAnchor="end" height={100} />
                    <YAxis yAxisId="left" stroke="#9ca3af" />
                    <YAxis yAxisId="right" orientation="right" stroke={ADMIN_GREEN} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: `2px solid ${ADMIN_GREEN}`,
                        borderRadius: '8px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                      }}
                      formatter={(value: any, name: string) => {
                        if (name === 'value') return [value.toLocaleString(), 'Count'];
                        if (name === 'cumulative') return [`${value.toFixed(1)}%`, 'Cumulative'];
                        return value;
                      }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '15px' }} />
                    <Bar yAxisId="left" dataKey="value" fill="#3b82f6" name="value" radius={[6, 6, 0, 0]} />
                    <Line yAxisId="right" type="monotone" dataKey="cumulative" stroke={ADMIN_GREEN} strokeWidth={2} name="cumulative" dot={{ fill: ADMIN_GREEN, r: 3 }} />
                  </ComposedChart>
                </ResponsiveContainer>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {chartData.slice(0, 4).map((item, idx) => (
                    <div key={idx} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                      <p className="text-xs text-gray-600 font-medium mb-1">{item.name}</p>
                      <p className="text-lg font-bold text-gray-900">{item.value.toLocaleString()}</p>
                      <p className="text-xs text-gray-500 mt-1">{item.percentage.toFixed(1)}% share</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Category Pareto Chart */}
      {categoryPareto.length > 0 && (
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-8 shadow-sm hover:shadow-lg transition-all" style={{ borderTop: `4px solid ${ADMIN_GREEN}` }}>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-3 mb-2">
                <div className="bg-rose-100 p-2.5 rounded-lg">
                  <TrendingUp size={20} style={{ color: '#e11d48' }} />
                </div>
                Category Pareto Analysis
              </h3>
              <p className="text-sm text-gray-600">Revenue distribution by category with cumulative percentage</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={350}>
            <ComposedChart data={categoryPareto} margin={{ top: 10, right: 30, left: 0, bottom: 80 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="category_name" 
                stroke="#9ca3af" 
                angle={-45} 
                textAnchor="end" 
                height={100}
              />
              <YAxis yAxisId="left" stroke="#9ca3af" label={{ value: 'Revenue (₱)', angle: -90, position: 'insideLeft' }} />
              <YAxis yAxisId="right" orientation="right" stroke={ADMIN_GREEN} label={{ value: 'Cumulative %', angle: 90, position: 'insideRight' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: `2px solid ${ADMIN_GREEN}`,
                  borderRadius: '12px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}
                formatter={(value: any, name: string) => {
                  if (name === 'monthly_revenue') return [`₱${Number(value).toLocaleString()}`, 'Revenue'];
                  if (name === 'cumulative_percentage') return [`${value.toFixed(1)}%`, 'Cumulative %'];
                  return value;
                }}
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Bar yAxisId="left" dataKey="monthly_revenue" fill="#3b82f6" name="Monthly Revenue" radius={[8, 8, 0, 0]} />
              <Line yAxisId="right" type="monotone" dataKey="cumulative_percentage" stroke={ADMIN_GREEN} strokeWidth={3} name="Cumulative %" dot={{ fill: ADMIN_GREEN, r: 4 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════════════
// DATA TABLE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════════

interface TableProps {
  title: string;
  icon: React.ReactNode;
  data: any[];
  loading: boolean;
  columns: Array<{
    key: string;
    label: string;
    render?: (row: any) => React.ReactNode;
  }>;
}

const DataTable: React.FC<TableProps> = ({ title, icon, data, loading, columns }) => {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const itemsPerPage = 10;

  const filtered = data.filter((row) =>
    columns.some((col) =>
      String(row[col.key]).toLowerCase().includes(search.toLowerCase())
    )
  );

  const paginated = filtered.slice(page * itemsPerPage, (page + 1) * itemsPerPage);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-lg transition-all">
      {/* Header */}
      <div className="px-8 py-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-3">
          <div className="bg-blue-100 p-2.5 rounded-lg">
            {icon}
          </div>
          {title}
        </h3>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              className="pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gradient-to-r from-gray-50 to-gray-50 border-b border-gray-200">
            <tr>
              {columns.map((col) => (
                <th key={col.key} className="px-8 py-4 text-left font-semibold text-gray-700">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-8 py-12 text-center text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : paginated.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-8 py-12 text-center text-gray-500">
                  No data available
                </td>
              </tr>
            ) : (
              paginated.map((row, idx) => (
                <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  {columns.map((col) => (
                    <td key={col.key} className="px-8 py-4 text-gray-700">
                      {col.render ? col.render(row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {filtered.length > itemsPerPage && (
        <div className="px-8 py-4 border-t border-gray-100 bg-gradient-to-r from-gray-50 to-white flex items-center justify-between">
          <p className="text-sm text-gray-600 font-medium">
            Showing {page * itemsPerPage + 1} to {Math.min((page + 1) * itemsPerPage, filtered.length)} of {filtered.length}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 disabled:opacity-50 hover:bg-gray-50 transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(page + 1)}
              disabled={(page + 1) * itemsPerPage >= filtered.length}
              className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 disabled:opacity-50 hover:bg-gray-50 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════════
// CONFIRMATION MODAL COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════════

interface ConfirmationModalProps {
  isOpen: boolean;
  type: 'approve' | 'reject';
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  type,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isLoading = false,
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null;

  const getIcon = () => {
    return type === 'approve' ? (
      <CheckCircle size={48} className="text-green-600" />
    ) : (
      <XCircle size={48} className="text-red-600" />
    );
  };

  const getButtonColor = () => {
    return type === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-6 animate-in fade-in zoom-in duration-200">
        {/* Icon */}
        <div className="flex justify-center">
          {getIcon()}
        </div>

        {/* Content */}
        <div className="space-y-2 text-center">
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          <p className="text-gray-600 text-sm leading-relaxed">{message}</p>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 pt-4">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex-1 px-4 py-2 ${getButtonColor()} text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Processing...
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════════
// LOADING MODAL COMPONENT (FOR REFRESH)
// ═══════════════════════════════════════════════════════════════════════════════════

interface LoadingModalProps {
  isOpen: boolean;
  message?: string;
}

const LoadingModal: React.FC<LoadingModalProps> = ({ isOpen, message = 'Refreshing data...' }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4w bg-opacity-30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-8 space-y-6 animate-in fade-in zoom-in duration-200">
        {/* Spinner Icon */}
        <div className="flex justify-center">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-4 border-gray-200"></div>
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-green-600 border-r-green-600 animate-spin" style={{ borderTopColor: '#208756', borderRightColor: '#208756' }}></div>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-3 text-center">
          <h2 className="text-2xl font-bold text-gray-900">Refreshing Data</h2>
          <p className="text-gray-600 text-sm leading-relaxed">{message}</p>
          <p className="text-xs text-gray-500 font-medium">Please wait, this may take a moment...</p>
        </div>
      </div>
    </div>
  );
};


// ═══════════════════════════════════════════════════════════════════════════════════
// MAIN ADMIN DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════════

const AdminDashboard: React.FC = () => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshModalOpen, setRefreshModalOpen] = useState(false);
  const [activeMainTab, setActiveMainTab] = useState<'overview' | 'management'>('overview');
  const [activeDataTab, setActiveDataTab] = useState<'products' | 'transactions' | 'activity'>('products');
  const [activeKpiTab, setActiveKpiTab] = useState<'users' | 'products' | 'transactions' | 'revenue'>('users');

  // Platform Overview
  const [overview, setOverview] = useState<PlatformOverview | null>(null);
  const [productsSold, setProductsSold] = useState<number>(0);
  const [blockchainPending, setBlockchainPending] = useState<number>(0);
  const [blockchainConfirmed, setBlockchainConfirmed] = useState<number>(0);
  const [totalPendingTransactions, setTotalPendingTransactions] = useState<number>(0);
  const [totalAcceptedTransactions, setTotalAcceptedTransactions] = useState<number>(0);

  // Transaction Data
  const [transactions, setTransactions] = useState<RecentTransaction[]>([]);
  const [userActivity, setUserActivity] = useState<UserActivity[]>([]);
  const [pendingProducts, setPendingProducts] = useState<PendingProduct[]>([]);

  // Analytics Data
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [userGrowthData, setUserGrowthData] = useState<UserGrowthData[]>([]);
  const [topSellersData, setTopSellersData] = useState<TopSellerData[]>([]);
  const [transactionStatusData, setTransactionStatusData] = useState<TransactionStatusData[]>([]);
  const [productTrendData, setProductTrendData] = useState<ProductTrendData[]>([]);
  const [dailyMetrics, setDailyMetrics] = useState<DailyPlatformMetrics | null>(null);
  const [categoryPareto, setCategoryPareto] = useState<MonthlyCategoryPareto[]>([]);

  // Pending Product Details
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [productImages, setProductImages] = useState<Record<number, string[]>>({});
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [rejectingId, setRejectingId] = useState<number | null>(null);

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'approve' | 'reject';
    productId: number | null;
    productName: string;
  }>({
    isOpen: false,
    type: 'approve',
    productId: null,
    productName: ''
  });

  // Copy to clipboard state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // User management state
  const [userActionModal, setUserActionModal] = useState<{
    isOpen: boolean;
    type: 'promote' | 'delete';
    userId: number | null;
    username: string;
  }>({
    isOpen: false,
    type: 'promote',
    userId: null,
    username: ''
  });
  const [performingAction, setPerformingAction] = useState<number | null>(null);

  const loadAllData = useCallback(async () => {
    try {
      const [
        overviewData,
        transactionsData,
        userActivityData,
        pendingProductsData,
        revenueData,
        userGrowthData,
        topSellersData,
        statusData,
        productTrendDataResponse,
        productsSoldData,
        blockchainPendingData,
        blockchainConfirmedData,
        pendingTransactionsData,
        acceptedTransactionsData,
        dailyMetricsData,
        categoryParetoData
      ] = await Promise.all([
        adminService.getPlatformOverview(),
        adminService.getRecentTransactions(20),
        adminService.getUserActivity(20),
        adminService.getPendingProducts(20),
        adminService.getRevenueTrend(),
        adminService.getUserGrowth(),
        adminService.getTopSellers(10),
        adminService.getTransactionStatusDistribution(),
        adminService.getProductTrend(),
        adminService.getTotalProductsSold(),
        adminService.getBlockchainPendingCount(),
        adminService.getBlockchainConfirmedCount(),
        adminService.getTotalPendingTransactions(),
        adminService.getTotalAcceptedTransactions(),
        adminService.getDailyPlatformMetrics(),
        adminService.getMonthlyCategoryPareto()
      ]);

      if (overviewData) setOverview(overviewData);
      if (transactionsData) setTransactions(transactionsData);
      if (userActivityData) setUserActivity(userActivityData);
      if (pendingProductsData) setPendingProducts(pendingProductsData);
      if (productsSoldData) setProductsSold(productsSoldData);
      setBlockchainPending(blockchainPendingData);
      setBlockchainConfirmed(blockchainConfirmedData);
      setTotalPendingTransactions(pendingTransactionsData);
      setTotalAcceptedTransactions(acceptedTransactionsData);
      
      if (revenueData && revenueData.length > 0) {
        const chartData = revenueData.map((d: RevenueData) => ({
          date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          revenue: d.revenue,
          transactions: d.transactions,
          avg_value: d.avg_value
        }));
        setRevenueData(chartData);
      }
      
      if (userGrowthData && userGrowthData.length > 0) {
        const chartData = userGrowthData.map((d: UserGrowthData) => ({
          date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          new_users: d.new_users,
          cumulative_users: d.cumulative_users
        }));
        setUserGrowthData(chartData);
      }
      
      if (topSellersData) setTopSellersData(topSellersData);
      if (statusData) setTransactionStatusData(statusData);
      if (productTrendDataResponse && productTrendDataResponse.length > 0) {
        const chartData = productTrendDataResponse.map((d: ProductTrendData) => ({
          date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          new_products: d.new_products,
          cumulative_products: d.cumulative_products,
          approved_products: d.approved_products,
          pending_products: d.pending_products,
          rejected_products: d.rejected_products,
          for_sale: d.for_sale,
          for_rent: d.for_rent,
          services: d.services
        }));
        setProductTrendData(chartData);
      }

      if (dailyMetricsData) setDailyMetrics(dailyMetricsData);
      if (categoryParetoData && categoryParetoData.length > 0) setCategoryPareto(categoryParetoData);

      setLoading(false);
    } catch (error) {
      console.error('❌ Error loading dashboard data:', error);
      setLoading(false);
    }
  }, []);

  const fetchProductImages = useCallback(async (productId: number) => {
    try {
      if (!supabase) {
        console.error('❌ Supabase not initialized');
        return [];
      }

      console.log(`🔍 Fetching images from product_images table for product ${productId}...`);

      // Query database
      const { data: imagesData, error } = await supabase!
        .from('product_images')
        .select('image_id, storage_path, image_order')
        .eq('product_id', productId)
        .order('image_order', { ascending: true });

      if (error) {
        console.error(`❌ Database error for product ${productId}:`, error);
        setProductImages((prev) => ({ ...prev, [productId]: [] }));
        return [];
      }

      if (!imagesData || imagesData.length === 0) {
        console.warn(`⚠️ No images found in product_images table for product ${productId}`);
        setProductImages((prev) => ({ ...prev, [productId]: [] }));
        return [];
      }

      console.log(`📝 Found ${imagesData.length} image records for product ${productId}`);

      // Store in state - keeping as objects for ImageCarousel compatibility
      setProductImages((prev) => ({
        ...prev,
        [productId]: imagesData as any
      }));

      return imagesData;
    } catch (error) {
      console.error(`❌ Error fetching images for product ${productId}:`, error);
      return [];
    }
  }, []);

  const handleApproveProduct = useCallback((productId: number) => {
    const product = pendingProducts.find(p => p.product_id === productId);
    if (product) {
      setConfirmModal({
        isOpen: true,
        type: 'approve',
        productId,
        productName: product.product_name
      });
    }
  }, [pendingProducts]);

  const confirmApproveProduct = useCallback(async () => {
    if (!confirmModal.productId) return;
    
    setApprovingId(confirmModal.productId);
    try {
      console.log(`✅ Approving product ${confirmModal.productId}...`);
      
      const { data, error } = await supabase!
        .from('products')
        .update({ status: 'APPROVED' })
        .eq('product_id', confirmModal.productId)
        .select();

      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      console.log(`✅ Product ${confirmModal.productId} approved successfully`, data);
      
      // Wait a moment then refresh data to ensure database is updated
      setTimeout(async () => {
        await loadAllData();
      }, 500);
      
      setSelectedProductId(null);
      setConfirmModal({ isOpen: false, type: 'approve', productId: null, productName: '' });
    } catch (error) {
      console.error('❌ Error approving product:', error);
      alert('❌ Failed to approve product. Please try again.');
    } finally {
      setApprovingId(null);
    }
  }, [confirmModal.productId, loadAllData]);

  const handleRejectProduct = useCallback((productId: number) => {
    const product = pendingProducts.find(p => p.product_id === productId);
    if (product) {
      setConfirmModal({
        isOpen: true,
        type: 'reject',
        productId,
        productName: product.product_name
      });
    }
  }, [pendingProducts]);

  const confirmRejectProduct = useCallback(async () => {
    if (!confirmModal.productId) return;
    
    setRejectingId(confirmModal.productId);
    try {
      console.log(`❌ Rejecting product ${confirmModal.productId}...`);
      
      const { data, error } = await supabase!
        .from('products')
        .update({ status: 'REJECTED' })
        .eq('product_id', confirmModal.productId)
        .select();

      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      console.log(`❌ Product ${confirmModal.productId} rejected successfully`, data);
      
      // Wait a moment then refresh data to ensure database is updated
      setTimeout(async () => {
        await loadAllData();
      }, 500);
      
      setSelectedProductId(null);
      setConfirmModal({ isOpen: false, type: 'approve', productId: null, productName: '' });
    } catch (error) {
      console.error('❌ Error rejecting product:', error);
      alert('❌ Failed to reject product. Please try again.');
    } finally {
      setRejectingId(null);
    }
  }, [confirmModal.productId, loadAllData]);

  const handleCloseModal = useCallback(() => {
    setConfirmModal({ isOpen: false, type: 'approve', productId: null, productName: '' });
  }, []);

  const handleCopyTransactionId = (txId: string) => {
    navigator.clipboard.writeText(txId);
    setCopiedId(txId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getEtherscanLink = (txHash: string | null | undefined): string | null => {
    if (!txHash) return null;
    return `https://sepolia.etherscan.io/tx/${txHash}`;
  };

  const handlePromoteUser = (userId: number, username: string) => {
    setUserActionModal({
      isOpen: true,
      type: 'promote',
      userId,
      username
    });
  };

  const handleDeleteUser = (userId: number, username: string) => {
    setUserActionModal({
      isOpen: true,
      type: 'delete',
      userId,
      username
    });
  };

  const confirmUserAction = async () => {
    if (!userActionModal.userId || !profile?.user_id) return;

    setPerformingAction(userActionModal.userId);
    try {
      const profileUserId = parseInt(profile.user_id, 10);
      const result = userActionModal.type === 'promote'
        ? await adminService.promoteUserToAdmin(profileUserId, userActionModal.userId)
        : await adminService.deleteUser(profileUserId, userActionModal.userId);

      if (result.success) {
        console.log(`✅ ${result.message}`);
        // Refresh data
        setTimeout(async () => {
          await loadAllData();
        }, 500);
        setUserActionModal({ isOpen: false, type: 'promote', userId: null, username: '' });
      } else {
        alert(`❌ ${result.error}`);
      }
    } catch (error) {
      console.error('❌ Error performing user action:', error);
      alert('❌ Failed to perform action. Please try again.');
    } finally {
      setPerformingAction(null);
    }
  };

  const closeUserActionModal = () => {
    setUserActionModal({ isOpen: false, type: 'promote', userId: null, username: '' });
  };

  useEffect(() => {
    document.title = 'Admin Dashboard - CSU Marketplace';
    loadAllData();

    // Real-time subscriptions
    const channels = [
      supabase?.channel('admin-products').on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        setRefreshing(true);
        setTimeout(() => {
          loadAllData().then(() => setRefreshing(false));
        }, 500);
      }).subscribe(),

      supabase?.channel('admin-transactions').on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => {
        setRefreshing(true);
        setTimeout(() => {
          loadAllData().then(() => setRefreshing(false));
        }, 500);
      }).subscribe(),

      supabase?.channel('admin-users').on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'users' }, () => {
        setRefreshing(true);
        setTimeout(() => {
          loadAllData().then(() => setRefreshing(false));
        }, 500);
      }).subscribe()
    ];

    return () => {
      channels.forEach((ch) => ch?.unsubscribe());
    };
  }, [loadAllData]);

  // Auto-load images for pending products
  useEffect(() => {
    console.log(`\n📋 PENDING PRODUCTS LOADED: ${pendingProducts.length} products`);
    
    if (pendingProducts.length > 0) {
      console.log(`🚀 Auto-loading images for all pending products...`);
      pendingProducts.forEach((product) => {
        console.log(`  - Loading images for product ${product.product_id}: ${product.product_name}`);
        fetchProductImages(product.product_id).then((urls) => {
          console.log(`  ✅ Product ${product.product_id} got ${urls.length} images`);
        });
      });
    }
  }, [pendingProducts, fetchProductImages]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex flex-col">
      <div className="flex-1">
        {/* Header */}
        <div className="sticky top-0 z-10 shadow-lg" style={{ backgroundColor: ADMIN_GREEN }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2">
                  Welcome back, {profile?.first_name} <span className="text-3xl inline-block animate-wave">👋</span>
                </h1>
                <p className="text-white text-opacity-90 text-sm leading-relaxed">
                  Monitor platform activity, manage approvals, and keep the marketplace running smoothly.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={async () => {
                    setRefreshing(true);
                    setRefreshModalOpen(true);
                    try {
                      const result = await adminService.refreshMaterializedViews();
                      if (result.success) {
                        console.log('✅ Materialized views refreshed');
                        // Reload all dashboard data
                        await loadAllData();
                        setRefreshModalOpen(false);
                        // Show success alert
                      } else {
                        console.error('❌ Refresh error:', result.error);
                        setRefreshModalOpen(false);
                        setTimeout(() => {
                          alert(`❌ Refresh failed: ${result.error}`);
                        }, 300);
                      }
                    } catch (error) {
                      console.error('❌ Error refreshing views:', error);
                      setRefreshModalOpen(false);
                      setTimeout(() => {
                        alert('❌ Failed to refresh data');
                      }, 300);
                    } finally {
                      setRefreshing(false);
                    }
                  }}
                  disabled={refreshing}
                  className="p-2 rounded-lg transition-colors disabled:opacity-50"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)', color: 'white' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
                  title="Refresh materialized views"
                >
                  <RefreshCw size={20} className={`${refreshing ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={async () => {
                    setRefreshing(true);
                    try {
                      const pdfBlob = await adminService.generateAdminReportPDF(
                        overview,
                        transactions,
                        userActivity,
                        pendingProducts,
                        topSellersData,
                        transactionStatusData
                      );

                      if (pdfBlob) {
                        // Create download link
                        const url = URL.createObjectURL(pdfBlob);
                        const link = document.createElement('a');
                        link.href = url;
                        const timestamp = new Date().toISOString().split('T')[0];
                        link.download = `csu-marketplace-admin-report-${timestamp}.pdf`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        URL.revokeObjectURL(url);
                        console.log('✅ Report downloaded successfully');
                      } else {
                        alert('❌ Failed to generate report');
                      }
                    } catch (error) {
                      console.error('❌ Error downloading report:', error);
                      alert('❌ Failed to download report');
                    } finally {
                      setRefreshing(false);
                    }
                  }}
                  disabled={refreshing}
                  className="p-2 rounded-lg transition-colors disabled:opacity-50"
                  style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)', color: 'white' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
                  title="Download PDF report"
                >
                  <Download size={20} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
          {/* Unified Platform & Management Container */}
          <div className="rounded-3xl overflow-hidden shadow-2xl">
            {/* Header Section with Gradient */}
            <div className="relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${ADMIN_GREEN} 0%, #1a6d45 100%)` }}>
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full -mr-48 -mt-48"></div>
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-white rounded-full -ml-48 -mb-48"></div>
              </div>
              
              <div className="relative px-8 py-8">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                      Dashboard Center
                    </h2>
                    <p className="text-white text-opacity-80 text-sm">Comprehensive platform insights and management tools</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Tab Navigation - Redesigned */}
            <div className="bg-white px-8 py-6 border-b border-gray-100 flex gap-1 overflow-x-auto">
              {[
                { id: 'overview' as const, label: 'Platform Metrics', icon: <BarChart3 size={18} /> },
                { id: 'management' as const, label: 'Management Center', icon: <Activity size={18} /> }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveMainTab(tab.id)}
                  className={`px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition-all whitespace-nowrap ${
                    activeMainTab === tab.id
                      ? 'text-white shadow-lg scale-100'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                  style={{
                    backgroundColor: activeMainTab === tab.id ? ADMIN_GREEN : 'transparent',
                  }}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Platform Metrics Tab - KPI Cards */}
            {activeMainTab === 'overview' && (
              <div className="bg-gradient-to-br from-gray-50 via-white to-gray-50 p-8">

                {/* Sub-Tab Navigation - Redesigned */}
                <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
                  {(['users', 'products', 'transactions', 'revenue'] as const).map((tab) => {
                    const icons = {
                      users: <Users size={18} />,
                      products: <Package size={18} />,
                      transactions: <Activity size={18} />,
                      revenue: <TrendingUp size={18} />
                    };
                    const labels = {
                      users: 'Users',
                      products: 'Products',
                      transactions: 'Transactions',
                      revenue: 'Revenue'
                    };
                    
                    return (
                      <button
                        key={tab}
                        onClick={() => {
                          const tabElement = document.querySelector(`[data-kpi-tab="${tab}"]`) as HTMLElement;
                          document.querySelectorAll('[data-kpi-tab]').forEach(el => {
                            const htmlEl = el as HTMLElement;
                            htmlEl.style.display = 'none';
                          });
                          if (tabElement) tabElement.style.display = 'grid';
                          setActiveKpiTab(tab);
                        }}
                        className={`px-6 py-3 rounded-xl font-semibold flex items-center gap-2 whitespace-nowrap transition-all ${
                          activeKpiTab === tab
                            ? 'text-white shadow-lg'
                            : 'text-gray-600 hover:text-gray-900 bg-white hover:shadow-md'
                        }`}
                        style={{
                          backgroundColor: activeKpiTab === tab ? ADMIN_GREEN : undefined,
                        }}
                      >
                        {icons[tab]}
                        {labels[tab]}
                      </button>
                    );
                  })}
                </div>

                {/* KPI Cards Grid - Enhanced */}
                {(['users', 'products', 'transactions', 'revenue'] as const).map((tab) => (
                  <div 
                    key={tab}
                    data-kpi-tab={tab}
                    style={{ display: tab === 'users' ? 'grid' : 'none' }}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
                  >
                    {tab === 'users' && (
                      <>
                        <KpiCard icon={<Users size={20} />} label="Active Users" value={overview?.total_active_users || 0} subtext={`${overview?.new_users_30d || 0} new (30d)`} />
                        <KpiCard icon={<Star size={20} />} label="Total Reviews" value={overview?.total_reviews || 0} subtext={`Avg rating ${overview?.platform_avg_rating?.toFixed(1) || '0.0'} ⭐`} />
                        <KpiCard icon={<Package size={20} />} label="Products Sold" value={productsSold} subtext="By all sellers" />
                        <KpiCard icon={<Activity size={20} />} label="30-Day Active" value={overview?.new_users_30d || 0} subtext="New registrations" />
                      </>
                    )}
                    {tab === 'products' && (
                      <>
                        <KpiCard icon={<Package size={20} />} label="Total Products" value={overview?.total_products || 0} subtext={`${overview?.new_products_7d || 0} new (7d)`} trend={5} />
                        <KpiCard icon={<CheckCircle size={20} />} label="Approved" value={overview?.approved_products || 0} subtext={`${overview?.active_listings || 0} active`} />
                        <KpiCard icon={<AlertCircle size={20} />} label="Pending Approval" value={overview?.pending_products || 0} subtext="Awaiting review" />
                        <KpiCard icon={<Eye size={20} />} label="Total Favorites" value={overview?.total_favorites || 0} subtext="Bookmarked products" />
                      </>
                    )}
                    {tab === 'transactions' && (
                      <>
                        <KpiCard icon={<Activity size={20} />} label="Total Transactions" value={overview?.total_transactions || 0} subtext={`${overview?.transactions_24h || 0} last 24h`} />
                        <KpiCard icon={<CheckCircle size={20} />} label="Completed" value={overview?.completed_transactions || 0} subtext={`${overview?.pending_transactions || 0} pending`} />
                        <KpiCard icon={<Zap size={20} />} label="Total Pending" value={totalPendingTransactions} subtext="Awaiting acceptance" />
                        <KpiCard icon={<CheckCircle size={20} />} label="Total Accepted" value={totalAcceptedTransactions} subtext="Confirmed orders" />
                      </>
                    )}
                    {tab === 'revenue' && (
                      <>
                        <KpiCard icon={<TrendingUp size={20} />} label="7-Day Revenue" value={overview ? `₱${overview.revenue_7d.toLocaleString('en-PH', { maximumFractionDigits: 0 })}` : '—'} subtext="Last 7 days" />
                        <KpiCard icon={<TrendingUp size={20} />} label="30-Day Revenue" value={overview ? `₱${overview.revenue_30d.toLocaleString('en-PH', { maximumFractionDigits: 0 })}` : '—'} subtext="Last 30 days" />
                        <KpiCard icon={<AlertCircle size={20} />} label="Blockchain Pending" value={blockchainPending} subtext="Awaiting confirmation" />
                        <KpiCard icon={<CheckCircle size={20} />} label="Blockchain Confirmed" value={blockchainConfirmed} subtext="Confirmed records" />
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Management Center Tab - Data Tables */}
            {activeMainTab === 'management' && (
              <div className="bg-gradient-to-br from-gray-50 via-white to-gray-50 p-8">
                <div className="mb-8">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Management Center</h3>
                  <p className="text-gray-600 text-sm">Monitor and manage platform operations efficiently</p>
                </div>

                {/* Data Sub-Tab Navigation - Redesigned */}
                <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
                  {[
                    { id: 'products' as const, label: 'Pending Approvals', icon: <AlertCircle size={18} /> },
                    { id: 'transactions' as const, label: 'Recent Transactions', icon: <Activity size={18} /> },
                    { id: 'activity' as const, label: 'User Management', icon: <Users size={18} /> }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveDataTab(tab.id)}
                      className={`px-6 py-3 rounded-xl font-semibold flex items-center gap-2 whitespace-nowrap transition-all ${
                        activeDataTab === tab.id
                          ? 'text-white shadow-lg'
                          : 'text-gray-600 hover:text-gray-900 bg-white hover:shadow-md'
                      }`}
                      style={{
                        backgroundColor: activeDataTab === tab.id ? ADMIN_GREEN : undefined,
                      }}
                    >
                      {tab.icon}
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Dynamic Data Table Content */}
                {activeDataTab === 'products' && (
                  <div>
                    <div className="mb-6 flex items-center justify-between">
                      <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <div className="bg-yellow-100 p-2 rounded-lg">
                          <AlertCircle size={20} className="text-yellow-600" />
                        </div>
                        Pending Product Approvals ({pendingProducts.length})
                      </h3>
                    </div>

                    {loading ? (
                      <div className="text-center py-12 text-gray-500">Loading products...</div>
                    ) : pendingProducts.length === 0 ? (
                      <div className="text-center py-12 text-gray-500">No pending products</div>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {pendingProducts.map((product) => {
                          const productImageData = productImages[product.product_id] as any;
                          const isExpanded = selectedProductId === product.product_id;
                          
                          return (
                          <div 
                            key={product.product_id} 
                            className="group bg-white rounded-2xl overflow-hidden hover:shadow-2xl transition-all duration-300 border-2 border-gray-100 hover:border-gray-200"
                          >
                            {/* Product Image */}
                            <div 
                              className="relative w-full cursor-pointer group"
                              style={{ paddingBottom: '100%' }}
                              onClick={() => {
                                setSelectedProductId(isExpanded ? null : product.product_id);
                                if (!productImageData) {
                                  fetchProductImages(product.product_id);
                                }
                              }}
                            >
                              <div className="absolute inset-0">
                                {productImageData ? (
                                  <ImageCarousel
                                    images={productImageData}
                                    productName={product.product_name}
                                    className="h-full w-full"
                                  />
                                ) : (
                                  <div className="w-full h-full bg-gray-100 flex flex-col items-center justify-center">
                                    <Package size={40} className="text-gray-400 mb-2" />
                                    <p className="text-xs text-gray-500">Loading...</p>
                                  </div>
                                )}
                              </div>

                              {/* Pending Badge - Top Left */}
                              <div className="absolute top-2 left-2 bg-yellow-400 px-3 py-1.5 rounded-full text-xs font-bold text-gray-900 shadow-md">
                                {Math.round(product.hours_pending)}h pending
                              </div>

                              {/* Image Counter - Top Right */}
                              {productImageData && productImageData.length > 1 && (
                                <div className="absolute top-2 right-2 backdrop-blur-md bg-black bg-opacity-50 px-2.5 py-1 rounded-full flex items-center space-x-1">
                                  <span className="text-xs font-bold text-white">+{productImageData.length - 1}</span>
                                </div>
                              )}
                            </div>

                            {/* Product Info */}
                            <div className="p-3">
                              {/* Product Name */}
                              <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 mb-1" style={{ minHeight: '40px' }}>
                                {product.product_name}
                              </h3>

                              {/* Product Description */}
                              <p className="text-xs text-gray-500 line-clamp-1 mb-2">
                                {product.description}
                              </p>

                              {/* Price & Listing Type Badge */}
                              <div className="flex items-center justify-between mb-3">
                                <p className="text-lg font-bold" style={{ color: ADMIN_GREEN }}>
                                  ₱{product.price.toLocaleString('en-PH', { maximumFractionDigits: 0 })}
                                </p>
                                <div className={`px-2.5 py-1 rounded-full text-xs font-semibold text-white ${
                                  product.listing_type === 'FOR_SALE' 
                                    ? 'bg-[#208756]' 
                                    : product.listing_type === 'FOR_RENT'
                                    ? 'bg-blue-600'
                                    : 'bg-purple-600'
                                }`}>
                                  {product.listing_type === 'FOR_SALE' ? 'For Sale' : product.listing_type === 'FOR_RENT' ? 'For Rent' : 'Service'}
                                </div>
                              </div>

                              {/* Category & Stock */}
                              <div className="mb-3 pb-3 border-b border-gray-100 grid grid-cols-2 gap-2 text-xs">
                                <div>
                                  <p className="text-gray-500 font-medium">Category</p>
                                  <p className="text-gray-700 font-semibold">{product.category_name}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500 font-medium">Stock</p>
                                  <p className="text-gray-700 font-semibold">{product.quantity} units</p>
                                </div>
                              </div>

                              {/* Seller Info */}
                              <div className="flex items-center gap-2 mb-3">
                                <div className="flex-shrink-0">
                                  {product.seller_profile_picture && !product.seller_profile_picture.includes('null') ? (
                                    <img
                                      src={product.seller_profile_picture.startsWith('http') 
                                        ? product.seller_profile_picture 
                                        : `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/profile-pictures/${product.seller_profile_picture}`
                                      }
                                      alt={product.seller_name}
                                      className="w-8 h-8 rounded-full object-cover border-2 border-[#208756]"
                                    />
                                  ) : (
                                    <div className="w-8 h-8 bg-gradient-to-br from-[#208756] to-[#1a6d45] rounded-full flex items-center justify-center">
                                      <Users className="w-4 h-4 text-white" />
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-semibold text-gray-900 truncate">
                                    {product.seller_name}
                                  </p>
                                  <p className="text-xs text-gray-500 truncate">
                                    {product.seller_email}
                                  </p>
                                </div>
                              </div>

                              {/* Seller Rating */}
                              <div className="flex items-center space-x-1 mb-3 pb-3 border-b border-gray-100">
                                <svg className="w-3 h-3 text-yellow-400 fill-current" viewBox="0 0 20 20">
                                  <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                                </svg>
                                <span className="text-xs font-medium text-gray-700">
                                  {product.seller_rating && product.seller_rating > 0 
                                    ? product.seller_rating.toFixed(1) 
                                    : 'New Seller'}
                                </span>
                              </div>

                              {/* Expanded Details */}
                              {isExpanded && (
                                <div className="mb-4 pb-4 border-t border-gray-100 pt-3 text-xs space-y-2">
                                  <div>
                                    <p className="font-semibold text-gray-700 mb-1">Full Description</p>
                                    <p className="text-gray-600 text-xs leading-relaxed">{product.description}</p>
                                  </div>
                                  <div>
                                    <p className="font-semibold text-gray-700 mb-1">Images</p>
                                    <p className="text-gray-600">{product.image_count} images uploaded</p>
                                  </div>
                                  <div>
                                    <p className="font-semibold text-gray-700 mb-1">Submitted</p>
                                    <p className="text-gray-600">
                                      {new Date(product.created_at).toLocaleDateString('en-PH', { 
                                        year: 'numeric', 
                                        month: 'short', 
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </p>
                                  </div>
                                </div>
                              )}

                              {/* Action Buttons */}
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleApproveProduct(product.product_id)}
                                  disabled={approvingId === product.product_id || rejectingId === product.product_id}
                                  className="flex-1 px-3 py-2 hover:opacity-90 disabled:bg-gray-300 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                                  style={{ backgroundColor: ADMIN_GREEN }}
                                >
                                  <ThumbsUp size={14} />
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleRejectProduct(product.product_id)}
                                  disabled={approvingId === product.product_id || rejectingId === product.product_id}
                                  className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                                >
                                  <ThumbsDown size={14} />
                                  Reject
                                </button>
                              </div>
                            </div>
                          </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {activeDataTab === 'transactions' && (
                  <DataTable
                    title="Recent Transactions"
                    icon={<Activity size={20} style={{ color: ADMIN_GREEN }} />}
                    data={transactions}
                    loading={loading}
                    columns={[
                      {
                        key: 'transaction_id',
                        label: 'Transaction ID',
                        render: (row) => (
                          <div className="flex items-center gap-2">
                            <code className="text-xs bg-gray-100 px-2 py-1 rounded">{row.transaction_id.slice(0, 8)}...</code>
                            <button
                              onClick={() => handleCopyTransactionId(row.transaction_id)}
                              className="p-1 hover:bg-gray-100 rounded transition-colors"
                              title="Copy transaction ID"
                            >
                              {copiedId === row.transaction_id ? (
                                <Check size={14} className="text-green-600" />
                              ) : (
                                <Copy size={14} className="text-gray-600 hover:text-gray-900" />
                              )}
                            </button>
                            {row.blockchain_tx_hash && (
                              <a
                                href={getEtherscanLink(row.blockchain_tx_hash) || '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 hover:bg-gray-100 rounded transition-colors"
                                title="View on Etherscan (Sepolia)"
                              >
                                <ExternalLink size={14} className="text-blue-600 hover:text-blue-900" />
                              </a>
                            )}
                          </div>
                        )
                      },
                      { key: 'buyer_username', label: 'Buyer' },
                      { key: 'seller_username', label: 'Seller' },
                      { key: 'item_name', label: 'Item' },
                      {
                        key: 'total_amount',
                        label: 'Amount',
                        render: (row) => `₱${row.total_amount.toLocaleString('en-PH', { maximumFractionDigits: 0 })}`
                      },
                      {
                        key: 'transaction_status',
                        label: 'Status',
                        render: (row) => (
                          <span
                            className="px-2 py-1 rounded-full text-xs font-semibold text-white"
                            style={{ backgroundColor: row.status_color }}
                          >
                            {row.transaction_status}
                          </span>
                        )
                      }
                    ]}
                  />
                )}

                {activeDataTab === 'activity' && (
                  <DataTable
                    title="User Management"
                    icon={<Users size={20} style={{ color: ADMIN_GREEN }} />}
                    data={userActivity}
                    loading={loading}
                    columns={[
                      { key: 'id_number', label: 'ID Number' },
                      { key: 'full_name', label: 'Name' },
                      { key: 'phone_number', label: 'Phone Number' },
                      { key: 'department', label: 'Department' },
                      {
                        key: 'member_since',
                        label: 'Member Since',
                        render: (row) => new Date(row.member_since).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
                      },
                      {
                        key: 'activity_status',
                        label: 'Status',
                        render: (row) => (
                          <span
                            className="px-2 py-1 rounded-full text-xs font-semibold text-white"
                            style={{
                              backgroundColor:
                                row.activity_status === 'Active' ? '#10b981' :
                                row.activity_status === 'Moderate' ? '#f59e0b' :
                                '#6b7280'
                            }}
                          >
                            {row.activity_status}
                          </span>
                        )
                      },
                      {
                        key: 'actions',
                        label: 'Actions',
                        render: (row) => (
                          <div className="flex items-center gap-2">
                            {!row.is_admin && (
                              <button
                                onClick={() => handlePromoteUser(row.user_id, row.username)}
                                disabled={performingAction === row.user_id}
                                className="p-1.5 bg-blue-100 hover:bg-blue-200 disabled:bg-gray-100 text-blue-700 rounded transition-colors"
                                title="Promote to Admin"
                              >
                                <Edit size={14} />
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteUser(row.user_id, row.username)}
                              disabled={performingAction === row.user_id}
                              className="p-1.5 bg-red-100 hover:bg-red-200 disabled:bg-gray-100 text-red-700 rounded transition-colors"
                              title="Delete User"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )
                      }
                    ]}
                  />
                )}
              </div>
            )}
          </div>

          {/* Charts Section */}
          {!loading && (
            <ChartsSection
              revenueData={revenueData}
              userGrowthData={userGrowthData}
              topSellersData={topSellersData}
              transactionStatusData={transactionStatusData}
              productTrendData={productTrendData}
              dailyMetrics={dailyMetrics}
              categoryPareto={categoryPareto}
            />
          )}
        </div>
      </div>

      <Footer />

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        type={confirmModal.type}
        title={confirmModal.type === 'approve' ? 'Approve Product?' : 'Reject Product?'}
        message={
          confirmModal.type === 'approve'
            ? `Are you sure you want to approve "${confirmModal.productName}"? This will make the product visible to all users on the marketplace.`
            : `Are you sure you want to reject "${confirmModal.productName}"? The seller will be notified and the product will not be listed.`
        }
        confirmText={confirmModal.type === 'approve' ? 'Approve' : 'Reject'}
        cancelText="Cancel"
        isLoading={approvingId === confirmModal.productId || rejectingId === confirmModal.productId}
        onConfirm={confirmModal.type === 'approve' ? confirmApproveProduct : confirmRejectProduct}
        onCancel={handleCloseModal}
      />

      {/* User Action Confirmation Modal */}
      <ConfirmationModal
        isOpen={userActionModal.isOpen}
        type={userActionModal.type === 'promote' ? 'approve' : 'reject'}
        title={userActionModal.type === 'promote' ? 'Promote to Admin?' : 'Delete User?'}
        message={
          userActionModal.type === 'promote'
            ? `Are you sure you want to promote "${userActionModal.username}" to admin? They will have access to the admin dashboard and all management features.`
            : `Are you sure you want to delete "${userActionModal.username}"? This action is permanent and will delete all their data including products and orders.`
        }
        confirmText={userActionModal.type === 'promote' ? 'Promote' : 'Delete'}
        cancelText="Cancel"
        isLoading={performingAction === userActionModal.userId}
        onConfirm={confirmUserAction}
        onCancel={closeUserActionModal}
      />

      {/* Refresh Loading Modal */}
      <LoadingModal isOpen={refreshModalOpen} message="Syncing materialized views with latest data..." />
    </div>
  );
};

export default AdminDashboard;

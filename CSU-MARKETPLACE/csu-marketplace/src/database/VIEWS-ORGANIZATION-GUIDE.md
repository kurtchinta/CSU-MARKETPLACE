# CSU Marketplace - Analytics Views Organization Guide

## Quick Navigation

Use `Ctrl+F` in VS Code to search for view names quickly.

---

## File Structure Overview

**Total Views: 33**
- Admin Views: 4
- User Dashboard Views: 5
- User Analytics Chart Views: 8
- Admin Analytics Views: 9
- Materialized Views: 7

---

## SECTION 1: ADMIN DASHBOARD VIEWS (4 Views)
**Lines: 71-280**
**Purpose:** Platform-wide analytics for admin dashboard
**Authentication:** Admin only (is_admin = TRUE)
**Location:** `/admin/dashboard`

### Views in this section:

1. **admin_view_platform_overview**
   - Type: KPI Cards
   - Returns: 26 KPI metrics (users, products, transactions, revenue)
   - Query: `SELECT * FROM admin_view_platform_overview;`

2. **admin_view_recent_transactions**
   - Type: Data Table
   - Returns: Latest 100 transactions with full details
   - Query: `SELECT * FROM admin_view_recent_transactions LIMIT 100;`

3. **admin_view_user_activity**
   - Type: Data Table with Metrics
   - Returns: All users with activity tracking
   - Query: `SELECT * FROM admin_view_user_activity ORDER BY last_active_at DESC;`

4. **admin_view_pending_products**
   - Type: Data Table with Priority Flags
   - Returns: Products awaiting approval
   - Query: `SELECT * FROM admin_view_pending_products ORDER BY created_at ASC;`

---

## SECTION 2: USER DASHBOARD BASIC VIEWS (5 Views)
**Lines: 281-410**
**Purpose:** User's personal statistics and data
**Authentication:** User must own the data
**Location:** `/dashboard`
**Security:** Row Level Security (RLS) enforced

### Views in this section:

1. **user_view_dashboard_overview**
   - Type: KPI Cards
   - Returns: 16 personal KPI metrics
   - Key Fields: username, total_products_posted, total_products_sold, total_revenue, active_listings
   - Query: `SELECT * FROM user_view_dashboard_overview WHERE user_id = '<userId>';`

2. **user_view_my_listings**
   - Type: Data Table
   - Returns: All user's products with performance metrics
   - Key Fields: product_id, product_name, view_count, favorite_count, sales_count, total_revenue
   - Query: `SELECT * FROM user_view_my_listings WHERE user_id = '<userId>' ORDER BY created_at DESC;`

3. **user_view_my_orders_buyer**
   - Type: Data Table
   - Returns: Orders placed by user as buyer
   - Key Fields: order_id, product_name, price, order_status, seller_username, order_date
   - Query: `SELECT * FROM user_view_my_orders_buyer WHERE buyer_id = '<userId>' ORDER BY order_date DESC;`

4. **user_view_my_sales_seller**
   - Type: Data Table
   - Returns: Orders received by user as seller
   - Key Fields: order_id, product_name, order_status, buyer_username, order_date
   - Query: `SELECT * FROM user_view_my_sales_seller WHERE seller_id = '<userId>' ORDER BY order_date DESC;`

---

## SECTION 2B: USER ANALYTICS CHART VIEWS (8 Views)
**Lines: 411-680**
**Purpose:** Professional analytics with chart visualizations
**Authentication:** User must own the data
**Location:** `/dashboard/analytics`
**Time Ranges:** 90 days (trends), 12 months (revenue), 30 days (engagement)
**Security:** Filtered by user_id/seller_id/buyer_id

### Chart Views Summary:

| View Name | Chart Type | Filter Column | Time Range | Frontend Location |
|-----------|-----------|----------------|-----------|------------------|
| user_analytics_my_revenue_trend | Line/Area | seller_id | 90 days | Revenue Trend |
| user_analytics_my_product_performance | Bar | user_id | All-time | Product Performance |
| user_analytics_my_category_performance | Pie/Donut | user_id | All-time | Category Revenue |
| user_analytics_my_order_status_distribution | Donut | seller_id | All | Order Status |
| user_analytics_my_sales_trend | Line | seller_id | 90 days | Sales Trend |
| user_analytics_my_top_customers | Bar/Table | seller_id | All | Top Customers |
| user_analytics_my_monthly_revenue | Column/Bar | seller_id | 12 months | Monthly Revenue |
| user_analytics_my_purchase_trend | Line | buyer_id | 90 days | Purchase History |
| user_analytics_my_seller_rating_breakdown | Bar/Rating | seller_id | All | Seller Ratings |

### Individual Views:

1. **user_analytics_my_revenue_trend**
   - Returns: Daily revenue over 90 days (seller perspective)
   - Columns: date, seller_id, transactions, daily_revenue, cumulative_revenue
   - Query: `SELECT * FROM user_analytics_my_revenue_trend WHERE seller_id = '<userId>' ORDER BY date ASC;`

2. **user_analytics_my_product_performance**
   - Returns: Each product ranked by views, favorites, sales
   - Columns: product_id, product_name, view_count, favorite_count, sales_count, total_revenue
   - Query: `SELECT * FROM user_analytics_my_product_performance WHERE user_id = '<userId>' ORDER BY view_count DESC;`

3. **user_analytics_my_category_performance**
   - Returns: Revenue breakdown by product category
   - Columns: category_id, category_name, product_count, total_revenue, total_views
   - Query: `SELECT * FROM user_analytics_my_category_performance WHERE user_id = '<userId>' ORDER BY total_revenue DESC;`

4. **user_analytics_my_order_status_distribution**
   - Returns: Orders grouped by status (PENDING, ACCEPTED, COMPLETED, REJECTED, CANCELLED)
   - Columns: order_status, count, percentage, total_value
   - Query: `SELECT * FROM user_analytics_my_order_status_distribution WHERE seller_id = '<userId>';`

5. **user_analytics_my_sales_trend**
   - Returns: Daily sales count over 90 days
   - Columns: date, seller_id, daily_sales, cumulative_sales, for_sale, for_rent, services
   - Query: `SELECT * FROM user_analytics_my_sales_trend WHERE seller_id = '<userId>' ORDER BY date ASC;`

6. **user_analytics_my_top_customers**
   - Returns: Top 20 customers by total spending
   - Columns: seller_id, user_id, full_name, total_orders, total_spent, avg_order_value
   - Query: `SELECT * FROM user_analytics_my_top_customers WHERE seller_id = '<userId>' LIMIT 20;`

7. **user_analytics_my_monthly_revenue**
   - Returns: Monthly revenue over 12 months
   - Columns: month, seller_id, monthly_revenue, transaction_count, avg_transaction_value
   - Query: `SELECT * FROM user_analytics_my_monthly_revenue WHERE seller_id = '<userId>' ORDER BY month DESC;`

8. **user_analytics_my_purchase_trend**
   - Returns: Daily purchases over 90 days (buyer perspective)
   - Columns: date, buyer_id, daily_purchases, cumulative_purchases, daily_spent
   - Query: `SELECT * FROM user_analytics_my_purchase_trend WHERE buyer_id = '<userId>' ORDER BY date ASC;`

9. **user_analytics_my_seller_rating_breakdown**
   - Returns: Distribution of seller ratings (1-5 stars)
   - Columns: seller_id, rating, review_count, percentage
   - Query: `SELECT * FROM user_analytics_my_seller_rating_breakdown WHERE seller_id = '<userId>' ORDER BY rating DESC;`

---

## SECTION 3: ADMIN ANALYTICS VIEWS (9 Views)
**Lines: 681-900**
**Purpose:** Advanced platform analytics for business intelligence
**Authentication:** Admin only (is_admin = TRUE)
**Location:** `/admin/analytics`
**Real-time:** YES - Fresh data on each query

### Views in this section:

1. **analytics_view_category_performance**
   - Type: Bar/Pie Chart
   - Returns: Categories ranked by revenue, views, favorites
   - Query: `SELECT * FROM analytics_view_category_performance ORDER BY total_revenue DESC;`

2. **analytics_view_user_growth**
   - Type: Line/Area Chart
   - Returns: Daily new users over 90 days
   - Query: `SELECT * FROM analytics_view_user_growth ORDER BY date ASC;`

3. **analytics_view_product_trend**
   - Type: Line Chart
   - Returns: Daily new products by status over 90 days
   - Query: `SELECT * FROM analytics_view_product_trend ORDER BY date ASC;`

4. **analytics_view_revenue_trend**
   - Type: Line/Area Chart
   - Returns: Platform revenue over 90 days
   - Query: `SELECT * FROM analytics_view_revenue_trend ORDER BY date ASC;`

5. **analytics_view_top_sellers**
   - Type: Bar/Leaderboard Table
   - Returns: Top 50 sellers by revenue
   - Query: `SELECT * FROM analytics_view_top_sellers ORDER BY total_revenue DESC LIMIT 50;`

6. **analytics_view_top_products**
   - Type: Data Table
   - Returns: Top 50 products by views and favorites
   - Query: `SELECT * FROM analytics_view_top_products ORDER BY view_count DESC LIMIT 50;`

7. **analytics_view_transaction_status**
   - Type: Donut/Pie Chart
   - Returns: All transactions grouped by status
   - Query: `SELECT * FROM analytics_view_transaction_status;`

8. **analytics_view_listing_type_distribution**
   - Type: Donut Chart
   - Returns: Products grouped by type with revenue
   - Query: `SELECT * FROM analytics_view_listing_type_distribution;`

---

## SECTION 4: MATERIALIZED VIEWS (7 Views)
**Lines: 901+**
**Purpose:** Pre-computed optimized data for performance
**Strategy:** Refresh daily or every 6 hours via cron job
**Implementation:** Cached tables with indexes for fast queries

### Views in this section:

1. **mv_daily_platform_metrics**
   - Refresh: Every 6 hours
   - Returns: Daily platform KPIs

2. **mv_weekly_revenue_by_category**
   - Refresh: Daily
   - Returns: Weekly revenue breakdown by category

3. **mv_user_engagement_heatmap**
   - Refresh: Daily
   - Returns: User activity patterns by day/hour

4. **mv_monthly_category_pareto**
   - Refresh: Daily
   - Returns: Category revenue Pareto analysis

5. **mv_transaction_funnel**
   - Refresh: Every 6 hours
   - Returns: User journey funnel metrics

6. **mv_seller_performance_scorecard**
   - Refresh: Daily
   - Returns: Seller tiers and performance metrics

7. **mv_product_lifecycle_analysis**
   - Refresh: Daily
   - Returns: Product status progression

### Refresh All Views:
```sql
SELECT refresh_all_analytics_mv();
```

---

## Frontend Implementation Examples

### React - Fetch User Analytics:
```typescript
// Import Supabase client
import { supabase } from '@/lib/supabase';

// Get user's revenue trend
const fetchRevenueData = async (userId: string) => {
  const { data, error } = await supabase
    .from('user_analytics_my_revenue_trend')
    .select('*')
    .eq('seller_id', userId)
    .order('date', { ascending: true });
  
  return data; // Use with Recharts LineChart
};

// Get user's product performance
const fetchProductPerformance = async (userId: string) => {
  const { data, error } = await supabase
    .from('user_analytics_my_product_performance')
    .select('*')
    .eq('user_id', userId)
    .order('view_count', { ascending: false });
  
  return data; // Use with Recharts BarChart
};

// Get user's top customers
const fetchTopCustomers = async (userId: string) => {
  const { data, error } = await supabase
    .from('user_analytics_my_top_customers')
    .select('*')
    .eq('seller_id', userId)
    .limit(20);
  
  return data; // Use with Recharts BarChart + DataTable
};
```

---

## Search Tips

Use `Ctrl+F` to quickly find views:

- **Find all USER views:** Search `"user_view_"` or `"user_analytics_"`
- **Find all ADMIN views:** Search `"admin_view_"` or `"analytics_view_"`
- **Find specific chart type:** Search `"LINE CHART"`, `"BAR CHART"`, `"PIE CHART"`, etc.
- **Find by location:** Search `"Lines: XXX"` to jump to section
- **Find query examples:** Search `"Query:"` to see SQL examples

---

## Database Deployment Checklist

- [x] All 33 views created and tested
- [x] No `{user_id}` placeholder syntax (replaced with column inclusion)
- [x] RLS filtering handled in frontend with `.eq()` method
- [x] All views documented with chart types and query examples
- [x] Time ranges specified (90 days, 12 months, etc.)
- [x] Materialized views with refresh function
- [x] Indexes created on performance-critical columns
- [x] Ready for Supabase deployment

---

## Support & Questions

For questions about specific views, search the file for:
- View name (e.g., "user_analytics_my_revenue_trend")
- Chart type (e.g., "LINE CHART")
- Feature (e.g., "revenue", "products", "customers")

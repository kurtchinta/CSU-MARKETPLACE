-- =====================================================================
-- CSU MARKETPLACE - ANALYTICS ARCHITECTURE
-- Production-Ready Views, Materialized Views, Functions, Indexes, Triggers
-- Version: 1.0 Production
-- Date: November 14, 2025
-- =====================================================================

-- =====================================================================
-- SECTION 1: ADMIN ANALYTICS VIEWS
-- Purpose: Real-time admin dashboard data
-- Implementation: Admin Dashboard (/admin/dashboard)
-- =====================================================================

-- Admin View: Platform Overview KPIs
-- Chart Type: KPI CARDS
-- Dashboard Placement: Admin Dashboard - Top Row (4 KPI Cards)
-- Usage: Display total users, products, transactions, revenue
-- Component: <AdminKPICards data={admin_view_platform_overview} />
CREATE OR REPLACE VIEW admin_view_platform_overview AS
SELECT 
    -- User Metrics
    (SELECT COUNT(*) FROM users WHERE is_active = TRUE) as total_active_users,
    (SELECT COUNT(*) FROM users WHERE is_admin = TRUE) as total_admins,
    (SELECT COUNT(*) FROM users WHERE created_at >= NOW() - INTERVAL '30 days') as new_users_30d,
    (SELECT COUNT(*) FROM users WHERE is_verified = TRUE) as verified_users,
    
    -- Product Metrics
    (SELECT COUNT(*) FROM products) as total_products,
    (SELECT COUNT(*) FROM products WHERE status = 'APPROVED') as approved_products,
    (SELECT COUNT(*) FROM products WHERE status = 'PENDING') as pending_products,
    (SELECT COUNT(*) FROM products WHERE status = 'APPROVED' AND is_available = TRUE) as active_listings,
    (SELECT COUNT(*) FROM products WHERE created_at >= NOW() - INTERVAL '7 days') as new_products_7d,
    
    -- Transaction Metrics
    (SELECT COUNT(*) FROM transactions) as total_transactions,
    (SELECT COUNT(*) FROM transactions WHERE transaction_status = 'COMPLETED') as completed_transactions,
    (SELECT COUNT(*) FROM transactions WHERE transaction_status = 'PENDING') as pending_transactions,
    (SELECT COUNT(*) FROM transactions WHERE created_at >= NOW() - INTERVAL '24 hours') as transactions_24h,
    
    -- Revenue Metrics
    (SELECT COALESCE(SUM(item_price * quantity), 0) FROM transactions WHERE transaction_status = 'COMPLETED') as total_revenue,
    (SELECT COALESCE(SUM(item_price * quantity), 0) FROM transactions WHERE transaction_status = 'COMPLETED' AND completed_at >= NOW() - INTERVAL '30 days') as revenue_30d,
    (SELECT COALESCE(SUM(item_price * quantity), 0) FROM transactions WHERE transaction_status = 'COMPLETED' AND completed_at >= NOW() - INTERVAL '7 days') as revenue_7d,
    (SELECT COALESCE(AVG(item_price * quantity), 0) FROM transactions WHERE transaction_status = 'COMPLETED') as avg_transaction_value,
    
    -- Engagement Metrics
    (SELECT COUNT(*) FROM product_favorites) as total_favorites,
    (SELECT COUNT(*) FROM reviews) as total_reviews,
    (SELECT COALESCE(AVG(rating), 0) FROM reviews) as platform_avg_rating,
    
    -- Blockchain Metrics
    (SELECT COUNT(*) FROM transactions WHERE is_blockchain_pending = TRUE) as blockchain_pending,
    (SELECT COUNT(*) FROM blockchain_transactions WHERE blockchain_status = 'confirmed') as blockchain_confirmed,
    
    NOW() as last_updated;

COMMENT ON VIEW admin_view_platform_overview IS 'KPI CARDS - Platform overview metrics for admin dashboard';

-- Admin View: Recent Transactions with Details
-- Chart Type: DATA TABLE
-- Dashboard Placement: Admin Dashboard - Transactions Tab (Full Width)
-- Usage: Display recent transaction activity
-- Component: <AdminTransactionsTable data={admin_view_recent_transactions} />
CREATE OR REPLACE VIEW admin_view_recent_transactions AS
SELECT 
    t.transaction_id,
    t.blockchain_tx_hash,
    t.transaction_status,
    t.listing_type,
    t.item_name,
    t.item_price,
    t.quantity,
    (t.item_price * t.quantity) as total_amount,
    t.buyer_name,
    t.seller_name,
    t.category_name,
    t.created_at,
    t.accepted_at,
    t.completed_at,
    EXTRACT(EPOCH FROM (COALESCE(t.completed_at, NOW()) - t.created_at))/3600 as hours_to_complete,
    b.username as buyer_username,
    s.username as seller_username,
    CASE 
        WHEN t.transaction_status = 'COMPLETED' THEN 'success'
        WHEN t.transaction_status = 'PENDING' THEN 'warning'
        WHEN t.transaction_status = 'REJECTED' THEN 'error'
        WHEN t.transaction_status = 'CANCELLED' THEN 'error'
        ELSE 'info'
    END as status_color
FROM transactions t
INNER JOIN users b ON t.buyer_id = b.user_id
INNER JOIN users s ON t.seller_id = s.user_id
ORDER BY t.created_at DESC
LIMIT 100;

COMMENT ON VIEW admin_view_recent_transactions IS 'DATA TABLE - Recent transactions with full details for admin monitoring';

-- Admin View: User Activity Summary
-- Chart Type: DATA TABLE with SPARKLINES
-- Dashboard Placement: Admin Dashboard - Users Tab (Full Width)
-- Usage: Monitor user engagement and activity
-- Component: <AdminUserActivityTable data={admin_view_user_activity} />
CREATE OR REPLACE VIEW admin_view_user_activity AS
SELECT 
    u.user_id,
    u.username,
    u.email,
    u.first_name || ' ' || u.last_name as full_name,
    u.department,
    u.year_level,
    u.is_admin,
    u.is_verified,
    u.is_active,
    u.total_products_posted,
    u.total_products_sold,
    u.total_orders_as_buyer,
    u.total_revenue,
    u.average_seller_rating,
    u.total_reviews_received,
    u.created_at as member_since,
    u.last_login_at,
    u.last_active_at,
    EXTRACT(DAY FROM NOW() - u.last_active_at) as days_since_active,
    CASE 
        WHEN u.last_active_at >= NOW() - INTERVAL '7 days' THEN 'Active'
        WHEN u.last_active_at >= NOW() - INTERVAL '30 days' THEN 'Moderate'
        ELSE 'Inactive'
    END as activity_status,
    (SELECT COUNT(*) FROM products WHERE user_id = u.user_id AND status = 'APPROVED' AND is_available = TRUE) as active_listings,
    (SELECT COUNT(*) FROM product_favorites pf INNER JOIN products p ON pf.product_id = p.product_id WHERE p.user_id = u.user_id) as products_favorited
FROM users u
ORDER BY u.last_active_at DESC NULLS LAST;

COMMENT ON VIEW admin_view_user_activity IS 'DATA TABLE - User activity monitoring with engagement metrics';

-- Admin View: Product Approval Queue
-- Chart Type: DATA TABLE with ACTIONS
-- Usage: Products pending admin approval
CREATE OR REPLACE VIEW admin_view_pending_products AS
SELECT 
    p.product_id,
    p.product_name,
    p.description,
    p.price,
    p.quantity,
    p.listing_type,
    p.status,
    p.created_at,
    EXTRACT(EPOCH FROM (NOW() - p.created_at))/3600 as hours_pending,
    u.user_id,
    u.username,
    u.first_name || ' ' || u.last_name as seller_name,
    u.email as seller_email,
    u.total_products_posted as seller_total_products,
    u.average_seller_rating as seller_rating,
    c.category_name,
    (SELECT COUNT(*) FROM product_images WHERE product_id = p.product_id) as image_count,
    CASE 
        WHEN p.created_at < NOW() - INTERVAL '24 hours' THEN 'urgent'
        WHEN p.created_at < NOW() - INTERVAL '12 hours' THEN 'high'
        ELSE 'normal'
    END as priority
FROM products p
INNER JOIN users u ON p.user_id = u.user_id
INNER JOIN categories c ON p.category_id = c.category_id
WHERE p.status = 'PENDING'
ORDER BY p.created_at ASC;

COMMENT ON VIEW admin_view_pending_products IS 'DATA TABLE - Products awaiting admin approval with priority flags';

-- =====================================================================
-- SECTION 2: USER ANALYTICS VIEWS
-- Purpose: User-facing dashboard data
-- =====================================================================

-- User View: Personal Dashboard Overview
-- Chart Type: KPI CARDS
-- Usage: User's personal statistics
CREATE OR REPLACE VIEW user_view_dashboard_overview AS
SELECT 
    u.user_id,
    u.username,
    u.total_products_posted,
    u.total_products_sold,
    u.total_orders_as_buyer,
    u.total_orders_as_seller,
    u.total_revenue,
    u.average_seller_rating,
    u.total_reviews_received,
    (SELECT COUNT(*) FROM products WHERE user_id = u.user_id AND status = 'APPROVED' AND is_available = TRUE) as active_listings,
    (SELECT COUNT(*) FROM products WHERE user_id = u.user_id AND status = 'PENDING') as pending_listings,
    (SELECT COUNT(*) FROM order_details WHERE seller_id = u.user_id AND order_status = 'pending') as pending_orders_as_seller,
    (SELECT COUNT(*) FROM order_details WHERE buyer_id = u.user_id AND order_status = 'pending') as pending_orders_as_buyer,
    (SELECT COUNT(*) FROM transactions WHERE seller_id = u.user_id AND transaction_status = 'COMPLETED' AND completed_at >= NOW() - INTERVAL '30 days') as sales_30d,
    (SELECT COALESCE(SUM(item_price * quantity), 0) FROM transactions WHERE seller_id = u.user_id AND transaction_status = 'COMPLETED' AND completed_at >= NOW() - INTERVAL '30 days') as revenue_30d,
    (SELECT COUNT(*) FROM product_favorites pf INNER JOIN products p ON pf.product_id = p.product_id WHERE p.user_id = u.user_id) as total_product_favorites,
    (SELECT COUNT(DISTINCT product_id) FROM cart WHERE user_id = u.user_id) as items_in_cart
FROM users u;

COMMENT ON VIEW user_view_dashboard_overview IS 'KPI CARDS - User personal dashboard metrics';

-- User View: My Listings Performance
-- Chart Type: DATA TABLE with METRICS
-- Usage: Track performance of user's products
CREATE OR REPLACE VIEW user_view_my_listings AS
SELECT 
    p.product_id,
    p.product_name,
    p.description,
    p.price,
    p.quantity,
    p.listing_type,
    p.status,
    p.is_available,
    p.is_featured,
    p.view_count,
    p.created_at,
    c.category_name,
    (SELECT COUNT(*) FROM product_images WHERE product_id = p.product_id) as image_count,
    (SELECT COUNT(*) FROM product_favorites WHERE product_id = p.product_id) as favorite_count,
    (SELECT COUNT(*) FROM order_details WHERE product_id = p.product_id) as order_count,
    (SELECT COUNT(*) FROM transactions WHERE product_id = p.product_id AND transaction_status = 'COMPLETED') as sales_count,
    (SELECT COALESCE(SUM(item_price * quantity), 0) FROM transactions WHERE product_id = p.product_id AND transaction_status = 'COMPLETED') as total_revenue,
    CASE 
        WHEN p.status = 'APPROVED' AND p.is_available = TRUE THEN 'Active'
        WHEN p.status = 'PENDING' THEN 'Pending Approval'
        WHEN p.status = 'REJECTED' THEN 'Rejected'
        WHEN p.is_available = FALSE THEN 'Inactive'
        ELSE 'Unknown'
    END as display_status,
    p.user_id
FROM products p
INNER JOIN categories c ON p.category_id = c.category_id;

COMMENT ON VIEW user_view_my_listings IS 'DATA TABLE - User product listings with performance metrics';

-- User View: My Orders (as Buyer)
-- Chart Type: DATA TABLE
-- Usage: Track orders made by user
CREATE OR REPLACE VIEW user_view_my_orders_buyer AS
SELECT 
    od.order_id,
    od.product_name,
    od.description,
    od.price,
    od.buyer_quantity as quantity,
    (od.price * od.buyer_quantity) as total_amount,
    od.listing_type,
    od.order_status,
    od.created_at as order_date,
    od.pickup_location,
    od.meetup_location,
    od.message_to_seller,
    od.rejection_reason,
    od.seller_id,
    s.username as seller_username,
    s.first_name || ' ' || s.last_name as seller_name,
    s.phone_number as seller_phone,
    s.average_seller_rating,
    od.product_id,
    (SELECT COUNT(*) FROM reviews WHERE transaction_id IN (SELECT transaction_id FROM transactions WHERE order_id = od.order_id)) as has_review,
    od.buyer_id
FROM order_details od
INNER JOIN users s ON od.seller_id = s.user_id;

COMMENT ON VIEW user_view_my_orders_buyer IS 'DATA TABLE - Orders placed by user as buyer';

-- User View: My Sales (as Seller)
-- Chart Type: DATA TABLE
-- Usage: Track sales made by user
CREATE OR REPLACE VIEW user_view_my_sales_seller AS
SELECT 
    od.order_id,
    od.product_name,
    od.price,
    od.buyer_quantity as quantity,
    (od.price * od.buyer_quantity) as total_amount,
    od.listing_type,
    od.order_status,
    od.created_at as order_date,
    od.message_to_seller,
    od.final_pickup_location,
    od.final_meetup_location,
    od.buyer_id,
    b.username as buyer_username,
    b.first_name || ' ' || b.last_name as buyer_name,
    b.phone_number as buyer_phone,
    od.product_id,
    (SELECT storage_path FROM product_images WHERE product_id = od.product_id ORDER BY image_order LIMIT 1) as product_image,
    od.seller_id
FROM order_details od
INNER JOIN users b ON od.buyer_id = b.user_id;

COMMENT ON VIEW user_view_my_sales_seller IS 'DATA TABLE - Sales made by user as seller';

-- =====================================================================
-- SECTION 3: ANALYTICS DASHBOARD VIEWS (9 VIEWS)
-- Purpose: Platform-wide analytics and insights
-- Implementation: Admin Dashboard - Analytics Tab (/admin/analytics)
-- =====================================================================

-- Analytics View: Category Performance
-- Chart Type: BAR CHART / PIE CHART
-- Usage: Compare category metrics
CREATE OR REPLACE VIEW analytics_view_category_performance AS
SELECT 
    c.category_id,
    c.category_name,
    c.total_products,
    c.total_views,
    (SELECT COUNT(*) FROM products WHERE category_id = c.category_id AND status = 'APPROVED') as approved_products,
    (SELECT COUNT(*) FROM products WHERE category_id = c.category_id AND status = 'APPROVED' AND is_available = TRUE) as active_products,
    (SELECT COUNT(*) FROM transactions WHERE category_id = c.category_id) as total_transactions,
    (SELECT COUNT(*) FROM transactions WHERE category_id = c.category_id AND transaction_status = 'COMPLETED') as completed_transactions,
    (SELECT COALESCE(SUM(item_price * quantity), 0) FROM transactions WHERE category_id = c.category_id AND transaction_status = 'COMPLETED') as total_revenue,
    (SELECT COALESCE(AVG(price), 0) FROM products WHERE category_id = c.category_id AND status = 'APPROVED') as avg_product_price,
    (SELECT COUNT(*) FROM product_favorites pf INNER JOIN products p ON pf.product_id = p.product_id WHERE p.category_id = c.category_id) as total_favorites,
    CASE 
        WHEN c.total_products > 0 THEN ROUND((SELECT COUNT(*)::DECIMAL FROM products WHERE category_id = c.category_id AND status = 'APPROVED') / c.total_products * 100, 2)
        ELSE 0
    END as approval_rate_percent
FROM categories c
ORDER BY total_revenue DESC;

COMMENT ON VIEW analytics_view_category_performance IS 'BAR CHART / PIE CHART - Category comparison metrics';

-- Analytics View: User Growth Trend
-- Chart Type: LINE CHART / AREA CHART
-- Usage: Track user registration over time
CREATE OR REPLACE VIEW analytics_view_user_growth AS
SELECT 
    DATE(created_at) as date,
    COUNT(*) as new_users,
    SUM(COUNT(*)) OVER (ORDER BY DATE(created_at)) as cumulative_users,
    COUNT(*) FILTER (WHERE is_verified = TRUE) as verified_users,
    COUNT(*) FILTER (WHERE is_admin = TRUE) as new_admins
FROM users
WHERE created_at >= NOW() - INTERVAL '90 days'
GROUP BY DATE(created_at)
ORDER BY date ASC;

COMMENT ON VIEW analytics_view_user_growth IS 'LINE CHART / AREA CHART - User registration trend over time';

-- Analytics View: Product Listing Trend
-- Chart Type: LINE CHART
-- Usage: Track product creation over time
CREATE OR REPLACE VIEW analytics_view_product_trend AS
SELECT 
    DATE(created_at) as date,
    COUNT(*) as new_products,
    SUM(COUNT(*)) OVER (ORDER BY DATE(created_at)) as cumulative_products,
    COUNT(*) FILTER (WHERE status = 'APPROVED') as approved_products,
    COUNT(*) FILTER (WHERE status = 'PENDING') as pending_products,
    COUNT(*) FILTER (WHERE status = 'REJECTED') as rejected_products,
    COUNT(*) FILTER (WHERE listing_type = 'FOR_SALE') as for_sale,
    COUNT(*) FILTER (WHERE listing_type = 'FOR_RENT') as for_rent,
    COUNT(*) FILTER (WHERE listing_type = 'SERVICE') as services
FROM products
WHERE created_at >= NOW() - INTERVAL '90 days'
GROUP BY DATE(created_at)
ORDER BY date ASC;

COMMENT ON VIEW analytics_view_product_trend IS 'LINE CHART - Product listing trend by status and type';

-- Analytics View: Revenue Trend
-- Chart Type: LINE CHART / AREA CHART
-- Usage: Track revenue over time
CREATE OR REPLACE VIEW analytics_view_revenue_trend AS
SELECT 
    DATE(completed_at) as date,
    COUNT(*) as transactions,
    COALESCE(SUM(item_price * quantity), 0) as daily_revenue,
    COALESCE(AVG(item_price * quantity), 0) as avg_transaction_value,
    COALESCE(SUM(SUM(item_price * quantity)) OVER (ORDER BY DATE(completed_at)), 0) as cumulative_revenue,
    COUNT(*) FILTER (WHERE listing_type = 'FOR_SALE') as sales,
    COUNT(*) FILTER (WHERE listing_type = 'FOR_RENT') as rentals,
    COUNT(*) FILTER (WHERE listing_type = 'SERVICE') as services
FROM transactions
WHERE transaction_status = 'COMPLETED' 
AND completed_at >= NOW() - INTERVAL '90 days'
GROUP BY DATE(completed_at)
ORDER BY date ASC;

COMMENT ON VIEW analytics_view_revenue_trend IS 'LINE CHART / AREA CHART - Daily revenue and transaction trends';

-- Analytics View: Top Sellers
-- Chart Type: BAR CHART / DATA TABLE
-- Usage: Leaderboard of top performing sellers
CREATE OR REPLACE VIEW analytics_view_top_sellers AS
SELECT 
    u.user_id,
    u.username,
    u.first_name || ' ' || u.last_name as full_name,
    u.department,
    u.total_products_sold,
    u.total_revenue,
    u.average_seller_rating,
    u.total_reviews_received,
    (SELECT COUNT(*) FROM products WHERE user_id = u.user_id AND status = 'APPROVED' AND is_available = TRUE) as active_listings,
    RANK() OVER (ORDER BY u.total_revenue DESC) as revenue_rank,
    RANK() OVER (ORDER BY u.total_products_sold DESC) as sales_rank,
    RANK() OVER (ORDER BY u.average_seller_rating DESC) as rating_rank
FROM users u
WHERE u.total_products_sold > 0
ORDER BY u.total_revenue DESC
LIMIT 50;

COMMENT ON VIEW analytics_view_top_sellers IS 'BAR CHART / DATA TABLE - Top performing sellers by revenue';

-- Analytics View: Top Products
-- Chart Type: DATA TABLE
-- Usage: Most popular products
CREATE OR REPLACE VIEW analytics_view_top_products AS
SELECT 
    p.product_id,
    p.product_name,
    p.price,
    p.listing_type,
    p.view_count,
    p.created_at,
    c.category_name,
    u.username as seller_username,
    u.first_name || ' ' || u.last_name as seller_name,
    (SELECT COUNT(*) FROM product_favorites WHERE product_id = p.product_id) as favorite_count,
    (SELECT COUNT(*) FROM transactions WHERE product_id = p.product_id AND transaction_status = 'COMPLETED') as sales_count,
    (SELECT COALESCE(SUM(item_price * quantity), 0) FROM transactions WHERE product_id = p.product_id AND transaction_status = 'COMPLETED') as total_revenue,
    RANK() OVER (ORDER BY p.view_count DESC) as view_rank,
    RANK() OVER (ORDER BY (SELECT COUNT(*) FROM product_favorites WHERE product_id = p.product_id) DESC) as favorite_rank
FROM products p
INNER JOIN users u ON p.user_id = u.user_id
INNER JOIN categories c ON p.category_id = c.category_id
WHERE p.status = 'APPROVED'
ORDER BY p.view_count DESC
LIMIT 50;

COMMENT ON VIEW analytics_view_top_products IS 'DATA TABLE - Most viewed and favorited products';

-- Analytics View: Transaction Status Distribution
-- Chart Type: DONUT CHART / PIE CHART
-- Usage: Visualize transaction status breakdown
CREATE OR REPLACE VIEW analytics_view_transaction_status AS
SELECT 
    transaction_status,
    COUNT(*) as count,
    ROUND(COUNT(*)::DECIMAL / (SELECT COUNT(*) FROM transactions) * 100, 2) as percentage,
    COALESCE(SUM(item_price * quantity), 0) as total_value
FROM transactions
GROUP BY transaction_status
ORDER BY count DESC;

COMMENT ON VIEW analytics_view_transaction_status IS 'DONUT CHART / PIE CHART - Transaction status distribution';

-- Analytics View: Listing Type Distribution
-- Chart Type: DONUT CHART
-- Usage: Product listing type breakdown
CREATE OR REPLACE VIEW analytics_view_listing_type_distribution AS
SELECT 
    listing_type,
    COUNT(*) as product_count,
    ROUND(COUNT(*)::DECIMAL / (SELECT COUNT(*) FROM products) * 100, 2) as percentage,
    (SELECT COUNT(*) FROM transactions WHERE transactions.listing_type = products.listing_type AND transaction_status = 'COMPLETED') as completed_transactions,
    (SELECT COALESCE(SUM(item_price * quantity), 0) FROM transactions WHERE transactions.listing_type = products.listing_type AND transaction_status = 'COMPLETED') as total_revenue
FROM products
WHERE status = 'APPROVED'
GROUP BY listing_type
ORDER BY product_count DESC;

COMMENT ON VIEW analytics_view_listing_type_distribution IS 'DONUT CHART - Product listing type breakdown';

-- =====================================================================
-- SECTION 4: MATERIALIZED VIEWS (Optimized for Dashboard Loading)
-- Purpose: Pre-computed aggregations for fast dashboard rendering
-- Refresh: Recommended daily or on-demand
-- =====================================================================

-- Materialized View: Daily Platform Metrics
-- Chart Type: KPI DASHBOARD
-- Refresh: Every 6 hours or on-demand
CREATE MATERIALIZED VIEW mv_daily_platform_metrics AS
SELECT 
    CURRENT_DATE as metric_date,
    
    -- User Metrics
    (SELECT COUNT(*) FROM users WHERE is_active = TRUE) as total_active_users,
    (SELECT COUNT(*) FROM users WHERE created_at::DATE = CURRENT_DATE) as new_users_today,
    (SELECT COUNT(*) FROM users WHERE last_active_at >= NOW() - INTERVAL '24 hours') as active_users_24h,
    
    -- Product Metrics
    (SELECT COUNT(*) FROM products WHERE status = 'APPROVED' AND is_available = TRUE) as active_listings,
    (SELECT COUNT(*) FROM products WHERE created_at::DATE = CURRENT_DATE) as new_listings_today,
    (SELECT COUNT(*) FROM products WHERE status = 'PENDING') as pending_approvals,
    
    -- Transaction Metrics
    (SELECT COUNT(*) FROM transactions WHERE created_at::DATE = CURRENT_DATE) as transactions_today,
    (SELECT COUNT(*) FROM transactions WHERE transaction_status = 'COMPLETED' AND completed_at::DATE = CURRENT_DATE) as completed_today,
    (SELECT COALESCE(SUM(item_price * quantity), 0) FROM transactions WHERE transaction_status = 'COMPLETED' AND completed_at::DATE = CURRENT_DATE) as revenue_today,
    
    -- Engagement Metrics
    (SELECT SUM(view_count) FROM products) as total_product_views,
    (SELECT COUNT(*) FROM product_favorites WHERE created_at::DATE = CURRENT_DATE) as new_favorites_today,
    (SELECT COUNT(*) FROM reviews WHERE created_at::DATE = CURRENT_DATE) as new_reviews_today,
    
    NOW() as last_refreshed;

CREATE UNIQUE INDEX ON mv_daily_platform_metrics (metric_date);

COMMENT ON MATERIALIZED VIEW mv_daily_platform_metrics IS 'KPI DASHBOARD - Daily platform metrics snapshot (Refresh: Every 6 hours)';

-- Materialized View: Weekly Revenue by Category
-- Chart Type: COLUMN CHART / BAR CHART
-- Refresh: Daily
CREATE MATERIALIZED VIEW mv_weekly_revenue_by_category AS
SELECT 
    c.category_id,
    c.category_name,
    DATE_TRUNC('week', t.completed_at) as week_start,
    COUNT(*) as transaction_count,
    COALESCE(SUM(t.item_price * t.quantity), 0) as weekly_revenue,
    COALESCE(AVG(t.item_price * t.quantity), 0) as avg_transaction_value
FROM transactions t
INNER JOIN categories c ON t.category_id = c.category_id
WHERE t.transaction_status = 'COMPLETED'
AND t.completed_at >= NOW() - INTERVAL '12 weeks'
GROUP BY c.category_id, c.category_name, DATE_TRUNC('week', t.completed_at)
ORDER BY week_start DESC, weekly_revenue DESC;

CREATE INDEX ON mv_weekly_revenue_by_category (week_start, category_id);
CREATE INDEX ON mv_weekly_revenue_by_category (category_id);

COMMENT ON MATERIALIZED VIEW mv_weekly_revenue_by_category IS 'COLUMN CHART - Weekly revenue breakdown by category (Refresh: Daily)';

-- Materialized View: User Engagement Heatmap
-- Chart Type: HEATMAP / CALENDAR CHART
-- Refresh: Daily
CREATE MATERIALIZED VIEW mv_user_engagement_heatmap AS
SELECT 
    DATE(created_at) as activity_date,
    EXTRACT(DOW FROM created_at) as day_of_week, -- 0=Sunday, 6=Saturday
    EXTRACT(HOUR FROM created_at) as hour_of_day,
    COUNT(DISTINCT user_id) as active_users,
    COUNT(*) as total_activities
FROM (
    SELECT user_id, created_at FROM products
    UNION ALL
    SELECT buyer_id as user_id, created_at FROM transactions
    UNION ALL
    SELECT user_id, created_at FROM product_favorites
) activities
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at), EXTRACT(DOW FROM created_at), EXTRACT(HOUR FROM created_at)
ORDER BY activity_date DESC, day_of_week, hour_of_day;

CREATE INDEX ON mv_user_engagement_heatmap (activity_date, day_of_week, hour_of_day);

COMMENT ON MATERIALIZED VIEW mv_user_engagement_heatmap IS 'HEATMAP - User activity patterns by day and hour (Refresh: Daily)';

-- Materialized View: Monthly Category Performance
-- Chart Type: PARETO CHART
-- Refresh: Daily
CREATE MATERIALIZED VIEW mv_monthly_category_pareto AS
WITH monthly_totals AS (
    SELECT 
        c.category_id,
        c.category_name,
        DATE_TRUNC('month', t.completed_at) as month,
        COUNT(*) as transaction_count,
        COALESCE(SUM(t.item_price * t.quantity), 0) as monthly_revenue
    FROM transactions t
    INNER JOIN categories c ON t.category_id = c.category_id
    WHERE t.transaction_status = 'COMPLETED'
    AND t.completed_at >= NOW() - INTERVAL '12 months'
    GROUP BY c.category_id, c.category_name, DATE_TRUNC('month', t.completed_at)
),
monthly_revenue_totals AS (
    SELECT 
        month,
        SUM(monthly_revenue) as total_monthly_revenue
    FROM monthly_totals
    GROUP BY month
)
SELECT 
    mt.category_id,
    mt.category_name,
    mt.month,
    mt.transaction_count,
    mt.monthly_revenue,
    ROUND((mt.monthly_revenue / NULLIF(mrt.total_monthly_revenue, 0)) * 100, 2) as revenue_percentage,
    SUM(ROUND((mt.monthly_revenue / NULLIF(mrt.total_monthly_revenue, 0)) * 100, 2)) 
        OVER (PARTITION BY mt.month ORDER BY mt.monthly_revenue DESC ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) as cumulative_percentage,
    RANK() OVER (PARTITION BY mt.month ORDER BY mt.monthly_revenue DESC) as revenue_rank
FROM monthly_totals mt
INNER JOIN monthly_revenue_totals mrt ON mt.month = mrt.month
ORDER BY mt.month DESC, mt.monthly_revenue DESC;

CREATE INDEX ON mv_monthly_category_pareto (month, category_id);
CREATE INDEX ON mv_monthly_category_pareto (month, revenue_rank);

COMMENT ON MATERIALIZED VIEW mv_monthly_category_pareto IS 'PARETO CHART - Category revenue distribution with cumulative % (Refresh: Daily)';

-- Materialized View: Transaction Funnel
-- Chart Type: FUNNEL CHART
-- Refresh: Every 6 hours
CREATE MATERIALIZED VIEW mv_transaction_funnel AS
SELECT 
    'Product Views' as stage,
    1 as stage_order,
    (SELECT SUM(view_count) FROM products WHERE created_at >= NOW() - INTERVAL '30 days') as count,
    100.0 as percentage
UNION ALL
SELECT 
    'Added to Favorites' as stage,
    2 as stage_order,
    (SELECT COUNT(*) FROM product_favorites WHERE created_at >= NOW() - INTERVAL '30 days') as count,
    ROUND((SELECT COUNT(*)::DECIMAL FROM product_favorites WHERE created_at >= NOW() - INTERVAL '30 days') / NULLIF((SELECT SUM(view_count) FROM products WHERE created_at >= NOW() - INTERVAL '30 days'), 0) * 100, 2) as percentage
UNION ALL
SELECT 
    'Orders Placed' as stage,
    3 as stage_order,
    (SELECT COUNT(*) FROM order_details WHERE created_at >= NOW() - INTERVAL '30 days') as count,
    ROUND((SELECT COUNT(*)::DECIMAL FROM order_details WHERE created_at >= NOW() - INTERVAL '30 days') / NULLIF((SELECT COUNT(*) FROM product_favorites WHERE created_at >= NOW() - INTERVAL '30 days'), 0) * 100, 2) as percentage
UNION ALL
SELECT 
    'Orders Accepted' as stage,
    4 as stage_order,
    (SELECT COUNT(*) FROM order_details WHERE order_status = 'accepted' AND created_at >= NOW() - INTERVAL '30 days') as count,
    ROUND((SELECT COUNT(*)::DECIMAL FROM order_details WHERE order_status = 'accepted' AND created_at >= NOW() - INTERVAL '30 days') / NULLIF((SELECT COUNT(*) FROM order_details WHERE created_at >= NOW() - INTERVAL '30 days'), 0) * 100, 2) as percentage
UNION ALL
SELECT 
    'Transactions Completed' as stage,
    5 as stage_order,
    (SELECT COUNT(*) FROM transactions WHERE transaction_status = 'COMPLETED' AND completed_at >= NOW() - INTERVAL '30 days') as count,
    ROUND((SELECT COUNT(*)::DECIMAL FROM transactions WHERE transaction_status = 'COMPLETED' AND completed_at >= NOW() - INTERVAL '30 days') / NULLIF((SELECT COUNT(*) FROM order_details WHERE order_status = 'accepted' AND created_at >= NOW() - INTERVAL '30 days'), 0) * 100, 2) as percentage
ORDER BY stage_order;

COMMENT ON MATERIALIZED VIEW mv_transaction_funnel IS 'FUNNEL CHART - User journey from view to completed transaction (Refresh: Every 6 hours)';

-- Materialized View: Seller Performance Scorecard
-- Chart Type: SCORECARD / RADAR CHART
-- Refresh: Daily
CREATE MATERIALIZED VIEW mv_seller_performance_scorecard AS
SELECT 
    u.user_id,
    u.username,
    u.first_name || ' ' || u.last_name as full_name,
    u.total_products_sold,
    u.total_revenue,
    u.average_seller_rating,
    u.total_reviews_received,
    (SELECT COUNT(*) FROM products WHERE user_id = u.user_id AND status = 'APPROVED' AND is_available = TRUE) as active_listings,
    (SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (completed_at - created_at))/3600), 0) FROM transactions WHERE seller_id = u.user_id AND transaction_status = 'COMPLETED') as avg_completion_hours,
    (SELECT COUNT(*) FROM transactions WHERE seller_id = u.user_id AND transaction_status = 'COMPLETED' AND completed_at >= NOW() - INTERVAL '30 days') as sales_last_30d,
    CASE 
        WHEN u.total_products_sold >= 50 AND u.average_seller_rating >= 4.5 THEN 'Platinum'
        WHEN u.total_products_sold >= 20 AND u.average_seller_rating >= 4.0 THEN 'Gold'
        WHEN u.total_products_sold >= 10 AND u.average_seller_rating >= 3.5 THEN 'Silver'
        WHEN u.total_products_sold >= 5 THEN 'Bronze'
        ELSE 'Beginner'
    END as seller_tier,
    PERCENT_RANK() OVER (ORDER BY u.total_revenue) as revenue_percentile,
    PERCENT_RANK() OVER (ORDER BY u.average_seller_rating) as rating_percentile
FROM users u
WHERE u.total_products_sold > 0
ORDER BY u.total_revenue DESC;

CREATE UNIQUE INDEX ON mv_seller_performance_scorecard (user_id);
CREATE INDEX ON mv_seller_performance_scorecard (seller_tier);

COMMENT ON MATERIALIZED VIEW mv_seller_performance_scorecard IS 'SCORECARD / RADAR CHART - Comprehensive seller performance metrics (Refresh: Daily)';

-- Materialized View: Product Lifecycle Analysis
-- Chart Type: STACKED AREA CHART
-- Refresh: Daily
CREATE MATERIALIZED VIEW mv_product_lifecycle_analysis AS
SELECT 
    DATE(created_at) as date,
    COUNT(*) FILTER (WHERE status = 'PENDING') as pending,
    COUNT(*) FILTER (WHERE status = 'APPROVED') as approved,
    COUNT(*) FILTER (WHERE status = 'REJECTED') as rejected,
    COUNT(*) FILTER (WHERE status = 'APPROVED' AND is_available = TRUE) as active,
    COUNT(*) FILTER (WHERE status = 'APPROVED' AND is_available = FALSE) as inactive,
    SUM(COUNT(*)) OVER (ORDER BY DATE(created_at)) as cumulative_total
FROM products
WHERE created_at >= NOW() - INTERVAL '90 days'
GROUP BY DATE(created_at)
ORDER BY date ASC;

CREATE UNIQUE INDEX ON mv_product_lifecycle_analysis (date);

COMMENT ON MATERIALIZED VIEW mv_product_lifecycle_analysis IS 'STACKED AREA CHART - Product status progression over time (Refresh: Daily)';

-- Function to refresh all materialized views
CREATE OR REPLACE FUNCTION refresh_all_analytics_mv()
RETURNS TEXT AS $$
BEGIN
    REFRESH MATERIALIZED VIEW mv_daily_platform_metrics;
    REFRESH MATERIALIZED VIEW mv_weekly_revenue_by_category;
    REFRESH MATERIALIZED VIEW mv_user_engagement_heatmap;
    REFRESH MATERIALIZED VIEW mv_monthly_category_pareto;
    REFRESH MATERIALIZED VIEW mv_transaction_funnel;
    REFRESH MATERIALIZED VIEW mv_seller_performance_scorecard;
    REFRESH MATERIALIZED VIEW mv_product_lifecycle_analysis;
    
    RETURN 'All materialized views refreshed at ' || NOW()::TEXT;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION refresh_all_analytics_mv() IS 'Refresh all analytics materialized views - Run daily via cron or manually';

-- =====================================================================
-- COMPLETION MESSAGE
-- =====================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================================';
    RAISE NOTICE 'ANALYTICS VIEWS & MATERIALIZED VIEWS CREATED';
    RAISE NOTICE '========================================================';
    RAISE NOTICE 'Admin Views: 4';
    RAISE NOTICE 'User Views: 5';
    RAISE NOTICE 'Analytics Views: 9';
    RAISE NOTICE 'Materialized Views: 7';
    RAISE NOTICE '';
    RAISE NOTICE 'Next: Create functions, indexes, and triggers';
    RAISE NOTICE '========================================================';
END $$;



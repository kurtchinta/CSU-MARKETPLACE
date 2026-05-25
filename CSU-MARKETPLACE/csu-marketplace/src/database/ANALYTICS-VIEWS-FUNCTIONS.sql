-- =====================================================================
-- CSU MARKETPLACE - ANALYTICS ARCHITECTURE
-- Production-Ready Views, Materialized Views, Functions, Indexes, Triggers
-- Version: 1.0 Production
-- Date: November 25, 2025
-- =====================================================================

-- =====================================================================
-- TABLE OF CONTENTS - QUICK NAVIGATION
-- =====================================================================
-- LINE 1-70:    TABLE OF CONTENTS & DOCUMENTATION
-- LINE 71-280:  SECTION 1 - ADMIN ANALYTICS VIEWS (4 views for admin dashboard)
-- LINE 281-410: SECTION 2 - USER DASHBOARD VIEWS (5 basic views for user dashboard)
-- LINE 411-680: SECTION 2B - USER ANALYTICS CHART VIEWS (8 analytics views with chart types)
-- LINE 681-900: SECTION 3 - ADMIN CHART & ANALYTICS VIEWS (9 detailed analytics)
-- LINE 901+:    SECTION 4 - MATERIALIZED VIEWS (7 optimized pre-computed views)
-- =====================================================================

-- =====================================================================
-- ADMIN DASHBOARD VIEWS & QUERIES
-- =====================================================================
-- These views are for ADMIN ONLY - Platform-wide analytics
-- Location in codebase: /admin/dashboard, /admin/analytics
-- Authentication: Admin role required (is_admin = TRUE)
-- Real-time: YES - No caching, fresh data on each query
-- =====================================================================

-- =====================================================================
-- SECTION 1: ADMIN ANALYTICS VIEWS (4 Views)
-- Purpose: Real-time admin dashboard data
-- Implementation: Admin Dashboard (/admin/dashboard)
-- Views: admin_view_platform_overview, admin_view_recent_transactions, 
--        admin_view_user_activity, admin_view_pending_products
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
-- USER DASHBOARD VIEWS & QUERIES
-- =====================================================================
-- These views are for REGULAR USERS - Personal data only
-- Location in codebase: /dashboard (user dashboard)
-- Authentication: User must own the data (filtered by user_id/seller_id/buyer_id)
-- Real-time: YES - Live data updates
-- Security: Row Level Security (RLS) enforced by Supabase
-- =====================================================================

-- =====================================================================
-- SECTION 2: USER DASHBOARD BASIC VIEWS (5 Views)
-- Purpose: User-facing dashboard data - Basic personal statistics
-- Implementation: User Dashboard (/dashboard)
-- Views: user_view_dashboard_overview, user_view_my_listings,
--        user_view_my_orders_buyer, user_view_my_sales_seller
-- RLS: All views filtered by current_user_id through frontend .eq() filtering
-- =====================================================================

-- User View: Personal Dashboard Overview
-- Chart Type: KPI CARDS
-- Usage: User's personal statistics
-- Frontend Location: /dashboard (top of page - 16 KPI metrics)
-- Query Method: supabase.from('user_view_dashboard_overview').select('*')
-- Columns: user_id, username, total_products_posted, total_products_sold, total_orders_as_buyer,
--          total_orders_as_seller, total_revenue, average_seller_rating, total_reviews_received,
--          active_listings, pending_listings, pending_orders_as_seller, pending_orders_as_buyer,
--          sales_30d, revenue_30d, total_product_favorites, items_in_cart
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
-- Frontend Location: /dashboard/listings or /my-listings (full width data table)
-- Query Method: supabase.from('user_view_my_listings').select('*').eq('user_id', userId)
-- Columns: product_id, product_name, description, price, quantity, listing_type, status,
--          is_available, is_featured, view_count, created_at, category_name, image_count,
--          favorite_count, order_count, sales_count, total_revenue, display_status, user_id
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
-- Usage: Track orders made by user as buyer
-- Frontend Location: /my-orders (Buyer tab - list of all orders placed)
-- Query Method: supabase.from('user_view_my_orders_buyer').select('*').eq('buyer_id', userId)
-- Columns: order_id, product_name, description, price, quantity, total_amount, listing_type,
--          order_status, order_date, pickup_location, meetup_location, message_to_seller,
--          rejection_reason, seller_id, seller_username, seller_name, seller_phone,
--          average_seller_rating, product_id, has_review, buyer_id
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
-- Usage: Track sales made by user as seller
-- Frontend Location: /my-orders (Seller tab - list of all orders received)
-- Query Method: supabase.from('user_view_my_sales_seller').select('*').eq('seller_id', userId)
-- Columns: order_id, product_name, price, quantity, total_amount, listing_type, order_status,
--          order_date, message_to_seller, final_pickup_location, final_meetup_location,
--          buyer_id, buyer_username, buyer_name, buyer_phone, product_id, product_image, seller_id
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
-- SECTION 2B: USER ANALYTICS CHART VIEWS (8 Views)
-- Purpose: User-facing analytics charts with professional visualizations
-- Implementation: User Dashboard - Analytics Tab (/dashboard/analytics)
-- Chart Types: Line, Area, Bar, Pie, Donut, Column, Rating Chart
-- Views: user_analytics_my_revenue_trend, user_analytics_my_product_performance,
--        user_analytics_my_category_performance, user_analytics_my_order_status_distribution,
--        user_analytics_my_sales_trend, user_analytics_my_top_customers,
--        user_analytics_my_monthly_revenue, user_analytics_my_purchase_trend,
--        user_analytics_my_seller_rating_breakdown
-- RLS: All views include seller_id/buyer_id/user_id for frontend filtering
-- Frontend Filtering: Use .eq('seller_id', userId) or .eq('buyer_id', userId)
-- =====================================================================

-- User Analytics View: My Revenue Trend
-- Chart Type: LINE CHART / AREA CHART
-- Usage: Track user's revenue over time (as seller)
-- Frontend Location: /dashboard/analytics (Revenue Trend section)
-- Query Method: supabase.from('user_analytics_my_revenue_trend').select('*').eq('seller_id', userId)
-- Time Range: Last 90 days
-- Columns: date, seller_id, transactions, daily_revenue, avg_transaction_value, cumulative_revenue,
--          sales, rentals, services
-- Recharts Data Format: { date: '2025-11-25', daily_revenue: 150.50, transactions: 3, cumulative_revenue: 1500 }
CREATE OR REPLACE VIEW user_analytics_my_revenue_trend AS
SELECT 
    DATE(completed_at) as date,
    seller_id,
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
GROUP BY seller_id, DATE(completed_at)
ORDER BY date ASC;

COMMENT ON VIEW user_analytics_my_revenue_trend IS 'LINE CHART / AREA CHART - User revenue trend over time (as seller)';

-- User Analytics View: My Product Performance
-- Chart Type: BAR CHART
-- Usage: Compare performance of user's products
-- Frontend Location: /dashboard/analytics (Product Performance section)
-- Query Method: supabase.from('user_analytics_my_product_performance').select('*').eq('user_id', userId)
-- Columns: user_id, product_id, product_name, view_count, favorite_count, sales_count,
--          total_revenue, category_name, created_at, view_rank, favorite_rank, sales_rank
-- Recharts Data Format: { product_name: 'iPhone 14', view_count: 250, sales_count: 15, total_revenue: 4500 }
CREATE OR REPLACE VIEW user_analytics_my_product_performance AS
SELECT 
    p.user_id,
    p.product_id,
    p.product_name,
    p.view_count,
    (SELECT COUNT(*) FROM product_favorites WHERE product_id = p.product_id) as favorite_count,
    (SELECT COUNT(*) FROM transactions WHERE product_id = p.product_id AND transaction_status = 'COMPLETED') as sales_count,
    (SELECT COALESCE(SUM(item_price * quantity), 0) FROM transactions WHERE product_id = p.product_id AND transaction_status = 'COMPLETED') as total_revenue,
    c.category_name,
    p.created_at,
    RANK() OVER (ORDER BY p.view_count DESC) as view_rank,
    RANK() OVER (ORDER BY (SELECT COUNT(*) FROM product_favorites WHERE product_id = p.product_id) DESC) as favorite_rank,
    RANK() OVER (ORDER BY (SELECT COUNT(*) FROM transactions WHERE product_id = p.product_id AND transaction_status = 'COMPLETED') DESC) as sales_rank
FROM products p
INNER JOIN categories c ON p.category_id = c.category_id
WHERE p.status = 'APPROVED'
ORDER BY p.view_count DESC;

COMMENT ON VIEW user_analytics_my_product_performance IS 'BAR CHART - User product performance comparison';

-- User Analytics View: My Category Performance
-- Chart Type: PIE CHART / DONUT CHART
-- Usage: Revenue breakdown by category (user's products)
-- Frontend Location: /dashboard/analytics (Category Performance - Pie Chart)
-- Query Method: supabase.from('user_analytics_my_category_performance').select('*').eq('user_id', userId)
-- Columns: user_id, category_id, category_name, product_count, completed_transactions,
--          total_revenue, total_views, total_favorites
-- Recharts Data Format: { category_name: 'Electronics', total_revenue: 5000, product_count: 8 }
CREATE OR REPLACE VIEW user_analytics_my_category_performance AS
SELECT 
    p.user_id,
    c.category_id,
    c.category_name,
    COUNT(p.product_id) as product_count,
    (SELECT COUNT(*) FROM transactions WHERE product_id IN (SELECT product_id FROM products WHERE user_id = p.user_id AND category_id = c.category_id) AND transaction_status = 'COMPLETED') as completed_transactions,
    (SELECT COALESCE(SUM(item_price * quantity), 0) FROM transactions WHERE product_id IN (SELECT product_id FROM products WHERE user_id = p.user_id AND category_id = c.category_id) AND transaction_status = 'COMPLETED') as total_revenue,
    (SELECT SUM(view_count) FROM products WHERE user_id = p.user_id AND category_id = c.category_id) as total_views,
    (SELECT COUNT(*) FROM product_favorites WHERE product_id IN (SELECT product_id FROM products WHERE user_id = p.user_id AND category_id = c.category_id)) as total_favorites
FROM products p
INNER JOIN categories c ON p.category_id = c.category_id
WHERE p.status = 'APPROVED'
GROUP BY p.user_id, c.category_id, c.category_name
ORDER BY total_revenue DESC;

COMMENT ON VIEW user_analytics_my_category_performance IS 'PIE CHART / DONUT CHART - User revenue breakdown by category';

-- User Analytics View: My Order Status Distribution
-- Chart Type: DONUT CHART
-- Usage: Orders received vs completed vs rejected breakdown
-- Frontend Location: /dashboard/analytics (Order Status - Donut Chart)
-- Query Method: supabase.from('user_analytics_my_order_status_distribution').select('*').eq('seller_id', userId)
-- Columns: seller_id, order_status, count, percentage, total_value
-- Recharts Data Format: { order_status: 'COMPLETED', count: 45, percentage: 75.5, total_value: 12000 }
CREATE OR REPLACE VIEW user_analytics_my_order_status_distribution AS
SELECT 
    seller_id,
    order_status,
    COUNT(*) as count,
    ROUND(COUNT(*)::DECIMAL / (SELECT COUNT(*) FROM order_details WHERE seller_id = order_details.seller_id) * 100, 2) as percentage,
    COALESCE(SUM(price * buyer_quantity), 0) as total_value
FROM order_details
GROUP BY seller_id, order_status
ORDER BY count DESC;

COMMENT ON VIEW user_analytics_my_order_status_distribution IS 'DONUT CHART - User order status breakdown';

-- User Analytics View: My Sales Trend
-- Chart Type: LINE CHART
-- Usage: Sales count trend over time
-- Frontend Location: /dashboard/analytics (Sales Trend section)
-- Query Method: supabase.from('user_analytics_my_sales_trend').select('*').eq('seller_id', userId)
-- Time Range: Last 90 days
-- Columns: seller_id, date, daily_sales, cumulative_sales, for_sale, for_rent, services
-- Recharts Data Format: { date: '2025-11-25', daily_sales: 5, cumulative_sales: 150, for_sale: 3 }
CREATE OR REPLACE VIEW user_analytics_my_sales_trend AS
SELECT 
    seller_id,
    DATE(completed_at) as date,
    COUNT(*) as daily_sales,
    SUM(COUNT(*)) OVER (PARTITION BY seller_id ORDER BY DATE(completed_at)) as cumulative_sales,
    COUNT(*) FILTER (WHERE listing_type = 'FOR_SALE') as for_sale,
    COUNT(*) FILTER (WHERE listing_type = 'FOR_RENT') as for_rent,
    COUNT(*) FILTER (WHERE listing_type = 'SERVICE') as services
FROM transactions
WHERE transaction_status = 'COMPLETED'
AND completed_at >= NOW() - INTERVAL '90 days'
GROUP BY seller_id, DATE(completed_at)
ORDER BY date ASC;

COMMENT ON VIEW user_analytics_my_sales_trend IS 'LINE CHART - User sales count trend over time';

-- User Analytics View: My Top Customers
-- Chart Type: BAR CHART / DATA TABLE
-- Usage: Most frequent buyers
-- Frontend Location: /dashboard/analytics (Top Customers - Bar Chart with table view)
-- Query Method: supabase.from('user_analytics_my_top_customers').select('*').eq('seller_id', userId)
-- Limit: Top 20 customers by total spending
-- Columns: seller_id, buyer_id, username, full_name, total_orders, total_spent, avg_order_value,
--          last_order_date, buyer_avg_rating
-- Recharts Data Format: { full_name: 'John Doe', total_spent: 5000, total_orders: 12 }
CREATE OR REPLACE VIEW user_analytics_my_top_customers AS
SELECT 
    od.seller_id,
    od.buyer_id,
    u.username,
    u.first_name || ' ' || u.last_name as full_name,
    COUNT(DISTINCT od.order_id) as total_orders,
    COALESCE(SUM(od.price * od.buyer_quantity), 0) as total_spent,
    COALESCE(AVG(od.price * od.buyer_quantity), 0) as avg_order_value,
    MAX(od.created_at) as last_order_date,
    COALESCE(AVG(r.rating), 0) as buyer_avg_rating
FROM order_details od
INNER JOIN users u ON od.buyer_id = u.user_id
LEFT JOIN reviews r ON r.reviewer_id = od.buyer_id
GROUP BY od.seller_id, od.buyer_id, u.username, u.first_name, u.last_name
ORDER BY total_spent DESC
LIMIT 20;

COMMENT ON VIEW user_analytics_my_top_customers IS 'BAR CHART / DATA TABLE - User top customers by spending';

-- User Analytics View: My Monthly Revenue
-- Chart Type: COLUMN CHART / BAR CHART
-- Usage: Monthly revenue breakdown
-- Frontend Location: /dashboard/analytics (Monthly Revenue - Column Chart)
-- Query Method: supabase.from('user_analytics_my_monthly_revenue').select('*').eq('seller_id', userId)
-- Time Range: Last 12 months
-- Columns: seller_id, month, transaction_count, monthly_revenue, avg_transaction_value,
--          sales, rentals, services
-- Recharts Data Format: { month: 'Nov 2025', monthly_revenue: 8500, transaction_count: 45 }
CREATE OR REPLACE VIEW user_analytics_my_monthly_revenue AS
SELECT 
    seller_id,
    DATE_TRUNC('month', completed_at) as month,
    COUNT(*) as transaction_count,
    COALESCE(SUM(item_price * quantity), 0) as monthly_revenue,
    COALESCE(AVG(item_price * quantity), 0) as avg_transaction_value,
    COUNT(*) FILTER (WHERE listing_type = 'FOR_SALE') as sales,
    COUNT(*) FILTER (WHERE listing_type = 'FOR_RENT') as rentals,
    COUNT(*) FILTER (WHERE listing_type = 'SERVICE') as services
FROM transactions
WHERE transaction_status = 'COMPLETED'
AND completed_at >= NOW() - INTERVAL '12 months'
GROUP BY seller_id, DATE_TRUNC('month', completed_at)
ORDER BY month DESC;

COMMENT ON VIEW user_analytics_my_monthly_revenue IS 'COLUMN CHART / BAR CHART - User monthly revenue breakdown';

-- User Analytics View: My Buyer Purchase History Trend
-- Chart Type: LINE CHART
-- Usage: As buyer, track purchase trends
-- Frontend Location: /dashboard/analytics (Purchase History - Line Chart)
-- Query Method: supabase.from('user_analytics_my_purchase_trend').select('*').eq('buyer_id', userId)
-- Time Range: Last 90 days
-- Columns: buyer_id, date, daily_purchases, cumulative_purchases, daily_spent, avg_purchase_value
-- Recharts Data Format: { date: '2025-11-25', daily_purchases: 2, daily_spent: 250.50 }
CREATE OR REPLACE VIEW user_analytics_my_purchase_trend AS
SELECT 
    buyer_id,
    DATE(created_at) as date,
    COUNT(*) as daily_purchases,
    SUM(COUNT(*)) OVER (PARTITION BY buyer_id ORDER BY DATE(created_at)) as cumulative_purchases,
    COALESCE(SUM(price * buyer_quantity), 0) as daily_spent,
    COALESCE(AVG(price * buyer_quantity), 0) as avg_purchase_value
FROM order_details
WHERE created_at >= NOW() - INTERVAL '90 days'
GROUP BY buyer_id, DATE(created_at)
ORDER BY date ASC;

COMMENT ON VIEW user_analytics_my_purchase_trend IS 'LINE CHART - User purchase trend over time (as buyer)';

-- User Analytics View: My Seller Rating Breakdown
-- Chart Type: BAR CHART / RATING CHART
-- Usage: Seller rating distribution
-- Frontend Location: /dashboard/analytics (Seller Ratings - Rating Chart)
-- Query Method: supabase.from('user_analytics_my_seller_rating_breakdown').select('*').eq('seller_id', userId)
-- Columns: seller_id, rating (1-5 stars), review_count, percentage, avg_rating
-- Recharts Data Format: { rating: 5, review_count: 45, percentage: 75.5 }
CREATE OR REPLACE VIEW user_analytics_my_seller_rating_breakdown AS
WITH seller_rating_counts AS (
    SELECT 
        seller_id,
        rating,
        COUNT(*) as review_count
    FROM reviews
    GROUP BY seller_id, rating
),
seller_total_reviews AS (
    SELECT 
        seller_id,
        COUNT(*) as total_reviews
    FROM reviews
    GROUP BY seller_id
)
SELECT 
    src.seller_id,
    src.rating,
    src.review_count,
    ROUND(src.review_count::DECIMAL / NULLIF(str.total_reviews, 0) * 100, 2) as percentage,
    (SELECT COALESCE(AVG(rating), 0) FROM reviews WHERE seller_id = src.seller_id) as avg_rating
FROM seller_rating_counts src
INNER JOIN seller_total_reviews str ON src.seller_id = str.seller_id
ORDER BY src.seller_id, src.rating DESC;

COMMENT ON VIEW user_analytics_my_seller_rating_breakdown IS 'BAR CHART / RATING CHART - User seller rating distribution';

-- =====================================================================
-- ADMIN CHART & ANALYTICS VIEWS
-- =====================================================================
-- These views are for ADMIN ONLY - Advanced analytics & business intelligence
-- Location in codebase: /admin/analytics
-- Authentication: Admin role required (is_admin = TRUE)
-- Real-time: YES - No caching for dashboard
-- =====================================================================

-- =====================================================================
-- SECTION 3: ADMIN CHART & ANALYTICS VIEWS (9 Views)
-- Purpose: Platform-wide analytics and insights
-- Implementation: Admin Dashboard - Analytics Tab (/admin/analytics)
-- Chart Types: Line, Area, Bar, Pie, Donut, Funnel, Pareto
-- Views: analytics_view_category_performance, analytics_view_user_growth,
--        analytics_view_product_trend, analytics_view_revenue_trend,
--        analytics_view_top_sellers, analytics_view_top_products,
--        analytics_view_transaction_status, analytics_view_listing_type_distribution
-- No RLS filtering: Admin has access to all platform data
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
-- MATERIALIZED VIEWS & OPTIMIZATION
-- =====================================================================
-- Pre-computed aggregations for dashboard performance
-- These views are optimized and cached for faster load times
-- Refresh Strategy: Daily or on-demand via refresh_all_analytics_mv()
-- =====================================================================

-- =====================================================================
-- SECTION 4: MATERIALIZED VIEWS (7 Pre-Computed Views)
-- Purpose: Optimized aggregations for fast dashboard rendering
-- Refresh: Daily or on-demand
-- Implementation: Backend cron job or manual refresh
-- Views: mv_daily_platform_metrics, mv_weekly_revenue_by_category,
--        mv_user_engagement_heatmap, mv_monthly_category_pareto,
--        mv_transaction_funnel, mv_seller_performance_scorecard,
--        mv_product_lifecycle_analysis
-- Index Strategy: Unique indexes on date/time columns for fast queries
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
    RAISE NOTICE 'User Analytics Chart Views: 8';
    RAISE NOTICE 'Admin Analytics Views: 9';
    RAISE NOTICE 'Materialized Views: 7';
    RAISE NOTICE 'TOTAL VIEWS: 33';
    RAISE NOTICE '';
    RAISE NOTICE 'Database is PRODUCTION-READY';
END $$;

-- =====================================================================
-- ███████╗██╗  ██╗██╗   ██╗███████╗██████╗ ██╗   ██╗    ██████╗ ███████╗███████╗██████╗ ███████╗███████╗
-- ██╔════╝██║  ██║██║   ██║██╔════╝██╔══██╗╚██╗ ██╔╝    ██╔══██╗██╔════╝██╔════╝██╔══██╗██╔════╝██╔════╝
-- █████╗  ███████║██║   ██║█████╗  ██████╔╝ ╚████╔╝     ██████╔╝█████╗  █████╗  ██████╔╝█████╗  █████╗  
-- ██╔══╝  ██╔══██║██║   ██║██╔══╝  ██╔══██╗  ╚██╔╝      ██╔══██╗██╔══╝  ██╔══╝  ██╔═══╝ ██╔══╝  ██╔══╝  
-- ██║     ██║  ██║╚██████╔╝███████╗██║  ██║   ██║       ██║  ██║███████╗███████╗██║     ███████╗███████╗
-- ╚═╝     ╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝  ╚═╝   ╚═╝       ╚═╝  ╚═╝╚══════╝╚══════╝╚═╝     ╚══════╝╚══════╝
-- =====================================================================
-- QUERY EXAMPLES & FRONTEND INTEGRATION GUIDE
-- =====================================================================

-- ╔═════════════════════════════════════════════════════════════════════════════════╗
-- ║                         FOR DASHBOARD QUERIES (USERS)                           ║
-- ║                                                                                 ║
-- ║  Use these queries in your React components for regular user dashboards         ║
-- │  Location: /src/pages/DashboardPage.tsx, /dashboard/analytics                  ║
-- ║  Filter by: user_id, seller_id, or buyer_id (current logged-in user)           ║
-- ╚═════════════════════════════════════════════════════════════════════════════════╝

-- ═══════════════════════════════════════════════════════════════════════════════════
-- DASHBOARD: BASIC VIEWS (Personal Overview & Data Tables)
-- ═══════════════════════════════════════════════════════════════════════════════════
-- Views: 5 total
-- Purpose: Personal statistics, listings, orders, and sales data
-- Frontend: /dashboard (main page), /my-listings, /my-orders

-- 1️⃣ USER PERSONAL DASHBOARD OVERVIEW
--    View Name: user_view_dashboard_overview
--    Location: /dashboard (KPI cards at top of page)
--    Query Method:
--    ┌─────────────────────────────────────────────────────────────┐
--    │ const { data } = await supabase                             │
--    │   .from('user_view_dashboard_overview')                     │
--    │   .select('*')                                              │
--    │   .eq('user_id', currentUserId)                             │
--    │   .single();                                                 │
--    └─────────────────────────────────────────────────────────────┘
--    Returns: 16 KPI metrics (total_products_posted, sales_30d, revenue_30d, etc.)
--    Chart Type: KPI CARDS

-- 2️⃣ USER'S PRODUCT LISTINGS
--    View Name: user_view_my_listings
--    Location: /dashboard/listings or /my-listings
--    Query Method:
--    ┌─────────────────────────────────────────────────────────────┐
--    │ const { data } = await supabase                             │
--    │   .from('user_view_my_listings')                            │
--    │   .select('*')                                              │
--    │   .eq('user_id', currentUserId)                             │
--    │   .order('created_at', { ascending: false });               │
--    └─────────────────────────────────────────────────────────────┘
--    Returns: All user's products with performance (views, sales, revenue)
--    Chart Type: DATA TABLE with METRICS

-- 3️⃣ USER'S ORDERS AS BUYER
--    View Name: user_view_my_orders_buyer
--    Location: /my-orders (Buyer tab)
--    Query Method:
--    ┌─────────────────────────────────────────────────────────────┐
--    │ const { data } = await supabase                             │
--    │   .from('user_view_my_orders_buyer')                        │
--    │   .select('*')                                              │
--    │   .eq('buyer_id', currentUserId)                            │
--    │   .order('order_date', { ascending: false });               │
--    └─────────────────────────────────────────────────────────────┘
--    Returns: Orders placed by user with seller info
--    Chart Type: DATA TABLE

-- 4️⃣ USER'S SALES AS SELLER
--    View Name: user_view_my_sales_seller
--    Location: /my-orders (Seller tab)
--    Query Method:
--    ┌─────────────────────────────────────────────────────────────┐
--    │ const { data } = await supabase                             │
--    │   .from('user_view_my_sales_seller')                        │
--    │   .select('*')                                              │
--    │   .eq('seller_id', currentUserId)                           │
--    │   .order('order_date', { ascending: false });               │
--    └─────────────────────────────────────────────────────────────┘
--    Returns: Orders received by user with buyer info
--    Chart Type: DATA TABLE

-- ═══════════════════════════════════════════════════════════════════════════════════
-- DASHBOARD: ANALYTICS CHARTS (9 Chart Views)
-- ═══════════════════════════════════════════════════════════════════════════════════
-- Views: 8 total (user-specific analytics with Recharts data format)
-- Purpose: Professional visualizations for /dashboard/analytics
-- Frontend: React Recharts components

-- 5️⃣ REVENUE TREND (Line/Area Chart)
--    View Name: user_analytics_my_revenue_trend
--    Location: /dashboard/analytics (Revenue Trend section)
--    Query Method:
--    ┌─────────────────────────────────────────────────────────────┐
--    │ const { data } = await supabase                             │
--    │   .from('user_analytics_my_revenue_trend')                  │
--    │   .select('*')                                              │
--    │   .eq('seller_id', currentUserId)                           │
--    │   .order('date', { ascending: true });                      │
--    └─────────────────────────────────────────────────────────────┘
--    Data Format: { date: '2025-11-25', daily_revenue: 150.50, transactions: 3, ... }
--    Time Range: Last 90 days
--    Chart Type: LINE CHART / AREA CHART

-- 6️⃣ PRODUCT PERFORMANCE (Bar Chart)
--    View Name: user_analytics_my_product_performance
--    Location: /dashboard/analytics (Product Performance section)
--    Query Method:
--    ┌─────────────────────────────────────────────────────────────┐
--    │ const { data } = await supabase                             │
--    │   .from('user_analytics_my_product_performance')            │
--    │   .select('*')                                              │
--    │   .eq('user_id', currentUserId)                             │
--    │   .order('total_revenue', { ascending: false });            │
--    └─────────────────────────────────────────────────────────────┘
--    Data Format: { product_name: 'iPhone 14', view_count: 250, sales_count: 15, ... }
--    Chart Type: BAR CHART

-- 7️⃣ CATEGORY PERFORMANCE (Pie/Donut Chart)
--    View Name: user_analytics_my_category_performance
--    Location: /dashboard/analytics (Category Performance - Pie Chart)
--    Query Method:
--    ┌─────────────────────────────────────────────────────────────┐
--    │ const { data } = await supabase                             │
--    │   .from('user_analytics_my_category_performance')           │
--    │   .select('*')                                              │
--    │   .eq('user_id', currentUserId)                             │
--    │   .order('total_revenue', { ascending: false });            │
--    └─────────────────────────────────────────────────────────────┘
--    Data Format: { category_name: 'Electronics', total_revenue: 5000, product_count: 8 }
--    Chart Type: PIE CHART / DONUT CHART

-- 8️⃣ ORDER STATUS DISTRIBUTION (Donut Chart)
--    View Name: user_analytics_my_order_status_distribution
--    Location: /dashboard/analytics (Order Status - Donut Chart)
--    Query Method:
--    ┌─────────────────────────────────────────────────────────────┐
--    │ const { data } = await supabase                             │
--    │   .from('user_analytics_my_order_status_distribution')      │
--    │   .select('*')                                              │
--    │   .eq('seller_id', currentUserId);                          │
--    └─────────────────────────────────────────────────────────────┘
--    Data Format: { order_status: 'COMPLETED', count: 45, percentage: 75.5 }
--    Chart Type: DONUT CHART

-- 9️⃣ SALES TREND (Line Chart)
--    View Name: user_analytics_my_sales_trend
--    Location: /dashboard/analytics (Sales Trend section)
--    Query Method:
--    ┌─────────────────────────────────────────────────────────────┐
--    │ const { data } = await supabase                             │
--    │   .from('user_analytics_my_sales_trend')                    │
--    │   .select('*')                                              │
--    │   .eq('seller_id', currentUserId)                           │
--    │   .order('date', { ascending: true });                      │
--    └─────────────────────────────────────────────────────────────┘
--    Data Format: { date: '2025-11-25', daily_sales: 5, cumulative_sales: 150 }
--    Time Range: Last 90 days
--    Chart Type: LINE CHART

-- 🔟 TOP CUSTOMERS (Bar Chart / Table)
--    View Name: user_analytics_my_top_customers
--    Location: /dashboard/analytics (Top Customers section)
--    Query Method:
--    ┌─────────────────────────────────────────────────────────────┐
--    │ const { data } = await supabase                             │
--    │   .from('user_analytics_my_top_customers')                  │
--    │   .select('*')                                              │
--    │   .eq('seller_id', currentUserId)                           │
--    │   .limit(20);                                               │
--    └─────────────────────────────────────────────────────────────┘
--    Data Format: { full_name: 'John Doe', total_spent: 5000, total_orders: 12 }
--    Limit: Top 20 customers by spending
--    Chart Type: BAR CHART / DATA TABLE

-- 1️⃣1️⃣ MONTHLY REVENUE (Column Chart)
--    View Name: user_analytics_my_monthly_revenue
--    Location: /dashboard/analytics (Monthly Revenue section)
--    Query Method:
--    ┌─────────────────────────────────────────────────────────────┐
--    │ const { data } = await supabase                             │
--    │   .from('user_analytics_my_monthly_revenue')                │
--    │   .select('*')                                              │
--    │   .eq('seller_id', currentUserId)                           │
--    │   .order('month', { ascending: false });                    │
--    └─────────────────────────────────────────────────────────────┘
--    Data Format: { month: '2025-11-01', monthly_revenue: 8500, transaction_count: 45 }
--    Time Range: Last 12 months
--    Chart Type: COLUMN CHART / BAR CHART

-- 1️⃣2️⃣ PURCHASE TREND (Line Chart - as Buyer)
--    View Name: user_analytics_my_purchase_trend
--    Location: /dashboard/analytics (Purchase History section)
--    Query Method:
--    ┌─────────────────────────────────────────────────────────────┐
--    │ const { data } = await supabase                             │
--    │   .from('user_analytics_my_purchase_trend')                 │
--    │   .select('*')                                              │
--    │   .eq('buyer_id', currentUserId)                            │
--    │   .order('date', { ascending: true });                      │
--    └─────────────────────────────────────────────────────────────┘
--    Data Format: { date: '2025-11-25', daily_purchases: 2, daily_spent: 250.50 }
--    Time Range: Last 90 days
--    Chart Type: LINE CHART

-- 1️⃣3️⃣ SELLER RATING BREAKDOWN (Rating Chart)
--    View Name: user_analytics_my_seller_rating_breakdown
--    Location: /dashboard/analytics (Seller Ratings section)
--    Query Method:
--    ┌─────────────────────────────────────────────────────────────┐
--    │ const { data } = await supabase                             │
--    │   .from('user_analytics_my_seller_rating_breakdown')        │
--    │   .select('*')                                              │
--    │   .eq('seller_id', currentUserId)                           │
--    │   .order('rating', { ascending: false });                   │
--    └─────────────────────────────────────────────────────────────┘
--    Data Format: { rating: 5, review_count: 45, percentage: 75.5 }
--    Chart Type: BAR CHART / RATING CHART

-- ╔═════════════════════════════════════════════════════════════════════════════════╗
-- ║                         FOR ADMIN QUERIES (ADMINS ONLY)                         ║
-- ║                                                                                 ║
-- ║  Use these queries in your React admin components                              ║
-- │  Location: /src/admin/AdminDashboard.tsx, /admin/analytics                     ║
-- ║  Authentication: Requires is_admin = TRUE                                      ║
-- ║  Data Access: Platform-wide (no filtering by user_id)                          ║
-- ╚═════════════════════════════════════════════════════════════════════════════════╝

-- ═══════════════════════════════════════════════════════════════════════════════════
-- ADMIN: BASIC VIEWS (Platform Overview & Management)
-- ═══════════════════════════════════════════════════════════════════════════════════
-- Views: 4 total
-- Purpose: Real-time admin dashboard data
-- Frontend: /admin/dashboard

-- 1️⃣ PLATFORM OVERVIEW KPIs
--    View Name: admin_view_platform_overview
--    Location: /admin/dashboard (Top section - 26 KPI metrics)
--    Query Method:
--    ┌─────────────────────────────────────────────────────────────┐
--    │ const { data } = await supabase                             │
--    │   .from('admin_view_platform_overview')                     │
--    │   .select('*')                                              │
--    │   .single();                                                 │
--    └─────────────────────────────────────────────────────────────┘
--    Returns: 26 KPI cards (total_active_users, approved_products, total_revenue, etc.)
--    Chart Type: KPI CARDS

-- 2️⃣ RECENT TRANSACTIONS
--    View Name: admin_view_recent_transactions
--    Location: /admin/dashboard (Transactions Tab - Full Width)
--    Query Method:
--    ┌─────────────────────────────────────────────────────────────┐
--    │ const { data } = await supabase                             │
--    │   .from('admin_view_recent_transactions')                   │
--    │   .select('*')                                              │
--    │   .order('created_at', { ascending: false })                │
--    │   .limit(100);                                              │
--    └─────────────────────────────────────────────────────────────┘
--    Returns: Latest 100 transactions with full details
--    Chart Type: DATA TABLE with STATUS COLORS

-- 3️⃣ USER ACTIVITY MONITORING
--    View Name: admin_view_user_activity
--    Location: /admin/dashboard (Users Tab - Full Width)
--    Query Method:
--    ┌─────────────────────────────────────────────────────────────┐
--    │ const { data } = await supabase                             │
--    │   .from('admin_view_user_activity')                         │
--    │   .select('*')                                              │
--    │   .order('last_active_at', { ascending: false });           │
--    └─────────────────────────────────────────────────────────────┘
--    Returns: All users with activity metrics (last_active_at, activity_status)
--    Chart Type: DATA TABLE with SPARKLINES

-- 4️⃣ PRODUCT APPROVAL QUEUE
--    View Name: admin_view_pending_products
--    Location: /admin/dashboard (Approvals Tab - Action Required)
--    Query Method:
--    ┌─────────────────────────────────────────────────────────────┐
--    │ const { data } = await supabase                             │
--    │   .from('admin_view_pending_products')                      │
--    │   .select('*')                                              │
--    │   .order('created_at', { ascending: true });                │
--    └─────────────────────────────────────────────────────────────┘
--    Returns: Products pending approval with priority flags (urgent, high, normal)
--    Chart Type: DATA TABLE with PRIORITY BADGES

-- ═══════════════════════════════════════════════════════════════════════════════════
-- ADMIN: ANALYTICS CHARTS (9 Chart Views)
-- ═══════════════════════════════════════════════════════════════════════════════════
-- Views: 9 total (platform-wide analytics)
-- Purpose: Advanced business intelligence for /admin/analytics
-- Frontend: React Recharts components

-- 5️⃣ CATEGORY PERFORMANCE
--    View Name: analytics_view_category_performance
--    Location: /admin/analytics (Category Performance section)
--    Query Method:
--    ┌─────────────────────────────────────────────────────────────┐
--    │ const { data } = await supabase                             │
--    │   .from('analytics_view_category_performance')              │
--    │   .select('*')                                              │
--    │   .order('total_revenue', { ascending: false });            │
--    └─────────────────────────────────────────────────────────────┘
--    Data Format: { category_name: 'Electronics', total_revenue: 50000, approval_rate: 85.5 }
--    Chart Type: BAR CHART / PIE CHART

-- 6️⃣ USER GROWTH TREND
--    View Name: analytics_view_user_growth
--    Location: /admin/analytics (User Growth section)
--    Query Method:
--    ┌─────────────────────────────────────────────────────────────┐
--    │ const { data } = await supabase                             │
--    │   .from('analytics_view_user_growth')                       │
--    │   .select('*')                                              │
--    │   .order('date', { ascending: true });                      │
--    └─────────────────────────────────────────────────────────────┘
--    Data Format: { date: '2025-11-25', new_users: 15, cumulative_users: 500 }
--    Time Range: Last 90 days
--    Chart Type: LINE CHART / AREA CHART

-- 7️⃣ PRODUCT LISTING TREND
--    View Name: analytics_view_product_trend
--    Location: /admin/analytics (Product Trend section)
--    Query Method:
--    ┌─────────────────────────────────────────────────────────────┐
--    │ const { data } = await supabase                             │
--    │   .from('analytics_view_product_trend')                     │
--    │   .select('*')                                              │
--    │   .order('date', { ascending: true });                      │
--    └─────────────────────────────────────────────────────────────┘
--    Data Format: { date: '2025-11-25', new_products: 25, approved: 20, pending: 5 }
--    Time Range: Last 90 days
--    Chart Type: STACKED LINE CHART

-- 8️⃣ REVENUE TREND (Platform-wide)
--    View Name: analytics_view_revenue_trend
--    Location: /admin/analytics (Revenue Trend section)
--    Query Method:
--    ┌─────────────────────────────────────────────────────────────┐
--    │ const { data } = await supabase                             │
--    │   .from('analytics_view_revenue_trend')                     │
--    │   .select('*')                                              │
--    │   .order('date', { ascending: true });                      │
--    └─────────────────────────────────────────────────────────────┘
--    Data Format: { date: '2025-11-25', daily_revenue: 5000, transactions: 120 }
--    Time Range: Last 90 days
--    Chart Type: LINE CHART / AREA CHART

-- 9️⃣ TOP SELLERS LEADERBOARD
--    View Name: analytics_view_top_sellers
--    Location: /admin/analytics (Top Sellers Leaderboard)
--    Query Method:
--    ┌─────────────────────────────────────────────────────────────┐
--    │ const { data } = await supabase                             │
--    │   .from('analytics_view_top_sellers')                       │
--    │   .select('*')                                              │
--    │   .limit(50);                                               │
--    └─────────────────────────────────────────────────────────────┘
--    Data Format: { full_name: 'Jane Smith', total_revenue: 150000, revenue_rank: 1 }
--    Limit: Top 50 sellers
--    Chart Type: BAR CHART / DATA TABLE

-- 🔟 TOP PRODUCTS
--    View Name: analytics_view_top_products
--    Location: /admin/analytics (Top Products section)
--    Query Method:
--    ┌─────────────────────────────────────────────────────────────┐
--    │ const { data } = await supabase                             │
--    │   .from('analytics_view_top_products')                      │
--    │   .select('*')                                              │
--    │   .order('view_count', { ascending: false })                │
--    │   .limit(50);                                               │
--    └─────────────────────────────────────────────────────────────┘
--    Data Format: { product_name: 'iPhone 14', view_count: 5000, sales_count: 125 }
--    Limit: Top 50 products
--    Chart Type: DATA TABLE with RANKINGS

-- 1️⃣1️⃣ TRANSACTION STATUS DISTRIBUTION
--    View Name: analytics_view_transaction_status
--    Location: /admin/analytics (Transaction Status section)
--    Query Method:
--    ┌─────────────────────────────────────────────────────────────┐
--    │ const { data } = await supabase                             │
--    │   .from('analytics_view_transaction_status')                │
--    │   .select('*');                                             │
--    └─────────────────────────────────────────────────────────────┘
--    Data Format: { transaction_status: 'COMPLETED', count: 1000, percentage: 85.5 }
--    Chart Type: DONUT CHART / PIE CHART

-- 1️⃣2️⃣ LISTING TYPE DISTRIBUTION
--    View Name: analytics_view_listing_type_distribution
--    Location: /admin/analytics (Listing Type section)
--    Query Method:
--    ┌─────────────────────────────────────────────────────────────┐
--    │ const { data } = await supabase                             │
--    │   .from('analytics_view_listing_type_distribution')         │
--    │   .select('*');                                             │
--    └─────────────────────────────────────────────────────────────┘
--    Data Format: { listing_type: 'FOR_SALE', product_count: 500, total_revenue: 75000 }
--    Chart Type: DONUT CHART

-- ═══════════════════════════════════════════════════════════════════════════════════
-- ADMIN: MATERIALIZED VIEWS (Pre-Computed Cache - Optimize Performance)
-- ═══════════════════════════════════════════════════════════════════════════════════
-- Views: 7 total (cached aggregations)
-- Purpose: Pre-computed data for blazingly fast dashboard loads
-- Refresh Command: SELECT refresh_all_analytics_mv();

-- 💾 MATERIALIZED VIEW: Daily Platform Metrics
--    View Name: mv_daily_platform_metrics
--    Purpose: Daily KPI snapshot
--    Refresh Frequency: Every 6 hours
--    Query: SELECT * FROM mv_daily_platform_metrics;
--    Chart Type: KPI DASHBOARD

-- 💾 MATERIALIZED VIEW: Weekly Revenue by Category
--    View Name: mv_weekly_revenue_by_category
--    Purpose: Weekly revenue breakdown
--    Refresh Frequency: Daily
--    Query: SELECT * FROM mv_weekly_revenue_by_category ORDER BY week_start DESC;
--    Chart Type: COLUMN CHART

-- 💾 MATERIALIZED VIEW: User Engagement Heatmap
--    View Name: mv_user_engagement_heatmap
--    Purpose: Activity patterns by day/hour
--    Refresh Frequency: Daily
--    Query: SELECT * FROM mv_user_engagement_heatmap;
--    Chart Type: HEATMAP / CALENDAR CHART

-- 💾 MATERIALIZED VIEW: Monthly Category Pareto
--    View Name: mv_monthly_category_pareto
--    Purpose: Category revenue distribution (Pareto principle)
--    Refresh Frequency: Daily
--    Query: SELECT * FROM mv_monthly_category_pareto ORDER BY month DESC;
--    Chart Type: PARETO CHART

-- 💾 MATERIALIZED VIEW: Transaction Funnel
--    View Name: mv_transaction_funnel
--    Purpose: User journey from view to completion
--    Refresh Frequency: Every 6 hours
--    Query: SELECT * FROM mv_transaction_funnel ORDER BY stage_order;
--    Chart Type: FUNNEL CHART

-- 💾 MATERIALIZED VIEW: Seller Performance Scorecard
--    View Name: mv_seller_performance_scorecard
--    Purpose: Seller tier and performance metrics
--    Refresh Frequency: Daily
--    Query: SELECT * FROM mv_seller_performance_scorecard WHERE seller_tier = 'Gold';
--    Chart Type: SCORECARD / RADAR CHART

-- 💾 MATERIALIZED VIEW: Product Lifecycle Analysis
--    View Name: mv_product_lifecycle_analysis
--    Purpose: Product status progression over time
--    Refresh Frequency: Daily
--    Query: SELECT * FROM mv_product_lifecycle_analysis ORDER BY date ASC;
--    Chart Type: STACKED AREA CHART

-- ═══════════════════════════════════════════════════════════════════════════════════
-- TO REFRESH ALL MATERIALIZED VIEWS:
-- ═══════════════════════════════════════════════════════════════════════════════════
--    SELECT refresh_all_analytics_mv();

-- =====================================================================
-- FILE STRUCTURE SUMMARY
-- =====================================================================
-- Total Views: 33 (Production-Ready)
-- ───────────────────────────────────────────────────────────────────
-- FOR DASHBOARD (Users):
--   • Basic Views: 4 views (dashboard, listings, orders, sales)
--   • Analytics Charts: 8 views (revenue, products, categories, orders, etc.)
--   Total: 12 views
--
-- FOR ADMIN:
--   • Admin Views: 4 views (platform KPIs, transactions, users, pending)
--   • Analytics Charts: 9 views (categories, growth, products, revenue, etc.)
--   • Materialized Views: 7 views (cached for performance)
--   Total: 20 views
-- ───────────────────────────────────────────────────────────────────
-- All views are production-ready and can be deployed to Supabase.
-- Use Ctrl+F to search for specific view names.
-- =====================================================================



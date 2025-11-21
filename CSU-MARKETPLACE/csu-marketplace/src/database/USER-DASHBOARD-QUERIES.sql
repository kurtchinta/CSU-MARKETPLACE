-- =====================================================================
-- USER DASHBOARD - COMPREHENSIVE ANALYTICS
-- All views, materialized views, and functions for user dashboard
-- Version: 2.0 Production
-- Date: November 19, 2025
-- =====================================================================

-- =====================================================================
-- SECTION 1: CORE USER DASHBOARD VIEWS
-- Purpose: Real-time user personal statistics and KPIs
-- =====================================================================

-- User View 1: Personal Dashboard Overview
-- Chart Type: KPI CARDS
-- Usage: Main dashboard statistics (top cards section)
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

COMMENT ON VIEW user_view_dashboard_overview IS 'KPI CARDS - User personal dashboard overview metrics';

-- =====================================================================
-- SECTION 2: USER DASHBOARD CHART VIEWS
-- Purpose: Data sources for all dashboard charts and visualizations
-- =====================================================================

-- User View 2: Monthly Revenue Trend (Last 6 Months)
-- For: Line/Area Chart showing revenue over time
CREATE OR REPLACE VIEW user_view_monthly_revenue AS
SELECT 
    t.seller_id as user_id,
    DATE_TRUNC('month', t.completed_at) as month,
    TO_CHAR(DATE_TRUNC('month', t.completed_at), 'Mon YYYY') as month_label,
    COUNT(*) as transaction_count,
    COALESCE(SUM(t.item_price * t.quantity), 0) as monthly_revenue,
    COALESCE(AVG(t.item_price * t.quantity), 0) as avg_transaction_value
FROM transactions t
WHERE t.transaction_status = 'COMPLETED'
AND t.completed_at >= NOW() - INTERVAL '6 months'
GROUP BY t.seller_id, DATE_TRUNC('month', t.completed_at)
ORDER BY month DESC;

COMMENT ON VIEW user_view_monthly_revenue IS 'LINE CHART - User monthly revenue trend for last 6 months';

-- User View 3: Category Performance (Income Breakdown)
-- For: Donut/Pie Chart showing revenue by category
CREATE OR REPLACE VIEW user_view_category_revenue AS
SELECT 
    p.user_id,
    c.category_name,
    COUNT(DISTINCT p.product_id) as product_count,
    COALESCE(SUM(t.item_price * t.quantity), 0) as category_revenue,
    COUNT(t.transaction_id) as sales_count
FROM products p
INNER JOIN categories c ON p.category_id = c.category_id
LEFT JOIN transactions t ON p.product_id = t.product_id AND t.transaction_status = 'COMPLETED'
WHERE p.status = 'APPROVED'
GROUP BY p.user_id, c.category_name
ORDER BY category_revenue DESC;

COMMENT ON VIEW user_view_category_revenue IS 'DONUT CHART - Revenue breakdown by category for user';

-- User View 4: Recent Activity Feed
-- For: Events/Activity Timeline
CREATE OR REPLACE VIEW user_view_recent_activity AS
SELECT 
    activity_id,
    user_id,
    activity_type,
    description,
    timestamp,
    related_id
FROM (
    -- Product listings created
    SELECT 
        product_id as activity_id,
        user_id,
        'listing_created' as activity_type,
        'Listed: ' || product_name as description,
        created_at as timestamp,
        product_id as related_id
    FROM products
    
    UNION ALL
    
    -- Orders received (as seller)
    SELECT 
        order_id as activity_id,
        seller_id as user_id,
        'order_received' as activity_type,
        'New order for: ' || product_name as description,
        created_at as timestamp,
        order_id as related_id
    FROM order_details
    
    UNION ALL
    
    -- Orders placed (as buyer)
    SELECT 
        order_id as activity_id,
        buyer_id as user_id,
        'order_placed' as activity_type,
        'Ordered: ' || product_name as description,
        created_at as timestamp,
        order_id as related_id
    FROM order_details
    
    UNION ALL
    
    -- Reviews received
    SELECT 
        r.review_id as activity_id,
        p.user_id,
        'review_received' as activity_type,
        'Review received: ' || r.rating || ' stars' as description,
        r.created_at as timestamp,
        r.review_id as related_id
    FROM reviews r
    INNER JOIN products p ON r.product_id = p.product_id
) activities
ORDER BY timestamp DESC
LIMIT 20;

COMMENT ON VIEW user_view_recent_activity IS 'ACTIVITY FEED - Recent user activities and events';

-- User View 5: Sales Performance (Daily/Weekly/Monthly)
-- For: Income Details Chart
CREATE OR REPLACE VIEW user_view_sales_performance AS
SELECT 
    t.seller_id as user_id,
    DATE(t.completed_at) as sale_date,
    DATE_TRUNC('week', t.completed_at) as week_start,
    DATE_TRUNC('month', t.completed_at) as month_start,
    COUNT(*) as daily_sales_count,
    COALESCE(SUM(t.item_price * t.quantity), 0) as daily_revenue,
    -- Weekly aggregations
    SUM(COUNT(*)) OVER (
        PARTITION BY t.seller_id, DATE_TRUNC('week', t.completed_at)
        ORDER BY DATE(t.completed_at)
    ) as weekly_sales_count,
    SUM(COALESCE(SUM(t.item_price * t.quantity), 0)) OVER (
        PARTITION BY t.seller_id, DATE_TRUNC('week', t.completed_at)
        ORDER BY DATE(t.completed_at)
    ) as weekly_revenue,
    -- Monthly aggregations
    SUM(COUNT(*)) OVER (
        PARTITION BY t.seller_id, DATE_TRUNC('month', t.completed_at)
        ORDER BY DATE(t.completed_at)
    ) as monthly_sales_count,
    SUM(COALESCE(SUM(t.item_price * t.quantity), 0)) OVER (
        PARTITION BY t.seller_id, DATE_TRUNC('month', t.completed_at)
        ORDER BY DATE(t.completed_at)
    ) as monthly_revenue
FROM transactions t
WHERE t.transaction_status = 'COMPLETED'
AND t.completed_at >= NOW() - INTERVAL '90 days'
GROUP BY t.seller_id, DATE(t.completed_at), DATE_TRUNC('week', t.completed_at), DATE_TRUNC('month', t.completed_at)
ORDER BY sale_date DESC;

COMMENT ON VIEW user_view_sales_performance IS 'METRICS CHART - Daily/Weekly/Monthly sales performance';

-- User View 6: Top Products by Revenue
-- For: Product Performance Cards
CREATE OR REPLACE VIEW user_view_top_products AS
SELECT 
    p.user_id,
    p.product_id,
    p.product_name,
    p.price,
    p.view_count,
    c.category_name,
    COUNT(DISTINCT t.transaction_id) as sales_count,
    COALESCE(SUM(t.item_price * t.quantity), 0) as total_revenue,
    (SELECT COUNT(*) FROM product_favorites WHERE product_id = p.product_id) as favorite_count,
    (SELECT COALESCE(AVG(rating), 0) FROM reviews WHERE product_id = p.product_id) as avg_rating,
    (SELECT COUNT(*) FROM reviews WHERE product_id = p.product_id) as review_count,
    (SELECT storage_path FROM product_images WHERE product_id = p.product_id ORDER BY image_order LIMIT 1) as image_url
FROM products p
INNER JOIN categories c ON p.category_id = c.category_id
LEFT JOIN transactions t ON p.product_id = t.product_id AND t.transaction_status = 'COMPLETED'
WHERE p.status = 'APPROVED'
GROUP BY p.user_id, p.product_id, p.product_name, p.price, p.view_count, c.category_name
ORDER BY total_revenue DESC;

COMMENT ON VIEW user_view_top_products IS 'TOP PERFORMERS - User top products by revenue';

-- User View 7: Income Summary (Total/Spendings/Income)
-- For: Income Details Summary Cards
CREATE OR REPLACE VIEW user_view_income_summary AS
SELECT 
    u.user_id,
    -- Sales as seller
    COALESCE(
        (SELECT SUM(t.item_price * t.quantity) 
         FROM transactions t 
         WHERE t.seller_id = u.user_id 
         AND t.transaction_status = 'COMPLETED'),
        0
    ) as total_sales,
    -- Spending as buyer
    COALESCE(
        (SELECT SUM(t.item_price * t.quantity) 
         FROM transactions t 
         WHERE t.buyer_id = u.user_id 
         AND t.transaction_status = 'COMPLETED'),
        0
    ) as total_spendings,
    -- Net income
    COALESCE(
        (SELECT SUM(t.item_price * t.quantity) 
         FROM transactions t 
         WHERE t.seller_id = u.user_id 
         AND t.transaction_status = 'COMPLETED'),
        0
    ) as total_income,
    -- Current month sales
    COALESCE(
        (SELECT SUM(t.item_price * t.quantity) 
         FROM transactions t 
         WHERE t.seller_id = u.user_id 
         AND t.transaction_status = 'COMPLETED'
         AND DATE_TRUNC('month', t.completed_at) = DATE_TRUNC('month', NOW())),
        0
    ) as current_month_sales,
    -- Current month spending
    COALESCE(
        (SELECT SUM(t.item_price * t.quantity) 
         FROM transactions t 
         WHERE t.buyer_id = u.user_id 
         AND t.transaction_status = 'COMPLETED'
         AND DATE_TRUNC('month', t.completed_at) = DATE_TRUNC('month', NOW())),
        0
    ) as current_month_spendings
FROM users u;

COMMENT ON VIEW user_view_income_summary IS 'SUMMARY METRICS - User total income, spending, and sales';

-- =====================================================================
-- SECTION 3: USER PRODUCT & ORDER MANAGEMENT VIEWS
-- Purpose: Detailed views for user's listings, orders, and sales
-- =====================================================================

-- User View 8: My Listings Performance
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
        WHEN p.status = 'APPROVED' AND p.is_available = FALSE THEN 'Inactive'
        WHEN p.status = 'PENDING' THEN 'Pending Approval'
        WHEN p.status = 'REJECTED' THEN 'Rejected'
        ELSE 'Unknown'
    END as display_status,
    p.user_id
FROM products p
INNER JOIN categories c ON p.category_id = c.category_id;

COMMENT ON VIEW user_view_my_listings IS 'DATA TABLE - User product listings with performance metrics';

-- User View 9: My Orders (as Buyer)
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

-- User View 10: My Sales (as Seller)
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
-- SECTION 4: USER-SPECIFIC MATERIALIZED VIEWS (Optional Performance Optimization)
-- Purpose: Pre-computed aggregations for frequently accessed user data
-- Refresh: Can be refreshed on-demand or scheduled
-- =====================================================================

-- Materialized View: User Performance Scorecard
-- Chart Type: SCORECARD / RADAR CHART
-- Usage: Comprehensive seller performance metrics per user
-- Refresh: Daily or on-demand
CREATE MATERIALIZED VIEW mv_user_performance_scorecard AS
SELECT 
    u.user_id,
    u.username,
    u.first_name || ' ' || u.last_name as full_name,
    u.total_products_posted,
    u.total_products_sold,
    u.total_revenue,
    u.average_seller_rating,
    u.total_reviews_received,
    
    -- Performance Percentiles
    PERCENT_RANK() OVER (ORDER BY u.total_revenue) as revenue_percentile,
    PERCENT_RANK() OVER (ORDER BY u.total_products_sold) as sales_percentile,
    PERCENT_RANK() OVER (ORDER BY u.average_seller_rating) as rating_percentile,
    
    -- Performance Tier
    CASE 
        WHEN u.total_revenue >= (SELECT PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY total_revenue) FROM users WHERE total_revenue > 0) THEN 'Elite'
        WHEN u.total_revenue >= (SELECT PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY total_revenue) FROM users WHERE total_revenue > 0) THEN 'Advanced'
        WHEN u.total_revenue >= (SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY total_revenue) FROM users WHERE total_revenue > 0) THEN 'Intermediate'
        WHEN u.total_revenue > 0 THEN 'Beginner'
        ELSE 'New Seller'
    END as seller_tier,
    
    -- Active Status
    (SELECT COUNT(*) FROM products WHERE user_id = u.user_id AND status = 'APPROVED' AND is_available = TRUE) as active_listings,
    (SELECT COUNT(*) FROM products WHERE user_id = u.user_id AND status = 'PENDING') as pending_listings,
    
    NOW() as last_updated
FROM users u
WHERE u.total_products_posted > 0;

CREATE UNIQUE INDEX ON mv_user_performance_scorecard (user_id);
CREATE INDEX ON mv_user_performance_scorecard (seller_tier);

COMMENT ON MATERIALIZED VIEW mv_user_performance_scorecard IS 'SCORECARD - User performance metrics and tier ranking (Refresh: Daily)';

-- =====================================================================
-- SECTION 5: HELPER FUNCTIONS
-- Purpose: Utility functions for user dashboard operations
-- =====================================================================

-- Function: Refresh user-specific materialized views
CREATE OR REPLACE FUNCTION refresh_user_dashboard_views()
RETURNS TEXT AS $$
BEGIN
    -- Refresh materialized views for user dashboard
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_user_performance_scorecard;
    
    RAISE NOTICE 'User dashboard materialized views refreshed successfully';
    RETURN 'User dashboard views refreshed at ' || NOW()::TEXT;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error refreshing user dashboard views: %', SQLERRM;
        RETURN 'Error: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION refresh_user_dashboard_views() IS 'Refresh all user dashboard materialized views';

-- Function: Get user performance summary (for quick API calls)
CREATE OR REPLACE FUNCTION get_user_performance_summary(p_user_id UUID)
RETURNS TABLE (
    total_revenue NUMERIC,
    total_sales INTEGER,
    avg_rating NUMERIC,
    active_listings INTEGER,
    pending_orders INTEGER,
    seller_tier TEXT,
    revenue_percentile NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(u.total_revenue, 0) as total_revenue,
        COALESCE(u.total_products_sold, 0) as total_sales,
        COALESCE(u.average_seller_rating, 0) as avg_rating,
        (SELECT COUNT(*)::INTEGER FROM products WHERE user_id = p_user_id AND status = 'APPROVED' AND is_available = TRUE) as active_listings,
        (SELECT COUNT(*)::INTEGER FROM order_details WHERE seller_id = p_user_id AND order_status = 'pending') as pending_orders,
        COALESCE(mv.seller_tier, 'New Seller') as seller_tier,
        COALESCE(mv.revenue_percentile, 0) as revenue_percentile
    FROM users u
    LEFT JOIN mv_user_performance_scorecard mv ON u.user_id = mv.user_id
    WHERE u.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_user_performance_summary(UUID) IS 'Get comprehensive performance summary for a specific user';

-- =====================================================================
-- SECTION 6: PERMISSIONS AND GRANTS
-- Purpose: Grant access to authenticated users
-- =====================================================================

-- Grant SELECT on all user dashboard views
-- Grant SELECT on all user dashboard views
GRANT SELECT ON user_view_dashboard_overview TO authenticated;
GRANT SELECT ON user_view_monthly_revenue TO authenticated;
GRANT SELECT ON user_view_category_revenue TO authenticated;
GRANT SELECT ON user_view_recent_activity TO authenticated;
GRANT SELECT ON user_view_sales_performance TO authenticated;
GRANT SELECT ON user_view_top_products TO authenticated;
GRANT SELECT ON user_view_income_summary TO authenticated;
GRANT SELECT ON user_view_my_listings TO authenticated;
GRANT SELECT ON user_view_my_orders_buyer TO authenticated;
GRANT SELECT ON user_view_my_sales_seller TO authenticated;

-- Grant SELECT on materialized views
GRANT SELECT ON mv_user_performance_scorecard TO authenticated;

-- Grant EXECUTE on helper functions
GRANT EXECUTE ON FUNCTION refresh_user_dashboard_views() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_performance_summary(UUID) TO authenticated;

-- =====================================================================
-- SECTION 7: INSTALLATION VERIFICATION
-- Purpose: Verify successful installation
-- =====================================================================

-- Completion message
DO $$
BEGIN
    RAISE NOTICE '========================================================';
    RAISE NOTICE 'USER DASHBOARD QUERIES - INSTALLATION COMPLETE';
    RAISE NOTICE 'Version: 2.0 Production';
    RAISE NOTICE '========================================================';
    RAISE NOTICE '';
    RAISE NOTICE 'SECTION 1: Core Dashboard Views';
    RAISE NOTICE '  ✓ user_view_dashboard_overview - Main KPI cards';
    RAISE NOTICE '';
    RAISE NOTICE 'SECTION 2: Chart Data Views';
    RAISE NOTICE '  ✓ user_view_monthly_revenue - Revenue trend chart';
    RAISE NOTICE '  ✓ user_view_category_revenue - Category breakdown';
    RAISE NOTICE '  ✓ user_view_recent_activity - Activity timeline';
    RAISE NOTICE '  ✓ user_view_sales_performance - Performance metrics';
    RAISE NOTICE '  ✓ user_view_top_products - Top performing products';
    RAISE NOTICE '  ✓ user_view_income_summary - Income/spending summary';
    RAISE NOTICE '';
    RAISE NOTICE 'SECTION 3: Product & Order Management Views';
    RAISE NOTICE '  ✓ user_view_my_listings - User product listings';
    RAISE NOTICE '  ✓ user_view_my_orders_buyer - Orders as buyer';
    RAISE NOTICE '  ✓ user_view_my_sales_seller - Sales as seller';
    RAISE NOTICE '';
    RAISE NOTICE 'SECTION 4: Materialized Views (Performance)';
    RAISE NOTICE '  ✓ mv_user_performance_scorecard - User tier ranking';
    RAISE NOTICE '';
    RAISE NOTICE 'SECTION 5: Helper Functions';
    RAISE NOTICE '  ✓ refresh_user_dashboard_views() - Refresh MVs';
    RAISE NOTICE '  ✓ get_user_performance_summary(UUID) - Quick stats';
    RAISE NOTICE '';
    RAISE NOTICE 'SECTION 6: Permissions';
    RAISE NOTICE '  ✓ All views granted to authenticated users';
    RAISE NOTICE '  ✓ All functions granted to authenticated users';
    RAISE NOTICE '';
    RAISE NOTICE '========================================================';
    RAISE NOTICE 'Total Views Created: 10';
    RAISE NOTICE 'Total Materialized Views: 1';
    RAISE NOTICE 'Total Functions: 2';
    RAISE NOTICE '========================================================';
    RAISE NOTICE '';
    RAISE NOTICE 'NEXT STEPS:';
    RAISE NOTICE '  1. Test views with: SELECT * FROM user_view_dashboard_overview WHERE user_id = ''your-user-id'';';
    RAISE NOTICE '  2. Refresh materialized views: SELECT refresh_user_dashboard_views();';
    RAISE NOTICE '  3. Check performance: SELECT * FROM mv_user_performance_scorecard LIMIT 10;';
    RAISE NOTICE '';
    RAISE NOTICE '========================================================';
END $$;

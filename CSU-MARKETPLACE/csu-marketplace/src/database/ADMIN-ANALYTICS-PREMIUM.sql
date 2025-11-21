-- =====================================================================
-- CSU MARKETPLACE - ADMIN & ANALYTICS DASHBOARD PREMIUM
-- Beautiful, Colorful, Production-Ready SQL Architecture
-- Version: 2.0 PREMIUM EDITION
-- Date: November 19, 2025
-- Priority: ADMIN & ANALYTICS DASHBOARDS
-- =====================================================================

-- =====================================================================
-- SECTION 1: ADMIN DASHBOARD - PLATFORM OVERVIEW
-- Purpose: Executive-level KPIs and platform health metrics
-- Color Palette: Royal Blue (#1E40AF), Success Green (#10B981), 
--                Warning Orange (#F59E0B), Danger Red (#EF4444)
-- =====================================================================

-- View 1: Admin Platform Overview (Top KPI Cards)
-- Chart Type: 6 EXECUTIVE KPI CARDS
-- Colors: Multi-color dashboard palette
-- Usage: Main admin dashboard hero section
CREATE OR REPLACE VIEW admin_view_platform_overview AS
SELECT 
    -- TOTAL USERS CARD (Royal Blue)
    (SELECT COUNT(*) FROM users WHERE is_admin = FALSE) as total_users,
    (SELECT COUNT(*) FROM users WHERE is_admin = FALSE AND is_active = TRUE) as active_users,
    (SELECT COUNT(*) FROM users WHERE is_admin = FALSE AND created_at >= NOW() - INTERVAL '30 days') as new_users_30d,
    (SELECT COUNT(*) FROM users WHERE is_admin = FALSE AND created_at >= NOW() - INTERVAL '7 days') as new_users_7d,
    '#1E40AF' as users_color,
    'USERS' as users_icon,
    
    -- TOTAL PRODUCTS CARD (Success Green)
    (SELECT COUNT(*) FROM products) as total_products,
    (SELECT COUNT(*) FROM products WHERE status = 'APPROVED' AND is_available = TRUE) as active_products,
    (SELECT COUNT(*) FROM products WHERE status = 'PENDING') as pending_products,
    (SELECT COUNT(*) FROM products WHERE created_at >= NOW() - INTERVAL '30 days') as new_products_30d,
    '#10B981' as products_color,
    'PRODUCTS' as products_icon,
    
    -- TOTAL TRANSACTIONS CARD (Gold)
    (SELECT COUNT(*) FROM transactions WHERE transaction_status = 'COMPLETED') as total_transactions,
    (SELECT COUNT(*) FROM transactions WHERE transaction_status = 'COMPLETED' 
     AND completed_at >= NOW() - INTERVAL '30 days') as transactions_30d,
    (SELECT COUNT(*) FROM transactions WHERE transaction_status = 'PENDING') as pending_transactions,
    '#FFCF50' as transactions_color,
    'TRANSACTIONS' as transactions_icon,
    
    -- TOTAL REVENUE CARD (CSU Green)
    (SELECT COALESCE(SUM(item_price * quantity), 0) FROM transactions 
     WHERE transaction_status = 'COMPLETED') as total_revenue,
    (SELECT COALESCE(SUM(item_price * quantity), 0) FROM transactions 
     WHERE transaction_status = 'COMPLETED' 
     AND completed_at >= NOW() - INTERVAL '30 days') as revenue_30d,
    (SELECT COALESCE(SUM(item_price * quantity), 0) FROM transactions 
     WHERE transaction_status = 'COMPLETED' 
     AND completed_at >= NOW() - INTERVAL '7 days') as revenue_7d,
    (SELECT COALESCE(AVG(item_price * quantity), 0) FROM transactions 
     WHERE transaction_status = 'COMPLETED') as avg_transaction_value,
    '#208756' as revenue_color,
    'REVENUE' as revenue_icon,
    
    -- AVERAGE RATING CARD (Purple)
    (SELECT COALESCE(AVG(rating), 0) FROM reviews) as platform_avg_rating,
    (SELECT COUNT(*) FROM reviews) as total_reviews,
    (SELECT COUNT(*) FROM reviews WHERE created_at >= NOW() - INTERVAL '30 days') as reviews_30d,
    '#9C27B0' as rating_color,
    'RATING' as rating_icon,
    
    -- PLATFORM ACTIVITY CARD (Orange)
    (SELECT COUNT(*) FROM products WHERE view_count > 0) as products_with_views,
    (SELECT COALESCE(SUM(view_count), 0) FROM products) as total_product_views,
    (SELECT COUNT(*) FROM product_favorites) as total_favorites,
    (SELECT COUNT(*) FROM cart) as total_cart_items,
    '#FF7F1C' as activity_color,
    'ACTIVITY' as activity_icon,
    
    -- Growth Rates
    ROUND(
        (SELECT COUNT(*)::DECIMAL FROM users WHERE created_at >= NOW() - INTERVAL '30 days') /
        NULLIF((SELECT COUNT(*)::DECIMAL FROM users WHERE created_at >= NOW() - INTERVAL '60 days' 
                AND created_at < NOW() - INTERVAL '30 days'), 0) * 100, 2
    ) as user_growth_rate,
    ROUND(
        (SELECT COALESCE(SUM(item_price * quantity), 0)::DECIMAL FROM transactions 
         WHERE transaction_status = 'COMPLETED' AND completed_at >= NOW() - INTERVAL '30 days') /
        NULLIF((SELECT COALESCE(SUM(item_price * quantity), 0)::DECIMAL FROM transactions 
                WHERE transaction_status = 'COMPLETED' 
                AND completed_at >= NOW() - INTERVAL '60 days' 
                AND completed_at < NOW() - INTERVAL '30 days'), 0) * 100, 2
    ) as revenue_growth_rate,
    
    NOW() as snapshot_time;

COMMENT ON VIEW admin_view_platform_overview IS 'EXECUTIVE KPI CARDS - Platform-wide overview metrics with growth indicators';

-- =====================================================================
-- SECTION 2: ADMIN DASHBOARD - REVENUE & FINANCIAL ANALYTICS
-- Purpose: Financial performance tracking and revenue analysis
-- =====================================================================

-- View 2: Platform Revenue Trend (Last 12 Months)
-- Chart Type: AREA CHART / LINE CHART with dual axis
-- Colors: Green gradient for revenue, Blue for transaction count
-- Usage: Main financial performance chart
CREATE OR REPLACE VIEW admin_view_revenue_trend AS
SELECT 
    DATE_TRUNC('month', completed_at) as month,
    TO_CHAR(DATE_TRUNC('month', completed_at), 'Mon YYYY') as month_label,
    TO_CHAR(DATE_TRUNC('month', completed_at), 'Mon') as month_short,
    COUNT(transaction_id) as transaction_count,
    COALESCE(SUM(item_price * quantity), 0) as monthly_revenue,
    COALESCE(AVG(item_price * quantity), 0) as avg_transaction_value,
    COUNT(DISTINCT seller_id) as active_sellers,
    COUNT(DISTINCT buyer_id) as active_buyers,
    COUNT(DISTINCT product_id) as unique_products_sold,
    '#208756' as revenue_color,
    '#4285F4' as transaction_color,
    CASE 
        WHEN EXTRACT(MONTH FROM completed_at) = EXTRACT(MONTH FROM NOW()) THEN TRUE
        ELSE FALSE
    END as is_current_month
FROM transactions
WHERE transaction_status = 'COMPLETED'
AND completed_at >= NOW() - INTERVAL '12 months'
GROUP BY DATE_TRUNC('month', completed_at)
ORDER BY month DESC;

COMMENT ON VIEW admin_view_revenue_trend IS 'AREA CHART - Platform revenue and transaction trend (12 months)';

-- View 3: Daily Revenue Performance (Last 90 Days)
-- Chart Type: COLUMN CHART with color-coded bars
-- Colors: Performance-based gradient
-- Usage: Detailed daily revenue tracking
CREATE OR REPLACE VIEW admin_view_daily_revenue AS
SELECT 
    DATE(completed_at) as sale_date,
    TO_CHAR(DATE(completed_at), 'Mon DD') as date_label,
    EXTRACT(DOW FROM completed_at) as day_of_week,
    TO_CHAR(DATE(completed_at), 'Day') as day_name,
    COUNT(transaction_id) as daily_transactions,
    COALESCE(SUM(item_price * quantity), 0) as daily_revenue,
    COALESCE(AVG(item_price * quantity), 0) as avg_transaction_value,
    COUNT(DISTINCT seller_id) as sellers_count,
    COUNT(DISTINCT buyer_id) as buyers_count,
    -- Performance-based coloring
    CASE 
        WHEN COALESCE(SUM(item_price * quantity), 0) >= 20000 THEN '#10B981' -- Excellent
        WHEN COALESCE(SUM(item_price * quantity), 0) >= 10000 THEN '#34A853' -- Good
        WHEN COALESCE(SUM(item_price * quantity), 0) >= 5000 THEN '#FFCF50'  -- Average
        WHEN COALESCE(SUM(item_price * quantity), 0) >= 1000 THEN '#FF7F1C'  -- Below
        ELSE '#EF4444' -- Low
    END as performance_color,
    -- Weekend indicator
    CASE WHEN EXTRACT(DOW FROM completed_at) IN (0, 6) THEN TRUE ELSE FALSE END as is_weekend
FROM transactions
WHERE transaction_status = 'COMPLETED'
AND completed_at >= NOW() - INTERVAL '90 days'
GROUP BY DATE(completed_at), EXTRACT(DOW FROM completed_at)
ORDER BY sale_date DESC;

COMMENT ON VIEW admin_view_daily_revenue IS 'COLUMN CHART - Daily revenue with performance color coding (90 days)';

-- =====================================================================
-- SECTION 3: ADMIN DASHBOARD - CATEGORY & PRODUCT ANALYTICS
-- Purpose: Category performance and product distribution analysis
-- =====================================================================

-- View 4: Category Revenue Distribution
-- Chart Type: DONUT CHART / TREEMAP
-- Colors: 8-color rainbow palette
-- Usage: Category performance breakdown
CREATE OR REPLACE VIEW admin_view_category_revenue AS
SELECT 
    c.category_id,
    c.category_name,
    c.total_products,
    c.total_views,
    (SELECT COUNT(*) FROM products WHERE category_id = c.category_id AND status = 'APPROVED') as approved_products,
    (SELECT COUNT(*) FROM products WHERE category_id = c.category_id AND status = 'PENDING') as pending_products,
    (SELECT COALESCE(SUM(item_price * quantity), 0) FROM transactions 
     WHERE category_id = c.category_id AND transaction_status = 'COMPLETED') as category_revenue,
    (SELECT COUNT(*) FROM transactions 
     WHERE category_id = c.category_id AND transaction_status = 'COMPLETED') as sales_count,
    ROUND(
        ((SELECT COALESCE(SUM(item_price * quantity), 0) FROM transactions 
          WHERE category_id = c.category_id AND transaction_status = 'COMPLETED')::DECIMAL / 
         NULLIF((SELECT SUM(item_price * quantity) FROM transactions 
                 WHERE transaction_status = 'COMPLETED'), 0) * 100), 2
    ) as revenue_percentage,
    -- Beautiful color palette
    CASE (ROW_NUMBER() OVER (ORDER BY 
        (SELECT COALESCE(SUM(item_price * quantity), 0) FROM transactions 
         WHERE category_id = c.category_id AND transaction_status = 'COMPLETED') DESC) - 1) % 8
        WHEN 0 THEN '#208756' -- CSU Green
        WHEN 1 THEN '#FFCF50' -- Gold
        WHEN 2 THEN '#4285F4' -- Blue
        WHEN 3 THEN '#FF7F1C' -- Orange
        WHEN 4 THEN '#34A853' -- Green
        WHEN 5 THEN '#EA4335' -- Red
        WHEN 6 THEN '#9C27B0' -- Purple
        WHEN 7 THEN '#00BCD4' -- Teal
    END as category_color
FROM categories c
WHERE c.total_products > 0
ORDER BY category_revenue DESC;

COMMENT ON VIEW admin_view_category_revenue IS 'DONUT CHART - Category revenue distribution with rainbow colors';

-- View 5: Top Performing Products (Platform-wide)
-- Chart Type: DATA TABLE with performance badges
-- Colors: Performance-based coloring
-- Usage: Admin product performance monitoring
CREATE OR REPLACE VIEW admin_view_top_products AS
SELECT 
    p.product_id,
    p.product_name,
    p.price,
    p.listing_type,
    p.status,
    p.is_available,
    p.view_count,
    c.category_name,
    u.username as seller_username,
    u.average_seller_rating,
    
    -- Sales Performance
    (SELECT COUNT(*) FROM transactions 
     WHERE product_id = p.product_id AND transaction_status = 'COMPLETED') as total_sales,
    (SELECT COALESCE(SUM(item_price * quantity), 0) FROM transactions 
     WHERE product_id = p.product_id AND transaction_status = 'COMPLETED') as total_revenue,
    
    -- Engagement
    (SELECT COUNT(*) FROM product_favorites WHERE product_id = p.product_id) as favorite_count,
    (SELECT COALESCE(AVG(rating), 0) FROM reviews WHERE product_id = p.product_id) as avg_rating,
    (SELECT COUNT(*) FROM reviews WHERE product_id = p.product_id) as review_count,
    
    -- Conversion Rate
    ROUND(
        ((SELECT COUNT(*) FROM transactions 
          WHERE product_id = p.product_id AND transaction_status = 'COMPLETED')::DECIMAL / 
         NULLIF(p.view_count, 0) * 100), 2
    ) as conversion_rate,
    
    -- Performance Badge
    CASE 
        WHEN (SELECT COALESCE(SUM(item_price * quantity), 0) FROM transactions 
              WHERE product_id = p.product_id AND transaction_status = 'COMPLETED') >= 50000 
        THEN '🏆 Platform Best Seller'
        WHEN (SELECT COALESCE(AVG(rating), 0) FROM reviews WHERE product_id = p.product_id) >= 4.9 
        THEN '⭐ Highest Rated'
        WHEN p.view_count >= 5000 
        THEN '🔥 Most Viewed'
        WHEN (SELECT COUNT(*) FROM product_favorites WHERE product_id = p.product_id) >= 200 
        THEN '💎 Most Loved'
        ELSE '📈 Top Product'
    END as performance_badge,
    
    (SELECT storage_path FROM product_images 
     WHERE product_id = p.product_id ORDER BY image_order LIMIT 1) as image_url,
    
    p.created_at
FROM products p
INNER JOIN categories c ON p.category_id = c.category_id
INNER JOIN users u ON p.user_id = u.user_id
WHERE p.status = 'APPROVED'
ORDER BY total_revenue DESC, view_count DESC
LIMIT 50;

COMMENT ON VIEW admin_view_top_products IS 'DATA TABLE - Platform top performing products with badges';

-- =====================================================================
-- SECTION 4: ADMIN DASHBOARD - USER ANALYTICS
-- Purpose: User behavior and engagement analysis
-- =====================================================================

-- View 6: Top Sellers Leaderboard
-- Chart Type: LEADERBOARD / BAR CHART
-- Colors: Tier-based coloring
-- Usage: Seller performance ranking
CREATE OR REPLACE VIEW admin_view_top_sellers AS
SELECT 
    u.user_id,
    u.username,
    u.profile_picture_url,
    u.department,
    u.total_products_posted,
    u.total_products_sold,
    u.total_revenue,
    u.average_seller_rating,
    u.total_reviews_received,
    
    -- Recent Activity (30 days)
    (SELECT COUNT(*) FROM transactions 
     WHERE seller_id = u.user_id 
     AND transaction_status = 'COMPLETED'
     AND completed_at >= NOW() - INTERVAL '30 days') as sales_30d,
    (SELECT COALESCE(SUM(item_price * quantity), 0) FROM transactions 
     WHERE seller_id = u.user_id 
     AND transaction_status = 'COMPLETED'
     AND completed_at >= NOW() - INTERVAL '30 days') as revenue_30d,
    
    -- Rankings
    RANK() OVER (ORDER BY u.total_revenue DESC) as revenue_rank,
    RANK() OVER (ORDER BY u.total_products_sold DESC) as sales_rank,
    RANK() OVER (ORDER BY u.average_seller_rating DESC) as rating_rank,
    
    -- Seller Tier
    CASE 
        WHEN u.total_revenue >= 100000 AND u.average_seller_rating >= 4.8 THEN 'Diamond'
        WHEN u.total_revenue >= 50000 AND u.average_seller_rating >= 4.5 THEN 'Platinum'
        WHEN u.total_revenue >= 20000 AND u.average_seller_rating >= 4.0 THEN 'Gold'
        WHEN u.total_revenue >= 5000 THEN 'Silver'
        ELSE 'Bronze'
    END as seller_tier,
    CASE 
        WHEN u.total_revenue >= 100000 AND u.average_seller_rating >= 4.8 THEN '#9C27B0' -- Purple
        WHEN u.total_revenue >= 50000 AND u.average_seller_rating >= 4.5 THEN '#FFCF50' -- Gold
        WHEN u.total_revenue >= 20000 AND u.average_seller_rating >= 4.0 THEN '#FF7F1C' -- Orange
        WHEN u.total_revenue >= 5000 THEN '#9E9E9E' -- Silver
        ELSE '#8D6E63' -- Bronze
    END as tier_color,
    
    u.created_at as joined_date,
    u.last_active_at
FROM users u
WHERE u.is_admin = FALSE
AND u.total_products_sold > 0
ORDER BY u.total_revenue DESC
LIMIT 100;

COMMENT ON VIEW admin_view_top_sellers IS 'LEADERBOARD - Top sellers with tier badges and rankings';

-- View 7: User Growth & Engagement Trend
-- Chart Type: LINE CHART with multiple series
-- Colors: Multi-line color coding
-- Usage: Track user acquisition and engagement over time
CREATE OR REPLACE VIEW admin_view_user_growth_trend AS
SELECT 
    DATE(created_at) as date,
    TO_CHAR(DATE(created_at), 'Mon DD') as date_label,
    COUNT(*) as new_users,
    SUM(COUNT(*)) OVER (ORDER BY DATE(created_at)) as cumulative_users,
    COUNT(*) FILTER (WHERE is_active = TRUE) as active_users,
    COUNT(*) FILTER (WHERE total_products_posted > 0) as users_with_listings,
    COUNT(*) FILTER (WHERE total_products_sold > 0) as users_with_sales,
    '#1E40AF' as new_users_color,
    '#10B981' as cumulative_color,
    '#FFCF50' as active_color
FROM users
WHERE is_admin = FALSE
AND created_at >= NOW() - INTERVAL '90 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

COMMENT ON VIEW admin_view_user_growth_trend IS 'LINE CHART - User acquisition and engagement trend (90 days)';

-- =====================================================================
-- SECTION 5: ADMIN DASHBOARD - ACTIVITY MONITORING
-- Purpose: Real-time activity tracking and alerts
-- =====================================================================

-- View 8: Recent Platform Activity
-- Chart Type: ACTIVITY FEED / TIMELINE
-- Colors: Activity-type color coding
-- Usage: Real-time platform activity monitoring
CREATE OR REPLACE VIEW admin_view_recent_activity AS
SELECT 
    activity_id,
    activity_type,
    description,
    user_info,
    timestamp,
    related_id,
    CASE activity_type
        WHEN 'new_user' THEN '#1E40AF'      -- Blue
        WHEN 'product_listed' THEN '#10B981' -- Green
        WHEN 'product_sold' THEN '#208756'   -- CSU Green
        WHEN 'transaction_completed' THEN '#34A853' -- Success Green
        WHEN 'review_posted' THEN '#9C27B0'  -- Purple
        WHEN 'product_pending' THEN '#F59E0B' -- Warning Orange
        WHEN 'high_value_sale' THEN '#FFCF50' -- Gold
        ELSE '#6B7280' -- Gray
    END as activity_color,
    CASE activity_type
        WHEN 'new_user' THEN '👤'
        WHEN 'product_listed' THEN '📦'
        WHEN 'product_sold' THEN '💰'
        WHEN 'transaction_completed' THEN '✅'
        WHEN 'review_posted' THEN '⭐'
        WHEN 'product_pending' THEN '⏳'
        WHEN 'high_value_sale' THEN '🏆'
        ELSE '📌'
    END as activity_icon,
    CASE 
        WHEN timestamp >= NOW() - INTERVAL '1 hour' THEN 'Just now'
        WHEN timestamp >= NOW() - INTERVAL '24 hours' THEN 
            CONCAT(EXTRACT(HOUR FROM NOW() - timestamp)::INTEGER, 'h ago')
        WHEN timestamp >= NOW() - INTERVAL '7 days' THEN 
            CONCAT(EXTRACT(DAY FROM NOW() - timestamp)::INTEGER, 'd ago')
        ELSE TO_CHAR(timestamp, 'Mon DD')
    END as time_ago,
    CASE 
        WHEN activity_type IN ('high_value_sale', 'product_pending') THEN TRUE
        ELSE FALSE
    END as requires_attention
FROM (
    -- New users
    SELECT 
        user_id::TEXT as activity_id,
        'new_user' as activity_type,
        CONCAT('New user registered: ', username) as description,
        username as user_info,
        created_at as timestamp,
        0 as related_id
    FROM users
    WHERE is_admin = FALSE
    AND created_at >= NOW() - INTERVAL '30 days'
    
    UNION ALL
    
    -- Product listings
    SELECT 
        product_id::TEXT as activity_id,
        CASE 
            WHEN status = 'PENDING' THEN 'product_pending'
            ELSE 'product_listed'
        END as activity_type,
        CONCAT(u.username, ' listed: ', p.product_name) as description,
        u.username as user_info,
        p.created_at as timestamp,
        p.product_id as related_id
    FROM products p
    INNER JOIN users u ON p.user_id = u.user_id
    WHERE p.created_at >= NOW() - INTERVAL '30 days'
    
    UNION ALL
    
    -- Transactions
    SELECT 
        transaction_id::TEXT as activity_id,
        CASE 
            WHEN item_price * quantity >= 5000 THEN 'high_value_sale'
            WHEN transaction_status = 'COMPLETED' THEN 'transaction_completed'
            ELSE 'product_sold'
        END as activity_type,
        CONCAT(us.username, ' sold ', item_name, ' for ₱', 
               TO_CHAR(item_price * quantity, 'FM999,999.00')) as description,
        us.username as user_info,
        COALESCE(completed_at, created_at) as timestamp,
        product_id as related_id
    FROM transactions t
    INNER JOIN users us ON t.seller_id = us.user_id
    WHERE t.created_at >= NOW() - INTERVAL '30 days'
    
    UNION ALL
    
    -- Reviews
    SELECT 
        review_id::TEXT as activity_id,
        'review_posted' as activity_type,
        CONCAT(u.username, ' rated ', rating, '⭐') as description,
        u.username as user_info,
        r.created_at as timestamp,
        COALESCE(r.product_id, 0) as related_id
    FROM reviews r
    INNER JOIN users u ON r.reviewer_id = u.user_id
    WHERE r.created_at >= NOW() - INTERVAL '30 days'
) activities
ORDER BY timestamp DESC
LIMIT 100;

COMMENT ON VIEW admin_view_recent_activity IS 'ACTIVITY FEED - Real-time platform activity with alerts';

-- =====================================================================
-- SECTION 6: ADMIN DASHBOARD - PERFORMANCE METRICS
-- Purpose: Platform health and performance indicators
-- =====================================================================

-- View 9: Transaction Status Distribution
-- Chart Type: DONUT CHART
-- Colors: Status-based coloring
-- Usage: Transaction pipeline visualization
CREATE OR REPLACE VIEW admin_view_transaction_status AS
SELECT 
    transaction_status,
    COUNT(*) as count,
    ROUND((COUNT(*)::DECIMAL / (SELECT COUNT(*) FROM transactions) * 100), 2) as percentage,
    COALESCE(SUM(item_price * quantity), 0) as total_value,
    CASE transaction_status
        WHEN 'COMPLETED' THEN '#10B981'  -- Success Green
        WHEN 'PENDING' THEN '#F59E0B'    -- Warning Orange
        WHEN 'FAILED' THEN '#EF4444'     -- Danger Red
        WHEN 'CANCELLED' THEN '#6B7280'  -- Gray
        ELSE '#9E9E9E' -- Default Gray
    END as status_color,
    CASE transaction_status
        WHEN 'COMPLETED' THEN 'DONE'
        WHEN 'PENDING' THEN 'WAIT'
        WHEN 'FAILED' THEN 'FAIL'
        WHEN 'CANCELLED' THEN 'CANCEL'
        ELSE 'INFO'
    END as status_icon
FROM transactions
GROUP BY transaction_status
ORDER BY count DESC;

COMMENT ON VIEW admin_view_transaction_status IS 'DONUT CHART - Transaction status distribution';

-- View 10: Listing Type Distribution
-- Chart Type: PIE CHART / BAR CHART
-- Colors: Type-based coloring
-- Usage: Product type breakdown
CREATE OR REPLACE VIEW admin_view_listing_type_distribution AS
SELECT 
    listing_type,
    COUNT(*) as product_count,
    ROUND((COUNT(*)::DECIMAL / (SELECT COUNT(*) FROM products WHERE status = 'APPROVED') * 100), 2) as percentage,
    (SELECT COALESCE(SUM(item_price * quantity), 0) FROM transactions 
     WHERE transactions.listing_type = products.listing_type 
     AND transaction_status = 'COMPLETED') as total_revenue,
    (SELECT COUNT(*) FROM transactions 
     WHERE transactions.listing_type = products.listing_type 
     AND transaction_status = 'COMPLETED') as sales_count,
    CASE listing_type
        WHEN 'FOR_SALE' THEN '#208756'  -- CSU Green
        WHEN 'FOR_RENT' THEN '#4285F4'  -- Blue
        WHEN 'SERVICE' THEN '#9C27B0'   -- Purple
        ELSE '#9E9E9E'
    END as type_color,
    CASE listing_type
        WHEN 'FOR_SALE' THEN '🛍️'
        WHEN 'FOR_RENT' THEN '🔄'
        WHEN 'SERVICE' THEN '🛠️'
        ELSE '❓'
    END as type_icon
FROM products
WHERE status = 'APPROVED'
GROUP BY listing_type
ORDER BY product_count DESC;

COMMENT ON VIEW admin_view_listing_type_distribution IS 'PIE CHART - Product listing type breakdown';

-- =====================================================================
-- SECTION 7: MATERIALIZED VIEWS FOR ADMIN DASHBOARD
-- Purpose: Pre-computed admin analytics for fast loading
-- Refresh Strategy: Every 6 hours or on-demand
-- =====================================================================

-- Materialized View 1: Daily Platform Metrics Snapshot
-- Chart Type: KPI DASHBOARD
-- Refresh: Every 6 hours
-- Colors: Metric-based coloring
CREATE MATERIALIZED VIEW mv_admin_daily_platform_metrics AS
SELECT 
    CURRENT_DATE as metric_date,
    
    -- 📊 Daily Metrics
    (SELECT COUNT(*) FROM users WHERE created_at >= CURRENT_DATE) as new_users_today,
    (SELECT COUNT(*) FROM products WHERE created_at >= CURRENT_DATE) as new_products_today,
    (SELECT COUNT(*) FROM transactions WHERE transaction_status = 'COMPLETED' 
     AND completed_at >= CURRENT_DATE) as transactions_today,
    (SELECT COALESCE(SUM(item_price * quantity), 0) FROM transactions 
     WHERE transaction_status = 'COMPLETED' AND completed_at >= CURRENT_DATE) as revenue_today,
    
    -- 📈 7-Day Metrics
    (SELECT COUNT(*) FROM users 
     WHERE created_at >= NOW() - INTERVAL '7 days') as new_users_7d,
    (SELECT COUNT(*) FROM transactions WHERE transaction_status = 'COMPLETED' 
     AND completed_at >= NOW() - INTERVAL '7 days') as transactions_7d,
    (SELECT COALESCE(SUM(item_price * quantity), 0) FROM transactions 
     WHERE transaction_status = 'COMPLETED' 
     AND completed_at >= NOW() - INTERVAL '7 days') as revenue_7d,
    
    -- 📊 30-Day Metrics
    (SELECT COUNT(*) FROM users 
     WHERE created_at >= NOW() - INTERVAL '30 days') as new_users_30d,
    (SELECT COUNT(*) FROM transactions WHERE transaction_status = 'COMPLETED' 
     AND completed_at >= NOW() - INTERVAL '30 days') as transactions_30d,
    (SELECT COALESCE(SUM(item_price * quantity), 0) FROM transactions 
     WHERE transaction_status = 'COMPLETED' 
     AND completed_at >= NOW() - INTERVAL '30 days') as revenue_30d,
    
    -- 🎯 Platform Totals
    (SELECT COUNT(*) FROM users WHERE is_admin = FALSE) as total_users,
    (SELECT COUNT(*) FROM products WHERE status = 'APPROVED') as total_products,
    (SELECT COUNT(*) FROM transactions WHERE transaction_status = 'COMPLETED') as total_transactions,
    (SELECT COALESCE(SUM(item_price * quantity), 0) FROM transactions 
     WHERE transaction_status = 'COMPLETED') as total_revenue,
    
    -- 📉 Pending Items
    (SELECT COUNT(*) FROM products WHERE status = 'PENDING') as pending_products,
    (SELECT COUNT(*) FROM transactions WHERE transaction_status = 'PENDING') as pending_transactions,
    
    NOW() as last_refreshed;

CREATE UNIQUE INDEX ON mv_admin_daily_platform_metrics (metric_date);

COMMENT ON MATERIALIZED VIEW mv_admin_daily_platform_metrics IS 'KPI DASHBOARD - Daily platform metrics snapshot (Refresh: Every 6 hours)';

-- Materialized View 2: Weekly Category Performance
-- Chart Type: COLUMN CHART / BAR CHART
-- Refresh: Daily
-- Colors: Category-based rainbow palette
CREATE MATERIALIZED VIEW mv_admin_weekly_category_performance AS
SELECT 
    c.category_id,
    c.category_name,
    DATE_TRUNC('week', t.completed_at) as week_start,
    TO_CHAR(DATE_TRUNC('week', t.completed_at), 'Mon DD') as week_label,
    COUNT(t.transaction_id) as weekly_sales,
    COALESCE(SUM(t.item_price * t.quantity), 0) as weekly_revenue,
    COALESCE(AVG(t.item_price * t.quantity), 0) as avg_transaction_value,
    COUNT(DISTINCT t.seller_id) as active_sellers,
    CASE (ROW_NUMBER() OVER (PARTITION BY DATE_TRUNC('week', t.completed_at) 
                             ORDER BY COALESCE(SUM(t.item_price * t.quantity), 0) DESC) - 1) % 8
        WHEN 0 THEN '#208756'
        WHEN 1 THEN '#FFCF50'
        WHEN 2 THEN '#4285F4'
        WHEN 3 THEN '#FF7F1C'
        WHEN 4 THEN '#34A853'
        WHEN 5 THEN '#EA4335'
        WHEN 6 THEN '#9C27B0'
        WHEN 7 THEN '#00BCD4'
    END as category_color,
    NOW() as last_refreshed
FROM transactions t
INNER JOIN categories c ON t.category_id = c.category_id
WHERE t.transaction_status = 'COMPLETED'
AND t.completed_at >= NOW() - INTERVAL '12 weeks'
GROUP BY c.category_id, c.category_name, DATE_TRUNC('week', t.completed_at)
ORDER BY week_start DESC, weekly_revenue DESC;

CREATE INDEX ON mv_admin_weekly_category_performance (week_start, category_id);
CREATE INDEX ON mv_admin_weekly_category_performance (weekly_revenue DESC);

COMMENT ON MATERIALIZED VIEW mv_admin_weekly_category_performance IS 'COLUMN CHART - Weekly category performance with rainbow colors (Refresh: Daily)';

-- =====================================================================
-- SECTION 8: ADMIN HELPER FUNCTIONS
-- Purpose: Reusable admin metric calculations
-- =====================================================================

-- Function 1: Calculate Platform Health Score (0-100)
CREATE OR REPLACE FUNCTION fn_platform_health_score()
RETURNS DECIMAL(5, 2) AS $$
DECLARE
    v_score DECIMAL(5, 2) := 0;
    v_user_growth DECIMAL;
    v_revenue_growth DECIMAL;
    v_transaction_success_rate DECIMAL;
    v_avg_rating DECIMAL;
BEGIN
    -- User growth (25 points) - positive growth only
    SELECT GREATEST(0, 
        (COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::DECIMAL - 
         COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '14 days' 
                          AND created_at < NOW() - INTERVAL '7 days')::DECIMAL) /
        NULLIF(COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '14 days' 
                                AND created_at < NOW() - INTERVAL '7 days')::DECIMAL, 0) * 100
    ) INTO v_user_growth
    FROM users WHERE is_admin = FALSE;
    v_score := v_score + LEAST(25, v_user_growth / 4);
    
    -- Revenue growth (25 points)
    SELECT GREATEST(0,
        ((SELECT COALESCE(SUM(item_price * quantity), 0) FROM transactions 
          WHERE transaction_status = 'COMPLETED' 
          AND completed_at >= NOW() - INTERVAL '7 days')::DECIMAL -
         (SELECT COALESCE(SUM(item_price * quantity), 0) FROM transactions 
          WHERE transaction_status = 'COMPLETED' 
          AND completed_at >= NOW() - INTERVAL '14 days' 
          AND completed_at < NOW() - INTERVAL '7 days')::DECIMAL) /
        NULLIF((SELECT COALESCE(SUM(item_price * quantity), 1) FROM transactions 
                WHERE transaction_status = 'COMPLETED' 
                AND completed_at >= NOW() - INTERVAL '14 days' 
                AND completed_at < NOW() - INTERVAL '7 days')::DECIMAL, 0) * 100
    ) INTO v_revenue_growth;
    v_score := v_score + LEAST(25, v_revenue_growth / 4);
    
    -- Transaction success rate (30 points)
    SELECT 
        (COUNT(*) FILTER (WHERE transaction_status = 'COMPLETED')::DECIMAL / 
         NULLIF(COUNT(*), 0) * 100)
    INTO v_transaction_success_rate
    FROM transactions
    WHERE created_at >= NOW() - INTERVAL '30 days';
    v_score := v_score + (v_transaction_success_rate * 0.3);
    
    -- Average rating (20 points)
    SELECT COALESCE(AVG(rating), 0) INTO v_avg_rating FROM reviews;
    v_score := v_score + (v_avg_rating * 4);
    
    RETURN LEAST(v_score, 100);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION fn_platform_health_score IS 'Calculate overall platform health score (0-100)';

-- Function 2: Get Revenue Forecast (Next 30 Days)
CREATE OR REPLACE FUNCTION fn_revenue_forecast(p_days_ahead INTEGER DEFAULT 30)
RETURNS DECIMAL(12, 2) AS $$
DECLARE
    v_avg_daily_revenue DECIMAL(12, 2);
    v_growth_rate DECIMAL(5, 4);
BEGIN
    -- Calculate average daily revenue over last 30 days
    SELECT COALESCE(AVG(daily_rev), 0)
    INTO v_avg_daily_revenue
    FROM (
        SELECT DATE(completed_at), SUM(item_price * quantity) as daily_rev
        FROM transactions
        WHERE transaction_status = 'COMPLETED'
        AND completed_at >= NOW() - INTERVAL '30 days'
        GROUP BY DATE(completed_at)
    ) daily_revenues;
    
    -- Calculate growth rate (last 7 days vs previous 7 days)
    SELECT 
        COALESCE(
            ((SELECT SUM(item_price * quantity) FROM transactions 
              WHERE transaction_status = 'COMPLETED' 
              AND completed_at >= NOW() - INTERVAL '7 days')::DECIMAL -
             (SELECT SUM(item_price * quantity) FROM transactions 
              WHERE transaction_status = 'COMPLETED' 
              AND completed_at >= NOW() - INTERVAL '14 days' 
              AND completed_at < NOW() - INTERVAL '7 days')::DECIMAL) /
            NULLIF((SELECT SUM(item_price * quantity) FROM transactions 
                    WHERE transaction_status = 'COMPLETED' 
                    AND completed_at >= NOW() - INTERVAL '14 days' 
                    AND completed_at < NOW() - INTERVAL '7 days')::DECIMAL, 0), 0
        )
    INTO v_growth_rate;
    
    -- Return forecast with growth rate applied
    RETURN v_avg_daily_revenue * p_days_ahead * (1 + v_growth_rate);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION fn_revenue_forecast IS 'Forecast platform revenue for next N days';

-- =====================================================================
-- SECTION 9: REFRESH FUNCTIONS
-- Purpose: Manage admin materialized view refreshes
-- =====================================================================

-- Function: Refresh All Admin Dashboard Views
CREATE OR REPLACE FUNCTION refresh_admin_dashboard_views()
RETURNS TEXT AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_admin_daily_platform_metrics;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_admin_weekly_category_performance;
    
    RETURN 'Admin dashboard views refreshed at ' || NOW()::TEXT;
EXCEPTION
    WHEN OTHERS THEN
        RETURN 'Error refreshing views: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION refresh_admin_dashboard_views IS 'Refresh all admin dashboard materialized views';

-- =====================================================================
-- ✅ INSTALLATION COMPLETE
-- =====================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================================';
    RAISE NOTICE '👑 CSU MARKETPLACE - ADMIN & ANALYTICS PREMIUM';
    RAISE NOTICE '========================================================';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Installation Complete!';
    RAISE NOTICE '';
    RAISE NOTICE '📊 ADMIN VIEWS CREATED:';
    RAISE NOTICE '  1. admin_view_platform_overview (Executive KPI Cards)';
    RAISE NOTICE '  2. admin_view_revenue_trend (Area Chart)';
    RAISE NOTICE '  3. admin_view_daily_revenue (Column Chart)';
    RAISE NOTICE '  4. admin_view_category_revenue (Donut Chart)';
    RAISE NOTICE '  5. admin_view_top_products (Data Table)';
    RAISE NOTICE '  6. admin_view_top_sellers (Leaderboard)';
    RAISE NOTICE '  7. admin_view_user_growth_trend (Line Chart)';
    RAISE NOTICE '  8. admin_view_recent_activity (Activity Feed)';
    RAISE NOTICE '  9. admin_view_transaction_status (Donut Chart)';
    RAISE NOTICE '  10. admin_view_listing_type_distribution (Pie Chart)';
    RAISE NOTICE '';
    RAISE NOTICE '💎 ADMIN MATERIALIZED VIEWS CREATED:';
    RAISE NOTICE '  1. mv_admin_daily_platform_metrics (KPI Dashboard)';
    RAISE NOTICE '  2. mv_admin_weekly_category_performance (Column Chart)';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 ADMIN FUNCTIONS CREATED:';
    RAISE NOTICE '  1. fn_platform_health_score()';
    RAISE NOTICE '  2. fn_revenue_forecast(days_ahead)';
    RAISE NOTICE '  3. refresh_admin_dashboard_views()';
    RAISE NOTICE '';
    RAISE NOTICE '🎨 COLOR PALETTE:';
    RAISE NOTICE '  Royal Blue: #1E40AF | Success Green: #10B981';
    RAISE NOTICE '  Warning Orange: #F59E0B | Danger Red: #EF4444';
    RAISE NOTICE '  CSU Green: #208756 | Gold: #FFCF50';
    RAISE NOTICE '';
    RAISE NOTICE '========================================================';
END $$;

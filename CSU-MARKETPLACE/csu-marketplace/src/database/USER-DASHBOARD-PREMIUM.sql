-- =====================================================================
-- CSU MARKETPLACE - PREMIUM USER DASHBOARD ANALYTICS
-- Beautiful, Colorful, Production-Ready SQL Architecture
-- Version: 2.0 PREMIUM EDITION
-- Date: November 19, 2025
-- Priority: USER DASHBOARD FIRST
-- =====================================================================

-- =====================================================================
-- SECTION 1: USER DASHBOARD - CORE KPI VIEWS
-- Purpose: Real-time user personal statistics and beautiful KPI cards
-- Color Palette: CSU Green (#208756), Gold (#FFCF50), Blue (#4285F4), 
--                Orange (#FF7F1C), Red (#EA4335), Purple (#9C27B0), 
--                Teal (#00BCD4), Pink (#E91E63)
-- =====================================================================

-- View 1: User Dashboard Hero Stats (Top KPI Cards)
-- Chart Type: 4 KPI CARDS - Revenue, Products Sold, Active Listings, Buyer Orders
-- Colors: Green (Revenue), Gold (Products), Blue (Listings), Orange (Orders)
-- Usage: Main dashboard header cards with gradient backgrounds
CREATE OR REPLACE VIEW user_view_dashboard_hero_stats AS
SELECT 
    u.user_id,
    u.username,
    u.profile_picture_url,
    
    -- REVENUE CARD (CSU Green Gradient)
    u.total_revenue as lifetime_revenue,
    (SELECT COALESCE(SUM(item_price * quantity), 0) 
     FROM transactions 
     WHERE seller_id = u.user_id 
     AND transaction_status = 'COMPLETED'
     AND completed_at >= DATE_TRUNC('month', NOW())) as monthly_revenue,
    CASE 
        WHEN u.total_revenue >= 100000 THEN 'Elite'
        WHEN u.total_revenue >= 50000 THEN 'Diamond'
        WHEN u.total_revenue >= 10000 THEN 'Star'
        ELSE 'Growing'
    END as revenue_badge,
    '#208756' as revenue_color,
    
    -- PRODUCTS SOLD CARD (Gold Gradient)
    u.total_products_sold as products_sold_lifetime,
    (SELECT COUNT(*) 
     FROM transactions 
     WHERE seller_id = u.user_id 
     AND transaction_status = 'COMPLETED'
     AND completed_at >= DATE_TRUNC('month', NOW())) as products_sold_monthly,
    ROUND((u.total_products_sold::DECIMAL / NULLIF(u.total_products_posted, 0) * 100), 2) as sell_through_rate,
    '#FFCF50' as products_color,
    
    -- ACTIVE LISTINGS CARD (Blue Gradient)
    (SELECT COUNT(*) 
     FROM products 
     WHERE user_id = u.user_id 
     AND status = 'APPROVED' 
     AND is_available = TRUE) as active_listings,
    (SELECT COUNT(*) 
     FROM products 
     WHERE user_id = u.user_id 
     AND status = 'PENDING') as pending_listings,
    u.total_products_posted as total_listings_posted,
    '#4285F4' as listings_color,
    
    -- BUYER ORDERS CARD (Orange Gradient)
    u.total_orders_as_buyer as orders_lifetime,
    (SELECT COUNT(*) 
     FROM order_details 
     WHERE buyer_id = u.user_id 
     AND order_status = 'pending') as pending_buyer_orders,
    (SELECT COALESCE(SUM(total_price), 0) 
     FROM order_details 
     WHERE buyer_id = u.user_id 
     AND order_status = 'completed') as total_spent,
    '#FF7F1C' as orders_color,
    
    -- SELLER RATING CARD (Purple Gradient)
    u.average_seller_rating as seller_rating,
    u.total_reviews_received as total_reviews,
    CASE 
        WHEN u.average_seller_rating >= 4.8 THEN 'Elite Seller'
        WHEN u.average_seller_rating >= 4.5 THEN 'Top Rated'
        WHEN u.average_seller_rating >= 4.0 THEN 'Trusted'
        ELSE 'Growing'
    END as seller_tier,
    '#9C27B0' as rating_color,
    
    -- ENGAGEMENT METRICS (Teal)
    (SELECT COUNT(*) FROM product_favorites pf 
     INNER JOIN products p ON pf.product_id = p.product_id 
     WHERE p.user_id = u.user_id) as products_favorited,
    (SELECT COUNT(DISTINCT product_id) FROM cart WHERE user_id = u.user_id) as items_in_cart,
    '#00BCD4' as engagement_color,
    
    -- GROWTH INDICATORS
    (SELECT COUNT(*) FROM transactions 
     WHERE seller_id = u.user_id 
     AND transaction_status = 'COMPLETED'
     AND completed_at >= NOW() - INTERVAL '30 days') as sales_30d,
    (SELECT COALESCE(SUM(item_price * quantity), 0) FROM transactions 
     WHERE seller_id = u.user_id 
     AND transaction_status = 'COMPLETED'
     AND completed_at >= NOW() - INTERVAL '30 days') as revenue_30d,
    (SELECT COUNT(*) FROM transactions 
     WHERE seller_id = u.user_id 
     AND transaction_status = 'COMPLETED'
     AND completed_at >= NOW() - INTERVAL '7 days') as sales_7d,
    
    NOW() as snapshot_time
FROM users u
WHERE u.is_admin = FALSE;

COMMENT ON VIEW user_view_dashboard_hero_stats IS 'KPI CARDS - Beautiful hero stats with color-coded gradients for user dashboard';

-- =====================================================================
-- SECTION 2: USER DASHBOARD - REVENUE & INCOME CHARTS
-- Purpose: Beautiful revenue visualizations and trend analysis
-- =====================================================================

-- View 2: Monthly Revenue Trend (Last 12 Months)
-- Chart Type: AREA CHART / LINE CHART with gradient fill
-- Colors: Green gradient (#208756 to #34A853)
-- Usage: Main revenue trend chart with beautiful area fill
CREATE OR REPLACE VIEW user_view_monthly_revenue_trend AS
SELECT 
    t.seller_id as user_id,
    DATE_TRUNC('month', t.completed_at) as month,
    TO_CHAR(DATE_TRUNC('month', t.completed_at), 'Mon YYYY') as month_label,
    TO_CHAR(DATE_TRUNC('month', t.completed_at), 'Mon') as month_short,
    EXTRACT(MONTH FROM t.completed_at) as month_number,
    COUNT(t.transaction_id) as transaction_count,
    COALESCE(SUM(t.item_price * t.quantity), 0) as monthly_revenue,
    COALESCE(AVG(t.item_price * t.quantity), 0) as avg_transaction_value,
    COUNT(DISTINCT t.product_id) as unique_products_sold,
    '#208756' as primary_color,
    '#34A853' as gradient_color,
    CASE 
        WHEN EXTRACT(MONTH FROM t.completed_at) = EXTRACT(MONTH FROM NOW()) THEN TRUE
        ELSE FALSE
    END as is_current_month
FROM transactions t
WHERE t.transaction_status = 'COMPLETED'
AND t.completed_at >= NOW() - INTERVAL '12 months'
GROUP BY t.seller_id, DATE_TRUNC('month', t.completed_at)
ORDER BY month DESC;

COMMENT ON VIEW user_view_monthly_revenue_trend IS 'AREA CHART - Monthly revenue trend with beautiful green gradient (12 months)';

-- View 3: Weekly Revenue Performance
-- Chart Type: BAR CHART with gradient bars
-- Colors: Multi-color gradient based on performance
-- Usage: Weekly sales performance with color-coded bars
CREATE OR REPLACE VIEW user_view_weekly_revenue_performance AS
SELECT 
    t.seller_id as user_id,
    DATE_TRUNC('week', t.completed_at) as week_start,
    TO_CHAR(DATE_TRUNC('week', t.completed_at), 'Mon DD') as week_label,
    COUNT(t.transaction_id) as weekly_sales,
    COALESCE(SUM(t.item_price * t.quantity), 0) as weekly_revenue,
    COALESCE(AVG(t.item_price * t.quantity), 0) as avg_sale_value,
    CASE 
        WHEN COALESCE(SUM(t.item_price * t.quantity), 0) >= 10000 THEN '#208756' -- Green (Excellent)
        WHEN COALESCE(SUM(t.item_price * t.quantity), 0) >= 5000 THEN '#34A853'  -- Light Green (Good)
        WHEN COALESCE(SUM(t.item_price * t.quantity), 0) >= 2000 THEN '#FFCF50'  -- Gold (Average)
        WHEN COALESCE(SUM(t.item_price * t.quantity), 0) >= 500 THEN '#FF7F1C'   -- Orange (Below)
        ELSE '#EA4335' -- Red (Low)
    END as performance_color,
    CASE 
        WHEN COALESCE(SUM(t.item_price * t.quantity), 0) >= 10000 THEN 'Excellent'
        WHEN COALESCE(SUM(t.item_price * t.quantity), 0) >= 5000 THEN 'Good'
        WHEN COALESCE(SUM(t.item_price * t.quantity), 0) >= 2000 THEN 'Average'
        WHEN COALESCE(SUM(t.item_price * t.quantity), 0) >= 500 THEN 'Below Target'
        ELSE 'Low'
    END as performance_label
FROM transactions t
WHERE t.transaction_status = 'COMPLETED'
AND t.completed_at >= NOW() - INTERVAL '12 weeks'
GROUP BY t.seller_id, DATE_TRUNC('week', t.completed_at)
ORDER BY week_start DESC;

COMMENT ON VIEW user_view_weekly_revenue_performance IS 'BAR CHART - Weekly revenue with color-coded performance indicators';

-- View 4: Daily Revenue Heatmap Data
-- Chart Type: CALENDAR HEATMAP
-- Colors: Green gradient intensity based on revenue
-- Usage: Beautiful calendar heatmap showing daily sales activity
CREATE OR REPLACE VIEW user_view_daily_revenue_heatmap AS
SELECT 
    t.seller_id as user_id,
    DATE(t.completed_at) as sale_date,
    TO_CHAR(DATE(t.completed_at), 'Day') as day_name,
    EXTRACT(DOW FROM t.completed_at) as day_of_week,
    COUNT(t.transaction_id) as daily_sales_count,
    COALESCE(SUM(t.item_price * t.quantity), 0) as daily_revenue,
    CASE 
        WHEN COALESCE(SUM(t.item_price * t.quantity), 0) >= 5000 THEN 'rgba(32, 135, 86, 1.0)'   -- Dark Green
        WHEN COALESCE(SUM(t.item_price * t.quantity), 0) >= 3000 THEN 'rgba(32, 135, 86, 0.8)'   -- Green 80%
        WHEN COALESCE(SUM(t.item_price * t.quantity), 0) >= 1500 THEN 'rgba(32, 135, 86, 0.6)'   -- Green 60%
        WHEN COALESCE(SUM(t.item_price * t.quantity), 0) >= 500 THEN 'rgba(32, 135, 86, 0.4)'    -- Green 40%
        WHEN COALESCE(SUM(t.item_price * t.quantity), 0) > 0 THEN 'rgba(32, 135, 86, 0.2)'       -- Green 20%
        ELSE 'rgba(229, 231, 235, 1.0)' -- Gray for no sales
    END as heatmap_color,
    CASE 
        WHEN COALESCE(SUM(t.item_price * t.quantity), 0) >= 5000 THEN 5
        WHEN COALESCE(SUM(t.item_price * t.quantity), 0) >= 3000 THEN 4
        WHEN COALESCE(SUM(t.item_price * t.quantity), 0) >= 1500 THEN 3
        WHEN COALESCE(SUM(t.item_price * t.quantity), 0) >= 500 THEN 2
        WHEN COALESCE(SUM(t.item_price * t.quantity), 0) > 0 THEN 1
        ELSE 0
    END as intensity_level
FROM transactions t
WHERE t.transaction_status = 'COMPLETED'
AND t.completed_at >= NOW() - INTERVAL '90 days'
GROUP BY t.seller_id, DATE(t.completed_at), EXTRACT(DOW FROM t.completed_at)
ORDER BY sale_date DESC;

COMMENT ON VIEW user_view_daily_revenue_heatmap IS 'CALENDAR HEATMAP - Daily revenue intensity with beautiful green gradient';

-- =====================================================================
-- SECTION 3: USER DASHBOARD - CATEGORY & PRODUCT BREAKDOWN
-- Purpose: Colorful donut charts and category analysis
-- =====================================================================

-- View 5: Revenue by Category (Donut Chart)
-- Chart Type: DONUT CHART / PIE CHART
-- Colors: 8-color rainbow palette
-- Usage: Beautiful multi-color donut chart showing revenue distribution
CREATE OR REPLACE VIEW user_view_revenue_by_category AS
SELECT 
    p.user_id,
    c.category_name,
    c.category_id,
    COUNT(DISTINCT p.product_id) as product_count,
    COALESCE(SUM(t.item_price * t.quantity), 0) as category_revenue,
    COUNT(t.transaction_id) as sales_count,
    COALESCE(AVG(t.item_price * t.quantity), 0) as avg_sale_value,
    ROUND(
        (COALESCE(SUM(t.item_price * t.quantity), 0) / 
         NULLIF((SELECT SUM(item_price * quantity) 
                 FROM transactions 
                 WHERE seller_id = p.user_id 
                 AND transaction_status = 'COMPLETED'), 0) * 100), 2
    ) as revenue_percentage,
    -- Beautiful color palette (8 colors rotating)
    CASE (ROW_NUMBER() OVER (PARTITION BY p.user_id ORDER BY COALESCE(SUM(t.item_price * t.quantity), 0) DESC) - 1) % 8
        WHEN 0 THEN '#208756' -- CSU Green
        WHEN 1 THEN '#FFCF50' -- Gold
        WHEN 2 THEN '#4285F4' -- Blue
        WHEN 3 THEN '#FF7F1C' -- Orange
        WHEN 4 THEN '#34A853' -- Green
        WHEN 5 THEN '#EA4335' -- Red
        WHEN 6 THEN '#9C27B0' -- Purple
        WHEN 7 THEN '#00BCD4' -- Teal
    END as slice_color,
    CASE 
        WHEN COALESCE(SUM(t.item_price * t.quantity), 0) > 0 THEN 
            CONCAT('₱', TO_CHAR(COALESCE(SUM(t.item_price * t.quantity), 0), 'FM999,999,999.00'))
        ELSE '₱0.00'
    END as formatted_revenue
FROM products p
INNER JOIN categories c ON p.category_id = c.category_id
LEFT JOIN transactions t ON p.product_id = t.product_id AND t.transaction_status = 'COMPLETED'
WHERE p.status = 'APPROVED'
GROUP BY p.user_id, c.category_name, c.category_id
HAVING COALESCE(SUM(t.item_price * t.quantity), 0) > 0
ORDER BY category_revenue DESC;

COMMENT ON VIEW user_view_revenue_by_category IS 'DONUT CHART - Revenue distribution by category with rainbow color palette';

-- View 6: Top Performing Products (Grid Cards)
-- Chart Type: PRODUCT CARDS with performance badges
-- Colors: Dynamic based on performance metrics
-- Usage: Beautiful product cards with images, stats, and color-coded badges
CREATE OR REPLACE VIEW user_view_top_performing_products AS
SELECT 
    p.user_id,
    p.product_id,
    p.product_name,
    p.price,
    p.view_count,
    c.category_name,
    
    -- Sales Performance
    (SELECT COUNT(*) FROM transactions 
     WHERE product_id = p.product_id 
     AND transaction_status = 'COMPLETED') as sales_count,
    (SELECT COALESCE(SUM(item_price * quantity), 0) FROM transactions 
     WHERE product_id = p.product_id 
     AND transaction_status = 'COMPLETED') as total_revenue,
    
    -- Engagement Metrics
    (SELECT COUNT(*) FROM product_favorites WHERE product_id = p.product_id) as favorite_count,
    (SELECT COALESCE(AVG(rating), 0) FROM reviews WHERE product_id = p.product_id) as avg_rating,
    (SELECT COUNT(*) FROM reviews WHERE product_id = p.product_id) as review_count,
    
    -- Conversion Rate
    ROUND(
        ((SELECT COUNT(*) FROM transactions 
          WHERE product_id = p.product_id 
          AND transaction_status = 'COMPLETED')::DECIMAL / 
         NULLIF(p.view_count, 0) * 100), 2
    ) as conversion_rate,
    
    -- Product Image
    (SELECT storage_path FROM product_images 
     WHERE product_id = p.product_id 
     ORDER BY image_order LIMIT 1) as image_url,
    
    -- Performance Badge & Color
    CASE 
        WHEN (SELECT COALESCE(SUM(item_price * quantity), 0) FROM transactions 
              WHERE product_id = p.product_id AND transaction_status = 'COMPLETED') >= 10000 
        THEN 'Best Seller'
        WHEN (SELECT COALESCE(AVG(rating), 0) FROM reviews WHERE product_id = p.product_id) >= 4.8 
        THEN 'Top Rated'
        WHEN p.view_count >= 1000 
        THEN 'Trending'
        WHEN (SELECT COUNT(*) FROM product_favorites WHERE product_id = p.product_id) >= 50 
        THEN 'Most Loved'
        ELSE 'Rising'
    END as performance_badge,
    CASE 
        WHEN (SELECT COALESCE(SUM(item_price * quantity), 0) FROM transactions 
              WHERE product_id = p.product_id AND transaction_status = 'COMPLETED') >= 10000 
        THEN '#FFCF50' -- Gold
        WHEN (SELECT COALESCE(AVG(rating), 0) FROM reviews WHERE product_id = p.product_id) >= 4.8 
        THEN '#9C27B0' -- Purple
        WHEN p.view_count >= 1000 
        THEN '#EA4335' -- Red
        WHEN (SELECT COUNT(*) FROM product_favorites WHERE product_id = p.product_id) >= 50 
        THEN '#E91E63' -- Pink
        ELSE '#208756' -- Green
    END as badge_color,
    
    -- Formatted Currency
    CONCAT('₱', TO_CHAR(p.price, 'FM999,999,999.00')) as formatted_price,
    CONCAT('₱', TO_CHAR(
        (SELECT COALESCE(SUM(item_price * quantity), 0) FROM transactions 
         WHERE product_id = p.product_id AND transaction_status = 'COMPLETED'), 
        'FM999,999,999.00'
    )) as formatted_revenue
FROM products p
INNER JOIN categories c ON p.category_id = c.category_id
WHERE p.status = 'APPROVED'
ORDER BY total_revenue DESC, view_count DESC
LIMIT 20;

COMMENT ON VIEW user_view_top_performing_products IS 'PRODUCT CARDS - Top products with performance badges and color coding';

-- =====================================================================
-- SECTION 4: USER DASHBOARD - ACTIVITY & ENGAGEMENT
-- Purpose: Activity timeline and engagement metrics
-- =====================================================================

-- View 7: Recent Activity Timeline
-- Chart Type: TIMELINE / ACTIVITY FEED with icons
-- Colors: Type-based color coding
-- Usage: Beautiful activity feed with color-coded icons and timestamps
CREATE OR REPLACE VIEW user_view_recent_activity_timeline AS
SELECT 
    activity_id,
    user_id,
    activity_type,
    description,
    timestamp,
    related_id,
    -- Activity Type Colors & Icons
    CASE activity_type
        WHEN 'product_listed' THEN '#4285F4' -- Blue
        WHEN 'product_sold' THEN '#208756'   -- Green
        WHEN 'product_favorited' THEN '#E91E63' -- Pink
        WHEN 'order_received' THEN '#FF7F1C' -- Orange
        WHEN 'order_completed' THEN '#34A853' -- Success Green
        WHEN 'review_received' THEN '#9C27B0' -- Purple
        WHEN 'product_viewed' THEN '#00BCD4' -- Teal
        ELSE '#9E9E9E' -- Gray
    END as activity_color,
    CASE activity_type
        WHEN 'product_listed' THEN 'LIST'
        WHEN 'product_sold' THEN 'SALE'
        WHEN 'product_favorited' THEN 'LIKE'
        WHEN 'order_received' THEN 'ORDER'
        WHEN 'order_completed' THEN 'DONE'
        WHEN 'review_received' THEN 'REVIEW'
        WHEN 'product_viewed' THEN 'VIEW'
        ELSE 'INFO'
    END as activity_icon,
    -- Time ago formatting
    CASE 
        WHEN timestamp >= NOW() - INTERVAL '1 hour' THEN 'Just now'
        WHEN timestamp >= NOW() - INTERVAL '24 hours' THEN 
            CONCAT(EXTRACT(HOUR FROM NOW() - timestamp)::INTEGER, 'h ago')
        WHEN timestamp >= NOW() - INTERVAL '7 days' THEN 
            CONCAT(EXTRACT(DAY FROM NOW() - timestamp)::INTEGER, 'd ago')
        ELSE TO_CHAR(timestamp, 'Mon DD')
    END as time_ago,
    -- Relative time grouping
    CASE 
        WHEN timestamp >= NOW() - INTERVAL '24 hours' THEN 'Today'
        WHEN timestamp >= NOW() - INTERVAL '48 hours' THEN 'Yesterday'
        WHEN timestamp >= NOW() - INTERVAL '7 days' THEN 'This Week'
        WHEN timestamp >= NOW() - INTERVAL '30 days' THEN 'This Month'
        ELSE 'Earlier'
    END as time_group
FROM (
    -- Product listings created
    SELECT 
        p.product_id as activity_id,
        p.user_id,
        'product_listed' as activity_type,
        CONCAT('Listed ', p.product_name) as description,
        p.created_at as timestamp,
        p.product_id as related_id
    FROM products p
    WHERE p.created_at >= NOW() - INTERVAL '90 days'
    
    UNION ALL
    
    -- Products sold
    SELECT 
        t.transaction_id::TEXT as activity_id,
        t.seller_id as user_id,
        'product_sold' as activity_type,
        CONCAT('Sold ', t.item_name, ' for ₱', TO_CHAR(t.item_price * t.quantity, 'FM999,999.00')) as description,
        t.completed_at as timestamp,
        t.product_id as related_id
    FROM transactions t
    WHERE t.transaction_status = 'COMPLETED'
    AND t.completed_at >= NOW() - INTERVAL '90 days'
    
    UNION ALL
    
    -- Products favorited
    SELECT 
        pf.favorite_id::TEXT as activity_id,
        p.user_id,
        'product_favorited' as activity_type,
        CONCAT(u.username, ' favorited your ', p.product_name) as description,
        pf.created_at as timestamp,
        pf.product_id as related_id
    FROM product_favorites pf
    INNER JOIN products p ON pf.product_id = p.product_id
    INNER JOIN users u ON pf.user_id = u.user_id
    WHERE pf.created_at >= NOW() - INTERVAL '90 days'
    
    UNION ALL
    
    -- Orders received
    SELECT 
        od.order_id::TEXT as activity_id,
        od.seller_id as user_id,
        'order_received' as activity_type,
        CONCAT('New order for ', od.product_name, ' from ', u.username) as description,
        od.created_at as timestamp,
        od.product_id as related_id
    FROM order_details od
    INNER JOIN users u ON od.buyer_id = u.user_id
    WHERE od.created_at >= NOW() - INTERVAL '90 days'
    
    UNION ALL
    
    -- Reviews received
    SELECT 
        r.review_id::TEXT as activity_id,
        r.seller_id as user_id,
        'review_received' as activity_type,
        CONCAT('Received ', r.rating, '⭐ review from ', u.username) as description,
        r.created_at as timestamp,
        COALESCE(r.product_id, 0) as related_id
    FROM reviews r
    INNER JOIN users u ON r.reviewer_id = u.user_id
    WHERE r.created_at >= NOW() - INTERVAL '90 days'
) activities
ORDER BY timestamp DESC
LIMIT 50;

COMMENT ON VIEW user_view_recent_activity_timeline IS 'ACTIVITY TIMELINE - Recent user activities with color-coded icons';

-- =====================================================================
-- SECTION 5: USER DASHBOARD - MATERIALIZED VIEWS FOR PERFORMANCE
-- Purpose: Pre-computed views for instant dashboard loading
-- Refresh Strategy: Hourly or on-demand
-- =====================================================================

-- Materialized View 1: User Performance Scorecard
-- Chart Type: SCORECARD / RADAR CHART
-- Refresh: Every 1 hour
-- Colors: Multi-metric color coding
CREATE MATERIALIZED VIEW mv_user_performance_scorecard AS
SELECT 
    u.user_id,
    u.username,
    u.profile_picture_url,
    
    -- Performance Metrics (0-100 scores)
    LEAST(100, (u.total_revenue / 1000)::INTEGER) as revenue_score,
    LEAST(100, (u.total_products_sold * 2)::INTEGER) as sales_score,
    LEAST(100, (u.average_seller_rating * 20)::INTEGER) as rating_score,
    LEAST(100, ((SELECT COUNT(*) FROM products WHERE user_id = u.user_id AND status = 'APPROVED') * 5)::INTEGER) as listing_score,
    LEAST(100, ((SELECT COUNT(*) FROM product_favorites pf 
                 INNER JOIN products p ON pf.product_id = p.product_id 
                 WHERE p.user_id = u.user_id) / 5)::INTEGER) as engagement_score,
    
    -- Overall Performance Score
    ROUND(
        (LEAST(100, (u.total_revenue / 1000)::INTEGER) * 0.3 +
         LEAST(100, (u.total_products_sold * 2)::INTEGER) * 0.25 +
         LEAST(100, (u.average_seller_rating * 20)::INTEGER) * 0.25 +
         LEAST(100, ((SELECT COUNT(*) FROM products WHERE user_id = u.user_id AND status = 'APPROVED') * 5)::INTEGER) * 0.1 +
         LEAST(100, ((SELECT COUNT(*) FROM product_favorites pf 
                      INNER JOIN products p ON pf.product_id = p.product_id 
                      WHERE p.user_id = u.user_id) / 5)::INTEGER) * 0.1)::NUMERIC, 2
    ) as overall_score,
    
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
    
    -- Growth Metrics
    (SELECT COUNT(*) FROM transactions 
     WHERE seller_id = u.user_id 
     AND transaction_status = 'COMPLETED'
     AND completed_at >= NOW() - INTERVAL '30 days') as sales_30d,
    (SELECT COALESCE(SUM(item_price * quantity), 0) FROM transactions 
     WHERE seller_id = u.user_id 
     AND transaction_status = 'COMPLETED'
     AND completed_at >= NOW() - INTERVAL '30 days') as revenue_30d,
    
    NOW() as last_updated
FROM users u
WHERE u.is_admin = FALSE
AND u.total_products_posted > 0;

CREATE UNIQUE INDEX ON mv_user_performance_scorecard (user_id);
CREATE INDEX ON mv_user_performance_scorecard (seller_tier);
CREATE INDEX ON mv_user_performance_scorecard (overall_score DESC);

COMMENT ON MATERIALIZED VIEW mv_user_performance_scorecard IS 'SCORECARD/RADAR CHART - User performance metrics with tier badges (Refresh: Hourly)';

-- Materialized View 2: User Revenue Analytics Summary
-- Chart Type: KPI DASHBOARD
-- Refresh: Every 6 hours
-- Colors: Revenue-based gradient
CREATE MATERIALIZED VIEW mv_user_revenue_summary AS
SELECT 
    t.seller_id as user_id,
    
    -- Revenue Breakdown
    COALESCE(SUM(CASE WHEN t.completed_at >= DATE_TRUNC('day', NOW()) 
                 THEN t.item_price * t.quantity ELSE 0 END), 0) as revenue_today,
    COALESCE(SUM(CASE WHEN t.completed_at >= DATE_TRUNC('week', NOW()) 
                 THEN t.item_price * t.quantity ELSE 0 END), 0) as revenue_this_week,
    COALESCE(SUM(CASE WHEN t.completed_at >= DATE_TRUNC('month', NOW()) 
                 THEN t.item_price * t.quantity ELSE 0 END), 0) as revenue_this_month,
    COALESCE(SUM(CASE WHEN t.completed_at >= DATE_TRUNC('year', NOW()) 
                 THEN t.item_price * t.quantity ELSE 0 END), 0) as revenue_this_year,
    COALESCE(SUM(t.item_price * t.quantity), 0) as revenue_lifetime,
    
    -- Transaction Counts
    COUNT(CASE WHEN t.completed_at >= DATE_TRUNC('day', NOW()) THEN 1 END) as sales_today,
    COUNT(CASE WHEN t.completed_at >= DATE_TRUNC('week', NOW()) THEN 1 END) as sales_this_week,
    COUNT(CASE WHEN t.completed_at >= DATE_TRUNC('month', NOW()) THEN 1 END) as sales_this_month,
    COUNT(t.transaction_id) as sales_lifetime,
    
    -- Average Values
    COALESCE(AVG(t.item_price * t.quantity), 0) as avg_transaction_value,
    COALESCE(MAX(t.item_price * t.quantity), 0) as highest_sale,
    
    -- Color Coding
    CASE 
        WHEN COALESCE(SUM(CASE WHEN t.completed_at >= DATE_TRUNC('month', NOW()) 
                          THEN t.item_price * t.quantity ELSE 0 END), 0) >= 50000 THEN '#208756' -- Excellent
        WHEN COALESCE(SUM(CASE WHEN t.completed_at >= DATE_TRUNC('month', NOW()) 
                          THEN t.item_price * t.quantity ELSE 0 END), 0) >= 20000 THEN '#34A853' -- Good
        WHEN COALESCE(SUM(CASE WHEN t.completed_at >= DATE_TRUNC('month', NOW()) 
                          THEN t.item_price * t.quantity ELSE 0 END), 0) >= 5000 THEN '#FFCF50'  -- Average
        ELSE '#FF7F1C' -- Below
    END as performance_color,
    
    NOW() as last_updated
FROM transactions t
WHERE t.transaction_status = 'COMPLETED'
GROUP BY t.seller_id;

CREATE UNIQUE INDEX ON mv_user_revenue_summary (user_id);
CREATE INDEX ON mv_user_revenue_summary (revenue_this_month DESC);

COMMENT ON MATERIALIZED VIEW mv_user_revenue_summary IS 'KPI DASHBOARD - Revenue summary with time-based breakdowns (Refresh: Every 6 hours)';

-- =====================================================================
-- SECTION 6: HELPER FUNCTIONS FOR USER DASHBOARD
-- Purpose: Reusable calculations and metric generators
-- =====================================================================

-- Function 1: Calculate User Engagement Score (0-100)
CREATE OR REPLACE FUNCTION fn_user_engagement_score(p_user_id UUID)
RETURNS DECIMAL(5, 2) AS $$
DECLARE
    v_score DECIMAL(5, 2) := 0;
    v_products INTEGER;
    v_sales INTEGER;
    v_favorites INTEGER;
    v_reviews INTEGER;
    v_rating DECIMAL;
BEGIN
    SELECT 
        total_products_posted,
        total_products_sold,
        total_reviews_received,
        average_seller_rating
    INTO v_products, v_sales, v_reviews, v_rating
    FROM users WHERE user_id = p_user_id;
    
    -- Products posted (max 20 points, capped at 20 products)
    v_score := v_score + LEAST(20, v_products);
    
    -- Products sold (max 30 points, capped at 30 sales)
    v_score := v_score + LEAST(30, v_sales);
    
    -- Seller rating (max 25 points, 5-star = 25 points)
    v_score := v_score + (v_rating * 5);
    
    -- Reviews received (max 15 points, capped at 15 reviews)
    v_score := v_score + LEAST(15, v_reviews);
    
    -- Favorites received (max 10 points)
    SELECT COUNT(*) INTO v_favorites
    FROM product_favorites pf
    INNER JOIN products p ON pf.product_id = p.product_id
    WHERE p.user_id = p_user_id;
    v_score := v_score + LEAST(10, v_favorites / 5);
    
    RETURN LEAST(v_score, 100);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION fn_user_engagement_score IS 'Calculate user engagement score (0-100) based on activity metrics';

-- Function 2: Get Revenue Growth Rate
CREATE OR REPLACE FUNCTION fn_user_revenue_growth(p_user_id UUID)
RETURNS DECIMAL(5, 2) AS $$
DECLARE
    v_current_month DECIMAL(12, 2);
    v_previous_month DECIMAL(12, 2);
    v_growth_rate DECIMAL(5, 2);
BEGIN
    -- Current month revenue
    SELECT COALESCE(SUM(item_price * quantity), 0)
    INTO v_current_month
    FROM transactions
    WHERE seller_id = p_user_id
    AND transaction_status = 'COMPLETED'
    AND completed_at >= DATE_TRUNC('month', NOW());
    
    -- Previous month revenue
    SELECT COALESCE(SUM(item_price * quantity), 0)
    INTO v_previous_month
    FROM transactions
    WHERE seller_id = p_user_id
    AND transaction_status = 'COMPLETED'
    AND completed_at >= DATE_TRUNC('month', NOW()) - INTERVAL '1 month'
    AND completed_at < DATE_TRUNC('month', NOW());
    
    -- Calculate growth rate
    IF v_previous_month = 0 THEN
        IF v_current_month > 0 THEN
            RETURN 100.00;
        ELSE
            RETURN 0.00;
        END IF;
    ELSE
        v_growth_rate := ((v_current_month - v_previous_month) / v_previous_month) * 100;
        RETURN ROUND(v_growth_rate, 2);
    END IF;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION fn_user_revenue_growth IS 'Calculate month-over-month revenue growth rate percentage';

-- Function 3: Get User Rank by Revenue
CREATE OR REPLACE FUNCTION fn_user_revenue_rank(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_rank INTEGER;
BEGIN
    SELECT rank INTO v_rank
    FROM (
        SELECT user_id, RANK() OVER (ORDER BY total_revenue DESC) as rank
        FROM users
        WHERE is_admin = FALSE AND total_revenue > 0
    ) rankings
    WHERE user_id = p_user_id;
    
    RETURN COALESCE(v_rank, 0);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION fn_user_revenue_rank IS 'Get user revenue ranking among all sellers';

-- =====================================================================
-- SECTION 7: REFRESH FUNCTIONS
-- Purpose: Manage materialized view refreshes
-- =====================================================================

-- Function: Refresh All User Dashboard Materialized Views
CREATE OR REPLACE FUNCTION refresh_user_dashboard_views()
RETURNS TEXT AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_user_performance_scorecard;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_user_revenue_summary;
    
    RETURN 'User dashboard views refreshed at ' || NOW()::TEXT;
EXCEPTION
    WHEN OTHERS THEN
        RETURN 'Error refreshing views: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION refresh_user_dashboard_views IS 'Refresh all user dashboard materialized views';

-- =====================================================================
-- INSTALLATION COMPLETE
-- =====================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================================';
    RAISE NOTICE 'CSU MARKETPLACE - USER DASHBOARD PREMIUM';
    RAISE NOTICE '========================================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Installation Complete!';
    RAISE NOTICE '';
    RAISE NOTICE 'VIEWS CREATED:';
    RAISE NOTICE '  1. user_view_dashboard_hero_stats (KPI Cards)';
    RAISE NOTICE '  2. user_view_monthly_revenue_trend (Area Chart)';
    RAISE NOTICE '  3. user_view_weekly_revenue_performance (Bar Chart)';
    RAISE NOTICE '  4. user_view_daily_revenue_heatmap (Calendar Heatmap)';
    RAISE NOTICE '  5. user_view_revenue_by_category (Donut Chart)';
    RAISE NOTICE '  6. user_view_top_performing_products (Product Cards)';
    RAISE NOTICE '  7. user_view_recent_activity_timeline (Activity Feed)';
    RAISE NOTICE '';
    RAISE NOTICE 'MATERIALIZED VIEWS CREATED:';
    RAISE NOTICE '  1. mv_user_performance_scorecard (Radar Chart)';
    RAISE NOTICE '  2. mv_user_revenue_summary (KPI Dashboard)';
    RAISE NOTICE '';
    RAISE NOTICE 'FUNCTIONS CREATED:';
    RAISE NOTICE '  1. fn_user_engagement_score(user_id)';
    RAISE NOTICE '  2. fn_user_revenue_growth(user_id)';
    RAISE NOTICE '  3. fn_user_revenue_rank(user_id)';
    RAISE NOTICE '  4. refresh_user_dashboard_views()';
    RAISE NOTICE '';
    RAISE NOTICE 'COLOR PALETTE:';
    RAISE NOTICE '  CSU Green: #208756 | Gold: #FFCF50 | Blue: #4285F4';
    RAISE NOTICE '  Orange: #FF7F1C | Red: #EA4335 | Purple: #9C27B0';
    RAISE NOTICE '  Teal: #00BCD4 | Pink: #E91E63';
    RAISE NOTICE '';
    RAISE NOTICE 'RECOMMENDED REFRESH SCHEDULE:';
    RAISE NOTICE '  mv_user_performance_scorecard: Every 1 hour';
    RAISE NOTICE '  mv_user_revenue_summary: Every 6 hours';
    RAISE NOTICE '';
    RAISE NOTICE '========================================================';
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════════
-- SECTION 1: ADMIN VIEWS (4 Views)
-- ═══════════════════════════════════════════════════════════════════════════════════

-- Admin View 1: Platform Overview
CREATE OR REPLACE VIEW admin_view_platform_overview AS
SELECT 
    (SELECT COUNT(*) FROM users WHERE is_active = TRUE) as total_active_users,
    (SELECT COUNT(*) FROM users WHERE is_admin = TRUE) as total_admins,
    (SELECT COUNT(*) FROM users WHERE created_at >= NOW() - INTERVAL '30 days') as new_users_30d,
    (SELECT COUNT(*) FROM users WHERE is_verified = TRUE) as verified_users,
    (SELECT COUNT(*) FROM products) as total_products,
    (SELECT COUNT(*) FROM products WHERE status = 'APPROVED') as approved_products,
    (SELECT COUNT(*) FROM products WHERE status = 'PENDING') as pending_products,
    (SELECT COUNT(*) FROM products WHERE status = 'APPROVED' AND is_available = TRUE) as active_listings,
    (SELECT COUNT(*) FROM products WHERE created_at >= NOW() - INTERVAL '7 days') as new_products_7d,
    (SELECT COUNT(*) FROM transactions) as total_transactions,
    (SELECT COUNT(*) FROM transactions WHERE transaction_status = 'COMPLETED') as completed_transactions,
    (SELECT COUNT(*) FROM transactions WHERE transaction_status = 'PENDING') as pending_transactions,
    (SELECT COUNT(*) FROM transactions WHERE created_at >= NOW() - INTERVAL '24 hours') as transactions_24h,
    (SELECT COALESCE(SUM(item_price * quantity), 0) FROM transactions WHERE transaction_status = 'COMPLETED') as total_revenue,
    (SELECT COALESCE(SUM(item_price * quantity), 0) FROM transactions WHERE transaction_status = 'COMPLETED' AND completed_at >= NOW() - INTERVAL '30 days') as revenue_30d,
    (SELECT COALESCE(SUM(item_price * quantity), 0) FROM transactions WHERE transaction_status = 'COMPLETED' AND completed_at >= NOW() - INTERVAL '7 days') as revenue_7d,
    (SELECT COALESCE(AVG(item_price * quantity), 0) FROM transactions WHERE transaction_status = 'COMPLETED') as avg_transaction_value,
    (SELECT COUNT(*) FROM product_favorites) as total_favorites,
    (SELECT COUNT(*) FROM reviews) as total_reviews,
    (SELECT COALESCE(AVG(rating), 0) FROM reviews) as platform_avg_rating,
    (SELECT COUNT(*) FROM transactions WHERE is_blockchain_pending = TRUE) as blockchain_pending,
    (SELECT COUNT(*) FROM blockchain_transactions WHERE blockchain_status = 'confirmed') as blockchain_confirmed,
    NOW() as last_updated;

COMMENT ON VIEW admin_view_platform_overview IS 'KPI CARDS - Platform overview metrics for admin dashboard';

-- Admin View 2: Recent Transactions
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

-- Admin View 3: User Activity
CREATE OR REPLACE VIEW admin_view_user_activity AS
SELECT 
    u.user_id,
    u.username,
    u.email,
    u.first_name || ' ' || u.last_name as full_name,
    u.department,
    u.year_level,
    u.id_number,
    u.phone_number,
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

-- Admin View 4: Pending Products
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
    u.profile_picture_url as seller_profile_picture,
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





-- Admin Analytics 1: Category Performance
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

-- Admin Analytics 2: User Growth
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

-- Admin Analytics 3: Product Trend
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

-- Admin Analytics 4: Revenue Trend
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

-- Admin Analytics 5: Top Sellers
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

-- Admin Analytics 6: Top Products
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

-- Admin Analytics 7: Transaction Status
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

-- Admin Analytics 8: Listing Type Distribution
CREATE OR REPLACE VIEW analytics_view_listing_type_distribution AS
WITH product_listings AS (
    SELECT 
        listing_type,
        COUNT(*) as product_count
    FROM products
    WHERE status = 'APPROVED'
    GROUP BY listing_type
)
SELECT 
    pl.listing_type,
    pl.product_count,
    ROUND(pl.product_count::DECIMAL / (SELECT COUNT(*) FROM products WHERE status = 'APPROVED') * 100, 2) as percentage,
    (SELECT COUNT(*) FROM transactions WHERE transactions.listing_type = pl.listing_type AND transaction_status = 'COMPLETED') as completed_transactions,
    (SELECT COALESCE(SUM(item_price * quantity), 0) FROM transactions WHERE transactions.listing_type = pl.listing_type AND transaction_status = 'COMPLETED') as total_revenue
FROM product_listings pl
ORDER BY product_count DESC;

COMMENT ON VIEW analytics_view_listing_type_distribution IS 'DONUT CHART - Product listing type breakdown';



-- Materialized View 1: Daily Platform Metrics
CREATE MATERIALIZED VIEW mv_daily_platform_metrics AS
SELECT 
    CURRENT_DATE as metric_date,
    (SELECT COUNT(*) FROM users WHERE is_active = TRUE) as total_active_users,
    (SELECT COUNT(*) FROM users WHERE created_at::DATE = CURRENT_DATE) as new_users_today,
    (SELECT COUNT(*) FROM users WHERE last_active_at >= NOW() - INTERVAL '24 hours') as active_users_24h,
    (SELECT COUNT(*) FROM products WHERE status = 'APPROVED' AND is_available = TRUE) as active_listings,
    (SELECT COUNT(*) FROM products WHERE created_at::DATE = CURRENT_DATE) as new_listings_today,
    (SELECT COUNT(*) FROM products WHERE status = 'PENDING') as pending_approvals,
    (SELECT COUNT(*) FROM transactions WHERE created_at::DATE = CURRENT_DATE) as transactions_today,
    (SELECT COUNT(*) FROM transactions WHERE transaction_status = 'COMPLETED' AND completed_at::DATE = CURRENT_DATE) as completed_today,
    (SELECT COALESCE(SUM(item_price * quantity), 0) FROM transactions WHERE transaction_status = 'COMPLETED' AND completed_at::DATE = CURRENT_DATE) as revenue_today,
    (SELECT SUM(view_count) FROM products) as total_product_views,
    (SELECT COUNT(*) FROM product_favorites WHERE created_at::DATE = CURRENT_DATE) as new_favorites_today,
    (SELECT COUNT(*) FROM reviews WHERE created_at::DATE = CURRENT_DATE) as new_reviews_today,
    NOW() as last_refreshed;

CREATE UNIQUE INDEX ON mv_daily_platform_metrics (metric_date);
COMMENT ON MATERIALIZED VIEW mv_daily_platform_metrics IS 'KPI DASHBOARD - Daily platform metrics snapshot (Refresh: Every 6 hours)';

-- Materialized View 4: Monthly Category Pareto
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
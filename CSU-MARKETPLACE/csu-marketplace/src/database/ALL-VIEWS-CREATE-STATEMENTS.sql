-- =====================================================================
-- 📊 CSU MARKETPLACE - COMPLETE VIEW DEFINITIONS
-- All 33 Views with Full CREATE OR REPLACE VIEW Statements
-- Version: 1.0 Production
-- Date: November 25, 2025
-- =====================================================================

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

-- ═══════════════════════════════════════════════════════════════════════════════════
-- SECTION 2: USER BASIC VIEWS (5 Views)
-- ═══════════════════════════════════════════════════════════════════════════════════

-- User View 1: Dashboard Overview
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

-- User View 2: My Listings
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

-- User View 3: My Orders (Buyer)
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

-- User View 4: My Sales (Seller)
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

-- User View 5: Recent Activity
CREATE OR REPLACE VIEW user_view_recent_activity AS
SELECT 
    u.user_id,
    'product_view' as activity_type,
    p.product_id::TEXT as related_id,
    p.product_name as activity_description,
    p.view_count as activity_metric,
    MAX(p.updated_at) as activity_timestamp,
    c.category_name,
    p.listing_type,
    NULL::TEXT as user_name
FROM users u
INNER JOIN products p ON p.user_id = u.user_id
INNER JOIN categories c ON p.category_id = c.category_id
WHERE p.updated_at >= NOW() - INTERVAL '90 days'
GROUP BY u.user_id, p.product_id, p.product_name, p.view_count, c.category_name, p.listing_type
UNION ALL
SELECT 
    p.user_id,
    'product_favorite' as activity_type,
    pf.product_id::TEXT as related_id,
    p.product_name as activity_description,
    1 as activity_metric,
    pf.created_at as activity_timestamp,
    c.category_name,
    p.listing_type,
    CONCAT(pfu.first_name, ' ', pfu.last_name) as user_name
FROM product_favorites pf
INNER JOIN products p ON pf.product_id = p.product_id
INNER JOIN categories c ON p.category_id = c.category_id
INNER JOIN users pfu ON pf.user_id = pfu.user_id
WHERE pf.created_at >= NOW() - INTERVAL '90 days'
UNION ALL
SELECT 
    od.buyer_id as user_id,
    'order_placed' as activity_type,
    od.order_id::TEXT as related_id,
    od.product_name as activity_description,
    od.buyer_quantity as activity_metric,
    od.created_at as activity_timestamp,
    (SELECT category_name FROM categories WHERE category_id = (SELECT category_id FROM products WHERE product_id = od.product_id)) as category_name,
    od.listing_type,
    NULL::TEXT as user_name
FROM order_details od
WHERE od.created_at >= NOW() - INTERVAL '90 days'
UNION ALL
SELECT 
    user_id,
    'product_created' as activity_type,
    product_id::TEXT as related_id,
    product_name as activity_description,
    1 as activity_metric,
    created_at as activity_timestamp,
    (SELECT category_name FROM categories WHERE category_id = products.category_id) as category_name,
    products.listing_type,
    NULL::TEXT as user_name
FROM products
WHERE created_at >= NOW() - INTERVAL '90 days'
ORDER BY activity_timestamp DESC;

COMMENT ON VIEW user_view_recent_activity IS 'ACTIVITY FEED - User recent actions (views, favorites, orders, listings)';

-- ═══════════════════════════════════════════════════════════════════════════════════
-- SECTION 2B: USER ANALYTICS VIEWS (8 Views)
-- ═══════════════════════════════════════════════════════════════════════════════════

-- User Analytics 1: Revenue Trend
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

-- User Analytics 2: Product Performance
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

-- User Analytics 3: Category Performance
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

-- User Analytics 4: Order Status Distribution
CREATE OR REPLACE VIEW user_analytics_my_order_status_distribution AS
SELECT 
    seller_id,
    order_status,
    COUNT(*) as count,
    ROUND(COUNT(*)::DECIMAL / (SELECT COUNT(*) FROM order_details WHERE seller_id = order_details.seller_id) * 100, 2) as percentage,
    COALESCE(SUM(price * buyer_quantity), 0) as total_value
FROM order_details
WHERE order_status IN ('pending', 'accepted', 'rejected', 'cancelled', 'completed')
GROUP BY seller_id, order_status
ORDER BY CASE 
    WHEN order_status = 'pending' THEN 1
    WHEN order_status = 'accepted' THEN 2
    WHEN order_status = 'completed' THEN 3
    WHEN order_status = 'rejected' THEN 4
    WHEN order_status = 'cancelled' THEN 5
    ELSE 6
END, count DESC;

COMMENT ON VIEW user_analytics_my_order_status_distribution IS 'DONUT CHART - User order status breakdown (pending, accepted, completed, rejected, cancelled)';

-- User Analytics 5: Sales Trend
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

-- User Analytics 6: Top Customers
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

-- User Analytics 7: Monthly Revenue
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

-- User Analytics 8: Purchase Trend
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

-- User Analytics 9: Seller Rating Breakdown
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

-- ═══════════════════════════════════════════════════════════════════════════════════
-- SECTION 3: ADMIN ANALYTICS VIEWS (9 Views)
-- ═══════════════════════════════════════════════════════════════════════════════════

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

-- ═══════════════════════════════════════════════════════════════════════════════════
-- SECTION 4: MATERIALIZED VIEWS (7 Views)
-- ═══════════════════════════════════════════════════════════════════════════════════

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

-- Materialized View 2: Weekly Revenue by Category
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

-- Materialized View 3: User Engagement Heatmap
CREATE MATERIALIZED VIEW mv_user_engagement_heatmap AS
SELECT 
    DATE(created_at) as activity_date,
    EXTRACT(DOW FROM created_at) as day_of_week,
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

-- Materialized View 5: Transaction Funnel
CREATE MATERIALIZED VIEW mv_transaction_funnel AS
SELECT 
    'Product Views' as stage,
    1 as stage_order,
    COALESCE(SUM(view_count), 0)::BIGINT as count,
    100.0 as percentage
FROM products
WHERE created_at >= NOW() - INTERVAL '30 days'
UNION ALL
SELECT 
    'Added to Favorites' as stage,
    2 as stage_order,
    COUNT(*)::BIGINT as count,
    ROUND((COUNT(*)::DECIMAL / NULLIF((SELECT COALESCE(SUM(view_count), 0) FROM products WHERE created_at >= NOW() - INTERVAL '30 days'), 0)) * 100, 2) as percentage
FROM product_favorites
WHERE created_at >= NOW() - INTERVAL '30 days'
UNION ALL
SELECT 
    'Orders Placed' as stage,
    3 as stage_order,
    COUNT(*)::BIGINT as count,
    ROUND((COUNT(*)::DECIMAL / NULLIF((SELECT COUNT(*) FROM product_favorites WHERE created_at >= NOW() - INTERVAL '30 days'), 0)) * 100, 2) as percentage
FROM order_details
WHERE created_at >= NOW() - INTERVAL '30 days'
UNION ALL
SELECT 
    'Orders Accepted' as stage,
    4 as stage_order,
    COUNT(*)::BIGINT as count,
    ROUND((COUNT(*)::DECIMAL / NULLIF((SELECT COUNT(*) FROM order_details WHERE created_at >= NOW() - INTERVAL '30 days'), 0)) * 100, 2) as percentage
FROM order_details
WHERE order_status = 'accepted' AND created_at >= NOW() - INTERVAL '30 days'
UNION ALL
SELECT 
    'Transactions Completed' as stage,
    5 as stage_order,
    COUNT(*)::BIGINT as count,
    ROUND((COUNT(*)::DECIMAL / NULLIF((SELECT COUNT(*) FROM order_details WHERE order_status = 'accepted' AND created_at >= NOW() - INTERVAL '30 days'), 0)) * 100, 2) as percentage
FROM transactions
WHERE transaction_status = 'COMPLETED' AND completed_at >= NOW() - INTERVAL '30 days'
ORDER BY stage_order;

COMMENT ON MATERIALIZED VIEW mv_transaction_funnel IS 'FUNNEL CHART - User journey from view to completed transaction (Refresh: Every 6 hours)';

-- Materialized View 6: Seller Performance Scorecard
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

-- Materialized View 7: Product Lifecycle Analysis
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

-- ═══════════════════════════════════════════════════════════════════════════════════
-- HELPER FUNCTION: REFRESH ALL MATERIALIZED VIEWS
-- ═══════════════════════════════════════════════════════════════════════════════════

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

-- ═══════════════════════════════════════════════════════════════════════════════════
-- COMPLETION
-- ═══════════════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
    RAISE NOTICE '========================================================';
    RAISE NOTICE 'ALL 33 VIEWS CREATED SUCCESSFULLY';
    RAISE NOTICE '========================================================';
    RAISE NOTICE 'Admin Views: 4';
    RAISE NOTICE 'User Views: 5';
    RAISE NOTICE 'User Analytics Views: 8';
    RAISE NOTICE 'Admin Analytics Views: 8';
    RAISE NOTICE 'Materialized Views: 7';
    RAISE NOTICE 'TOTAL: 33 Views';
    RAISE NOTICE '========================================================';
    RAISE NOTICE 'Ready for Supabase deployment!';
END $$;

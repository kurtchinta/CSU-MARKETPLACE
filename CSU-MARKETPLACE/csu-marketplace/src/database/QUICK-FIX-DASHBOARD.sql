-- ═══════════════════════════════════════════════════════════════════════════════════
-- QUICK FIX: Dashboard Permission & Column Issues
-- Run this in Supabase SQL Editor to fix all dashboard errors
-- ═══════════════════════════════════════════════════════════════════════════════════

-- FIX 1: Recreate analytics_view_top_products with user_id column
DROP VIEW IF EXISTS analytics_view_top_products CASCADE;

CREATE OR REPLACE VIEW analytics_view_top_products AS
SELECT 
    p.product_id,
    p.product_name,
    p.price,
    p.listing_type,
    p.view_count,
    p.created_at,
    c.category_name,
    p.user_id,
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

-- FIX 2: Grant access to all views (without RLS)
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO authenticated;

-- Give explicit access to views
GRANT SELECT ON user_view_dashboard_overview TO anon, authenticated;
GRANT SELECT ON user_view_my_listings TO anon, authenticated;
GRANT SELECT ON user_view_my_orders_buyer TO anon, authenticated;
GRANT SELECT ON user_view_my_sales_seller TO anon, authenticated;
GRANT SELECT ON user_view_recent_activity TO anon, authenticated;

GRANT SELECT ON user_analytics_my_revenue_trend TO anon, authenticated;
GRANT SELECT ON user_analytics_my_product_performance TO anon, authenticated;
GRANT SELECT ON user_analytics_my_category_performance TO anon, authenticated;
GRANT SELECT ON user_analytics_my_order_status_distribution TO anon, authenticated;
GRANT SELECT ON user_analytics_my_sales_trend TO anon, authenticated;
GRANT SELECT ON user_analytics_my_top_customers TO anon, authenticated;
GRANT SELECT ON user_analytics_my_monthly_revenue TO anon, authenticated;
GRANT SELECT ON user_analytics_my_purchase_trend TO anon, authenticated;
GRANT SELECT ON user_analytics_my_seller_rating_breakdown TO anon, authenticated;

GRANT SELECT ON analytics_view_category_performance TO anon, authenticated;
GRANT SELECT ON analytics_view_user_growth TO anon, authenticated;
GRANT SELECT ON analytics_view_product_trend TO anon, authenticated;
GRANT SELECT ON analytics_view_revenue_trend TO anon, authenticated;
GRANT SELECT ON analytics_view_top_sellers TO anon, authenticated;
GRANT SELECT ON analytics_view_top_products TO anon, authenticated;
GRANT SELECT ON analytics_view_transaction_status TO anon, authenticated;
GRANT SELECT ON analytics_view_listing_type_distribution TO anon, authenticated;

-- Materialized views
GRANT SELECT ON mv_daily_platform_metrics TO anon, authenticated;
GRANT SELECT ON mv_weekly_revenue_by_category TO anon, authenticated;
GRANT SELECT ON mv_user_engagement_heatmap TO anon, authenticated;
GRANT SELECT ON mv_monthly_category_pareto TO anon, authenticated;
GRANT SELECT ON mv_transaction_funnel TO anon, authenticated;
GRANT SELECT ON mv_seller_performance_scorecard TO anon, authenticated;
GRANT SELECT ON mv_product_lifecycle_analysis TO anon, authenticated;

-- Done!
DO $$
BEGIN
    RAISE NOTICE '✅ ALL FIXES APPLIED - Dashboard should work now!';
END $$;

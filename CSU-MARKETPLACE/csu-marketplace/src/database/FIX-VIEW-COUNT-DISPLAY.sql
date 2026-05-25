-- ═══════════════════════════════════════════════════════════════════════════════════
-- FIX: COMPLETE VIEW COUNT SYSTEM
-- This script ensures view_count works end-to-end
-- ═══════════════════════════════════════════════════════════════════════════════════

-- STEP 1: Add view_count column to products table if it doesn't exist
ALTER TABLE products
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;

-- STEP 2: Update any NULL values to 0
UPDATE products SET view_count = 0 WHERE view_count IS NULL;

-- STEP 3: Set column to NOT NULL
ALTER TABLE products
ALTER COLUMN view_count SET NOT NULL;

-- STEP 4: Create index for performance
DROP INDEX IF EXISTS idx_products_view_count;
CREATE INDEX idx_products_view_count ON products(view_count DESC);

-- STEP 5: Recreate the analytics view with explicit view_count selection
DROP VIEW IF EXISTS analytics_view_top_products CASCADE;

CREATE VIEW analytics_view_top_products AS
SELECT 
    p.product_id,
    p.product_name,
    p.price,
    p.listing_type,
    COALESCE(p.view_count, 0) as view_count,
    p.created_at,
    c.category_name,
    p.user_id,
    u.username as seller_username,
    u.first_name || ' ' || u.last_name as seller_name,
    (SELECT COUNT(*) FROM product_favorites WHERE product_id = p.product_id) as favorite_count,
    (SELECT COUNT(*) FROM transactions WHERE product_id = p.product_id AND transaction_status = 'COMPLETED') as sales_count,
    (SELECT COALESCE(SUM(item_price * quantity), 0) FROM transactions WHERE product_id = p.product_id AND transaction_status = 'COMPLETED') as total_revenue,
    RANK() OVER (ORDER BY COALESCE(p.view_count, 0) DESC) as view_rank,
    RANK() OVER (ORDER BY (SELECT COUNT(*) FROM product_favorites WHERE product_id = p.product_id) DESC) as favorite_rank
FROM products p
INNER JOIN users u ON p.user_id = u.user_id
INNER JOIN categories c ON p.category_id = c.category_id
WHERE p.status = 'APPROVED'
ORDER BY COALESCE(p.view_count, 0) DESC
LIMIT 50;

COMMENT ON VIEW analytics_view_top_products IS 'Top products ranked by views, sales, and favorites with real view_count data';

-- STEP 6: Grant permissions
GRANT SELECT ON analytics_view_top_products TO anon, authenticated;

-- STEP 7: Verify the data
SELECT 
    product_id,
    product_name,
    view_count,
    sales_count,
    favorite_count
FROM analytics_view_top_products
LIMIT 10;

-- DONE
DO $$
BEGIN
    RAISE NOTICE '✅ VIEW COUNT SYSTEM FIXED - Products now have view tracking';
END $$;

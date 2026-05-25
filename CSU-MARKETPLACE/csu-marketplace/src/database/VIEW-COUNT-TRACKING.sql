-- ═══════════════════════════════════════════════════════════════════════════════════
-- VIEW COUNT TRACKING SYSTEM
-- Enables automatic increment of product view counts
-- ═══════════════════════════════════════════════════════════════════════════════════

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS increment_product_views(integer) CASCADE;

-- Create RPC function to increment view count
CREATE OR REPLACE FUNCTION increment_product_views(product_id integer)
RETURNS void AS $$
BEGIN
  UPDATE products
  SET view_count = view_count + 1,
      updated_at = NOW()
  WHERE products.product_id = $1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution permission to all users
GRANT EXECUTE ON FUNCTION increment_product_views(integer) TO anon, authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION increment_product_views(integer) IS 
'Increment the view_count for a product by 1. Called when a user visits the product details page.';

-- ═══════════════════════════════════════════════════════════════════════════════════
-- TRACKING SUMMARY
-- ═══════════════════════════════════════════════════════════════════════════════════
-- 
-- When a product is viewed:
-- 1. ProductDetails.tsx loads the product with productService.getProductById()
-- 2. After successful load, incrementViewCount() is called
-- 3. Service calls increment_product_views RPC function
-- 4. view_count in products table is incremented by 1
-- 5. updated_at timestamp is refreshed
-- 6. Dashboard displays real view counts from analytics_view_top_products view
--
-- The view count is used in:
-- - Top Products section on Dashboard (displayed with Eye icon)
-- - Product ranking for analytics
-- - Seller performance metrics
--
-- ═══════════════════════════════════════════════════════════════════════════════════

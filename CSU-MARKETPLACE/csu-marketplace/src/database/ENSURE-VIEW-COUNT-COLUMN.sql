-- ═══════════════════════════════════════════════════════════════════════════════════
-- ENSURE VIEW COUNT COLUMN EXISTS AND IS INITIALIZED
-- Run this in Supabase SQL Editor to ensure view_count column exists
-- ═══════════════════════════════════════════════════════════════════════════════════

-- Check if view_count column exists, if not add it
ALTER TABLE products
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;

-- Update any NULL values to 0
UPDATE products SET view_count = 0 WHERE view_count IS NULL;

-- Create an index on view_count for faster queries
CREATE INDEX IF NOT EXISTS idx_products_view_count ON products(view_count DESC);

-- Ensure the column is not null going forward
ALTER TABLE products
ALTER COLUMN view_count SET NOT NULL;

-- ═══════════════════════════════════════════════════════════════════════════════════
-- VERIFICATION
-- ═══════════════════════════════════════════════════════════════════════════════════

-- Check the column exists and has correct properties
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'products' AND column_name = 'view_count';

-- See sample data
SELECT product_id, product_name, view_count FROM products LIMIT 10;

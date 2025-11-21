-- =====================================================================
-- CSU MARKETPLACE - SEARCH OPTIMIZATION
-- Full-Text Search with Ranking & Performance Indexes
-- Version: 1.0 Production
-- Date: November 15, 2025
-- =====================================================================

-- =====================================================================
-- SECTION 1: FULL-TEXT SEARCH INDEXES
-- =====================================================================

-- Drop existing basic indexes if they exist
DROP INDEX IF EXISTS idx_products_name_search;
DROP INDEX IF EXISTS idx_products_description_search;

-- Create composite tsvector column for better search performance
ALTER TABLE products ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Create GIN index for full-text search (fastest for search queries)
CREATE INDEX idx_products_search_vector ON products USING gin(search_vector);

-- Create weighted tsvector (product_name has higher weight than description)
CREATE OR REPLACE FUNCTION products_search_vector_update()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('english', COALESCE(NEW.product_name, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE((SELECT category_name FROM categories WHERE category_id = NEW.category_id), '')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update search vector on insert/update
DROP TRIGGER IF EXISTS products_search_vector_trigger ON products;
CREATE TRIGGER products_search_vector_trigger
    BEFORE INSERT OR UPDATE OF product_name, description, category_id
    ON products
    FOR EACH ROW
    EXECUTE FUNCTION products_search_vector_update();

-- Populate existing products
UPDATE products SET search_vector = 
    setweight(to_tsvector('english', COALESCE(product_name, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(description, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE((SELECT category_name FROM categories WHERE category_id = products.category_id), '')), 'C');

-- =====================================================================
-- SECTION 2: OPTIMIZED SEARCH FUNCTION
-- =====================================================================

-- Function: Advanced product search with ranking
CREATE OR REPLACE FUNCTION fn_search_products(
    p_search_query TEXT,
    p_category_id INTEGER DEFAULT NULL,
    p_listing_types TEXT[] DEFAULT NULL,
    p_min_price DECIMAL DEFAULT 0,
    p_max_price DECIMAL DEFAULT 999999,
    p_min_rating DECIMAL DEFAULT 0,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    product_id INTEGER,
    product_name VARCHAR(255),
    description TEXT,
    price DECIMAL(12, 2),
    quantity INTEGER,
    listing_type TEXT,
    status TEXT,
    created_at TIMESTAMPTZ,
    view_count INTEGER,
    pickup_location TEXT,
    meetup_location TEXT,
    
    -- Category info
    category_id INTEGER,
    category_name VARCHAR(100),
    
    -- Seller info
    seller_id UUID,
    seller_username VARCHAR(50),
    seller_first_name VARCHAR(100),
    seller_last_name VARCHAR(100),
    seller_department VARCHAR(100),
    seller_profile_picture TEXT,
    seller_average_rating DECIMAL(3, 2),
    seller_total_reviews INTEGER,
    
    -- Images
    images JSONB,
    
    -- Sold count
    sold_count BIGINT,
    
    -- Search relevance score
    search_rank REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.product_id,
        p.product_name,
        p.description,
        p.price,
        p.quantity,
        p.listing_type,
        p.status,
        p.created_at,
        p.view_count,
        p.pickup_location,
        p.meetup_location,
        
        -- Category
        c.category_id,
        c.category_name,
        
        -- Seller
        u.user_id as seller_id,
        u.username as seller_username,
        u.first_name as seller_first_name,
        u.last_name as seller_last_name,
        u.department as seller_department,
        u.profile_picture_url as seller_profile_picture,
        u.average_seller_rating as seller_average_rating,
        u.total_reviews_received as seller_total_reviews,
        
        -- Images (aggregated as JSON)
        COALESCE(
            (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'image_id', pi.image_id,
                        'storage_path', pi.storage_path,
                        'image_order', pi.image_order
                    ) ORDER BY pi.image_order
                )
                FROM product_images pi
                WHERE pi.product_id = p.product_id
            ),
            '[]'::jsonb
        ) as images,
        
        -- Sold count (completed transactions)
        COALESCE(
            (
                SELECT COUNT(*)::BIGINT
                FROM transactions t
                WHERE t.product_id = p.product_id
                AND t.transaction_status = 'COMPLETED'
            ),
            0::BIGINT
        ) as sold_count,
        
        -- Search ranking (higher = more relevant)
        CASE 
            WHEN p_search_query IS NULL OR p_search_query = '' THEN 
                -- No search query: rank by popularity and recency
                (p.view_count * 0.3 + p.favorite_count * 0.5 + EXTRACT(EPOCH FROM NOW() - p.created_at) / -86400 * 0.2)::REAL
            ELSE
                -- With search query: rank by text match relevance
                (ts_rank_cd(p.search_vector, websearch_to_tsquery('english', p_search_query), 32) * 100 +
                 -- Boost exact matches in product name
                 CASE WHEN LOWER(p.product_name) LIKE '%' || LOWER(p_search_query) || '%' THEN 50 ELSE 0 END +
                 -- Boost newer products slightly
                 CASE WHEN p.created_at > NOW() - INTERVAL '7 days' THEN 10 ELSE 0 END +
                 -- Boost highly rated sellers
                 (u.average_seller_rating * 5) +
                 -- Boost popular products
                 (p.view_count * 0.1))::REAL
        END as search_rank
        
    FROM products p
    INNER JOIN categories c ON p.category_id = c.category_id
    INNER JOIN users u ON p.user_id = u.user_id
    
    WHERE 
        -- Status filter (only approved products)
        p.status = 'APPROVED'
        AND p.is_available = TRUE
        
        -- Search query filter
        AND (
            p_search_query IS NULL 
            OR p_search_query = '' 
            OR p.search_vector @@ websearch_to_tsquery('english', p_search_query)
            OR LOWER(p.product_name) LIKE '%' || LOWER(p_search_query) || '%'
            OR LOWER(p.description) LIKE '%' || LOWER(p_search_query) || '%'
        )
        
        -- Category filter
        AND (p_category_id IS NULL OR p.category_id = p_category_id)
        
        -- Listing type filter
        AND (p_listing_types IS NULL OR p.listing_type = ANY(p_listing_types))
        
        -- Price range filter
        AND p.price BETWEEN p_min_price AND p_max_price
        
        -- Seller rating filter
        AND (p_min_rating = 0 OR u.average_seller_rating >= p_min_rating)
    
    ORDER BY search_rank DESC, p.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION fn_search_products IS 
    'Optimized product search with full-text search, ranking, and filtering. 
     Returns products with seller info, images, and relevance score.
     Usage: SELECT * FROM fn_search_products(''laptop'', NULL, ARRAY[''FOR_SALE''], 0, 50000, 4.0, 20, 0)';

-- =====================================================================
-- SECTION 3: SEARCH SUGGESTIONS / AUTOCOMPLETE
-- =====================================================================

-- Function: Get search suggestions based on partial input
CREATE OR REPLACE FUNCTION fn_search_suggestions(
    p_partial_query TEXT,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    suggestion TEXT,
    match_type VARCHAR(20),
    popularity_score INTEGER
) AS $$
BEGIN
    RETURN QUERY
    -- Product name matches
    SELECT DISTINCT
        p.product_name as suggestion,
        'product'::VARCHAR(20) as match_type,
        p.view_count as popularity_score
    FROM products p
    WHERE 
        p.status = 'APPROVED'
        AND p.is_available = TRUE
        AND LOWER(p.product_name) LIKE LOWER(p_partial_query || '%')
    
    UNION ALL
    
    -- Category matches
    SELECT DISTINCT
        c.category_name as suggestion,
        'category'::VARCHAR(20) as match_type,
        c.total_views as popularity_score
    FROM categories c
    WHERE LOWER(c.category_name) LIKE LOWER(p_partial_query || '%')
    
    ORDER BY popularity_score DESC, suggestion
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION fn_search_suggestions IS 
    'Get autocomplete suggestions for search input.
     Usage: SELECT * FROM fn_search_suggestions(''lap'', 5)';

-- =====================================================================
-- SECTION 4: SEARCH ANALYTICS
-- =====================================================================

-- Table: Track search queries for analytics
CREATE TABLE IF NOT EXISTS search_analytics (
    search_id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(user_id),
    search_query TEXT NOT NULL,
    results_count INTEGER,
    filters_applied JSONB,
    clicked_product_id INTEGER REFERENCES products(product_id),
    search_timestamp TIMESTAMPTZ DEFAULT NOW(),
    session_id TEXT
);

CREATE INDEX idx_search_analytics_query ON search_analytics(search_query);
CREATE INDEX idx_search_analytics_timestamp ON search_analytics(search_timestamp DESC);
CREATE INDEX idx_search_analytics_user ON search_analytics(user_id) WHERE user_id IS NOT NULL;

COMMENT ON TABLE search_analytics IS 'Track user search behavior for improving search algorithm';

-- Function: Get popular search terms
CREATE OR REPLACE FUNCTION fn_popular_search_terms(p_days INTEGER DEFAULT 7, p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
    search_term TEXT,
    search_count BIGINT,
    avg_results INTEGER,
    click_through_rate DECIMAL(5, 2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sa.search_query as search_term,
        COUNT(*) as search_count,
        AVG(sa.results_count)::INTEGER as avg_results,
        (COUNT(sa.clicked_product_id)::DECIMAL / NULLIF(COUNT(*), 0) * 100)::DECIMAL(5, 2) as click_through_rate
    FROM search_analytics sa
    WHERE sa.search_timestamp > NOW() - (p_days || ' days')::INTERVAL
    GROUP BY sa.search_query
    HAVING COUNT(*) > 1
    ORDER BY search_count DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================================
-- SECTION 5: PERFORMANCE INDEXES FOR FILTERS
-- =====================================================================

-- Composite index for common filter combinations
CREATE INDEX IF NOT EXISTS idx_products_filter_combo 
    ON products(status, is_available, category_id, listing_type, price) 
    WHERE status = 'APPROVED' AND is_available = TRUE;

-- Index for seller rating filter
CREATE INDEX IF NOT EXISTS idx_users_seller_rating 
    ON users(average_seller_rating) 
    WHERE average_seller_rating >= 4.0;

-- Partial index for available products only
CREATE INDEX IF NOT EXISTS idx_products_available_search 
    ON products(product_name, price, view_count) 
    WHERE status = 'APPROVED' AND is_available = TRUE;

-- =====================================================================
-- SECTION 6: USAGE EXAMPLES
-- =====================================================================

-- Example 1: Simple search by keyword
-- SELECT * FROM fn_search_products('laptop', NULL, NULL, 0, 999999, 0, 20, 0);

-- Example 2: Search with category filter
-- SELECT * FROM fn_search_products('phone', 2, NULL, 0, 999999, 0, 20, 0);

-- Example 3: Search with all filters
-- SELECT * FROM fn_search_products(
--     'gaming',                    -- search query
--     NULL,                        -- any category
--     ARRAY['FOR_SALE'],          -- only FOR_SALE items
--     1000,                        -- min price
--     50000,                       -- max price
--     4.0,                         -- minimum seller rating
--     20,                          -- limit
--     0                            -- offset
-- );

-- Example 4: Browse all products (no search, sorted by popularity)
-- SELECT * FROM fn_search_products('', NULL, NULL, 0, 999999, 0, 50, 0);

-- Example 5: Get autocomplete suggestions
-- SELECT * FROM fn_search_suggestions('lap', 5);

-- Example 6: Get popular search terms
-- SELECT * FROM fn_popular_search_terms(30, 10);

-- =====================================================================
-- SECTION 7: MAINTENANCE
-- =====================================================================

-- Function: Rebuild search vectors (run if search seems outdated)
CREATE OR REPLACE FUNCTION fn_rebuild_search_vectors()
RETURNS TEXT AS $$
BEGIN
    UPDATE products SET search_vector = 
        setweight(to_tsvector('english', COALESCE(product_name, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(description, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE((SELECT category_name FROM categories WHERE category_id = products.category_id), '')), 'C');
    
    RETURN 'Search vectors rebuilt for ' || (SELECT COUNT(*) FROM products) || ' products';
END;
$$ LANGUAGE plpgsql;

-- Function: Clean old search analytics (run monthly)
CREATE OR REPLACE FUNCTION fn_cleanup_search_analytics(p_days_to_keep INTEGER DEFAULT 90)
RETURNS TEXT AS $$
DECLARE
    v_deleted INTEGER;
BEGIN
    DELETE FROM search_analytics
    WHERE search_timestamp < NOW() - (p_days_to_keep || ' days')::INTERVAL;
    
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    
    RETURN 'Cleaned up ' || v_deleted || ' old search records';
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- COMPLETION MESSAGE
-- =====================================================================

DO $$
BEGIN
    RAISE NOTICE '========================================================';
    RAISE NOTICE 'CSU MARKETPLACE - SEARCH OPTIMIZATION COMPLETE';
    RAISE NOTICE '========================================================';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Full-text search indexes created';
    RAISE NOTICE '✅ Search function with ranking: fn_search_products()';
    RAISE NOTICE '✅ Autocomplete function: fn_search_suggestions()';
    RAISE NOTICE '✅ Search analytics table created';
    RAISE NOTICE '✅ Popular search terms function: fn_popular_search_terms()';
    RAISE NOTICE '';
    RAISE NOTICE 'INTEGRATION:';
    RAISE NOTICE '1. Update productService.ts to use fn_search_products()';
    RAISE NOTICE '2. Add search analytics tracking on user searches';
    RAISE NOTICE '3. Implement autocomplete with fn_search_suggestions()';
    RAISE NOTICE '';
    RAISE NOTICE 'PERFORMANCE:';
    RAISE NOTICE '- Full-text search is 10-100x faster than LIKE queries';
    RAISE NOTICE '- GIN indexes optimize search vector lookups';
    RAISE NOTICE '- Composite indexes speed up filtered searches';
    RAISE NOTICE '';
    RAISE NOTICE '========================================================';
END $$;

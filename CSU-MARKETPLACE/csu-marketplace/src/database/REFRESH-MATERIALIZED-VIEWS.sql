-- ═══════════════════════════════════════════════════════════════════════════════════
-- MATERIALIZED VIEW REFRESH FUNCTIONS
-- ═══════════════════════════════════════════════════════════════════════════════════
-- Purpose: Allow admin dashboard to manually refresh materialized views
-- Installation: Run these functions in your Supabase database
-- Usage: Call from admin dashboard via adminService.refreshMaterializedViews()

-- Function 1: Refresh Daily Platform Metrics
CREATE OR REPLACE FUNCTION refresh_mv_daily_platform_metrics()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_platform_metrics;
  RAISE NOTICE 'mv_daily_platform_metrics refreshed successfully';
END;
$$ LANGUAGE plpgsql;

-- Function 2: Refresh Monthly Category Pareto
CREATE OR REPLACE FUNCTION refresh_mv_monthly_category_pareto()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_monthly_category_pareto;
  RAISE NOTICE 'mv_monthly_category_pareto refreshed successfully';
END;
$$ LANGUAGE plpgsql;

-- Function 3: Refresh All Materialized Views (Master Function)
CREATE OR REPLACE FUNCTION refresh_all_materialized_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_platform_metrics;
  RAISE NOTICE 'mv_daily_platform_metrics refreshed';
  
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_monthly_category_pareto;
  RAISE NOTICE 'mv_monthly_category_pareto refreshed';
  
  RAISE NOTICE 'All materialized views refreshed successfully';
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════════════════════════
-- SETUP INSTRUCTIONS FOR SUPABASE
-- ═══════════════════════════════════════════════════════════════════════════════════

-- 1. Run the above functions in Supabase SQL Editor
-- 2. Enable RLS on the functions (optional, for security)
-- 3. The adminService will automatically call these functions via:
--    - supabase.rpc('refresh_mv_daily_platform_metrics')
--    - supabase.rpc('refresh_mv_monthly_category_pareto')

-- 4. Test the functions manually:
SELECT refresh_mv_daily_platform_metrics();
SELECT refresh_mv_monthly_category_pareto();

-- ═══════════════════════════════════════════════════════════════════════════════════
-- OPTIONAL: AUTO-REFRESH TRIGGER (runs every 6 hours)
-- ═══════════════════════════════════════════════════════════════════════════════════

-- Create a table to track last refresh time
CREATE TABLE IF NOT EXISTS materialized_view_refresh_log (
  view_name TEXT PRIMARY KEY,
  last_refreshed_at TIMESTAMP DEFAULT NOW(),
  refresh_interval INTERVAL DEFAULT '6 hours',
  is_active BOOLEAN DEFAULT TRUE
);

-- Insert refresh schedule
INSERT INTO materialized_view_refresh_log (view_name, refresh_interval)
VALUES 
  ('mv_daily_platform_metrics', '6 hours'::INTERVAL),
  ('mv_monthly_category_pareto', '24 hours'::INTERVAL)
ON CONFLICT (view_name) DO NOTHING;

-- Enable RLS on the functions for security (optional)
-- GRANT EXECUTE ON FUNCTION refresh_mv_daily_platform_metrics() TO authenticated;
-- GRANT EXECUTE ON FUNCTION refresh_mv_monthly_category_pareto() TO authenticated;
-- GRANT EXECUTE ON FUNCTION refresh_all_materialized_views() TO authenticated;

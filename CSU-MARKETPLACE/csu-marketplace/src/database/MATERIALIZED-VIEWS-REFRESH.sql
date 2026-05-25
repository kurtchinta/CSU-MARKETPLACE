-- ═══════════════════════════════════════════════════════════════════════════════════
-- MATERIALIZED VIEWS REFRESH FUNCTIONS
-- ═══════════════════════════════════════════════════════════════════════════════════
-- These functions allow manual refresh of materialized views from the application
-- Called via Supabase RPC from the admin dashboard

-- Function 1: Refresh mv_daily_platform_metrics
CREATE OR REPLACE FUNCTION refresh_mv_daily_platform_metrics()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_platform_metrics;
  RAISE NOTICE 'Materialized view mv_daily_platform_metrics refreshed at %', NOW();
EXCEPTION WHEN OTHERS THEN
  -- If CONCURRENTLY fails (view has no unique index), use regular refresh
  REFRESH MATERIALIZED VIEW mv_daily_platform_metrics;
  RAISE NOTICE 'Materialized view mv_daily_platform_metrics refreshed (non-concurrent) at %', NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users (optional - restrict as needed)
GRANT EXECUTE ON FUNCTION refresh_mv_daily_platform_metrics() TO authenticated;

-- Function 2: Refresh mv_monthly_category_pareto
CREATE OR REPLACE FUNCTION refresh_mv_monthly_category_pareto()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_monthly_category_pareto;
  RAISE NOTICE 'Materialized view mv_monthly_category_pareto refreshed at %', NOW();
EXCEPTION WHEN OTHERS THEN
  -- If CONCURRENTLY fails, use regular refresh
  REFRESH MATERIALIZED VIEW mv_monthly_category_pareto;
  RAISE NOTICE 'Materialized view mv_monthly_category_pareto refreshed (non-concurrent) at %', NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users (optional - restrict as needed)
GRANT EXECUTE ON FUNCTION refresh_mv_monthly_category_pareto() TO authenticated;

-- Function 3: Refresh ALL materialized views at once
CREATE OR REPLACE FUNCTION refresh_all_materialized_views()
RETURNS void AS $$
BEGIN
  PERFORM refresh_mv_daily_platform_metrics();
  PERFORM refresh_mv_monthly_category_pareto();
  RAISE NOTICE 'All materialized views refreshed at %', NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION refresh_all_materialized_views() TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════════════
-- COMMENTS
-- ═══════════════════════════════════════════════════════════════════════════════════

COMMENT ON FUNCTION refresh_mv_daily_platform_metrics() IS 
'Manually refresh mv_daily_platform_metrics materialized view. Called from admin dashboard refresh button.';

COMMENT ON FUNCTION refresh_mv_monthly_category_pareto() IS 
'Manually refresh mv_monthly_category_pareto materialized view. Called from admin dashboard refresh button.';

COMMENT ON FUNCTION refresh_all_materialized_views() IS 
'Manually refresh all materialized views. Called from admin dashboard refresh button.';

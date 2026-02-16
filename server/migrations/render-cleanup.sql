-- ============================================================================
-- RENDER DATABASE CLEANUP SCRIPT
-- ============================================================================
-- Purpose: Remove mock cluster-affiliate mappings from production database
-- Run this in your Render PostgreSQL Shell
-- ============================================================================

-- Step 1: Check current mappings
SELECT 'Current mappings before cleanup:' as status;
SELECT cluster, affiliate, created_at 
FROM cluster_affiliate_mapping 
ORDER BY cluster, affiliate;

-- Step 2: Delete mock data
DELETE FROM cluster_affiliate_mapping 
WHERE (cluster = 'Cluster A' AND affiliate IN ('Affiliate 1', 'Affiliate 2'))
   OR (cluster = 'Cluster B' AND affiliate IN ('Affiliate 3', 'Affiliate 4'));

-- Step 3: Verify cleanup
SELECT 'Cleanup completed. Remaining mappings:' as status;
SELECT COUNT(*) as total_mappings FROM cluster_affiliate_mapping;

-- Step 4: Show remaining data (if any)
SELECT cluster, affiliate, created_at 
FROM cluster_affiliate_mapping 
ORDER BY cluster, affiliate;

-- ============================================================================
-- Expected Result:
-- - 4 rows deleted (the mock data)
-- - 0 remaining mappings (unless you've added custom ones)
-- ============================================================================

-- Migration: Remove mock cluster-affiliate mappings
-- This will clear the default mock data (Cluster A/B with Affiliates 1-4)
-- Run this on your database to start fresh

DELETE FROM cluster_affiliate_mapping 
WHERE (cluster = 'Cluster A' AND affiliate IN ('Affiliate 1', 'Affiliate 2'))
   OR (cluster = 'Cluster B' AND affiliate IN ('Affiliate 3', 'Affiliate 4'));

-- Verify the cleanup
SELECT COUNT(*) as remaining_mappings FROM cluster_affiliate_mapping;

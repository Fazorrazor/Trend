# Database Migration: Remove Mock Cluster-Affiliate Mappings

## Overview
This migration removes the default mock data (Cluster A/B with Affiliates 1-4) from the `cluster_affiliate_mapping` table, allowing users to build their organizational structure from scratch.

## Changes Made

### 1. Schema Files Updated
- ✅ `server/src/db/schema.sql` - Removed INSERT statement for mock data
- ✅ `server/dist/db/schema.sql` - Removed INSERT statement for mock data

### 2. Migration Scripts Created
- ✅ `server/migrations/remove-mock-mappings.sql` - SQL migration file
- ✅ `server/clear-mock-data.ts` - Node.js migration script

## How to Apply This Migration

### For Local Development Database

**Option 1: Using npm script (Recommended)**
```bash
cd server
npm run clear-mock-data
```

**Option 2: Using SQL file directly**
```bash
# If you have psql installed
psql -h localhost -p 5432 -U postgres -d trend_analytics -f migrations/remove-mock-mappings.sql
```

### For Render Production Database

1. **Access Render Dashboard**
   - Go to https://dashboard.render.com
   - Select your PostgreSQL database service

2. **Connect to Database Shell**
   - Click on the "Shell" tab or "Connect" button
   - Copy the connection string

3. **Run the Migration**
   
   **Option A: Using Render's Web Shell**
   - In the Shell tab, paste and execute:
   ```sql
   DELETE FROM cluster_affiliate_mapping 
   WHERE (cluster = 'Cluster A' AND affiliate IN ('Affiliate 1', 'Affiliate 2'))
      OR (cluster = 'Cluster B' AND affiliate IN ('Affiliate 3', 'Affiliate 4'));
   
   SELECT COUNT(*) as remaining_mappings FROM cluster_affiliate_mapping;
   ```

   **Option B: Using Local Connection**
   - Copy the External Database URL from Render
   - Update your `.env` file temporarily with Render's database credentials
   - Run: `npm run clear-mock-data`
   - Restore your local `.env` file

4. **Verify the Migration**
   ```sql
   SELECT * FROM cluster_affiliate_mapping;
   ```
   Should return 0 rows if you haven't added any custom mappings yet.

## What This Migration Does

- **Removes**: 4 mock mappings
  - Cluster A → Affiliate 1
  - Cluster A → Affiliate 2
  - Cluster B → Affiliate 3
  - Cluster B → Affiliate 4

- **Preserves**: Any custom mappings you've already created

## After Migration

1. **New Installations**: The schema no longer includes mock data, so fresh databases will start empty
2. **Existing Databases**: Run the migration to clean up mock data
3. **User Experience**: Users will see the "No organizational structure defined" message and can add their own clusters/affiliates

## Deployment Checklist

- [x] Remove mock data from schema files
- [x] Create migration scripts
- [x] Commit changes to Git
- [x] Push to GitHub
- [ ] Run migration on local database (if needed)
- [ ] Run migration on Render database
- [ ] Verify Render deployment updated successfully
- [ ] Test adding new clusters/affiliates through UI

## Rollback (If Needed)

If you need to restore the mock data:

```sql
INSERT INTO cluster_affiliate_mapping (cluster, affiliate) VALUES
  ('Cluster A', 'Affiliate 1'),
  ('Cluster A', 'Affiliate 2'),
  ('Cluster B', 'Affiliate 3'),
  ('Cluster B', 'Affiliate 4')
ON CONFLICT DO NOTHING;
```

## Notes

- This migration is **idempotent** - safe to run multiple times
- The `ON CONFLICT DO NOTHING` clause in the original INSERT has been removed from the schema
- Future database setups will start with an empty `cluster_affiliate_mapping` table

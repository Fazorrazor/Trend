# Deployment Guide: Mock Data Removal

## ✅ Completed Steps

1. **Code Changes**
   - ✅ Removed mock data from `server/src/db/schema.sql`
   - ✅ Removed mock data from `server/dist/db/schema.sql`
   - ✅ Created migration scripts
   - ✅ Added npm script for database cleanup

2. **Git Deployment**
   - ✅ Committed changes to Git
   - ✅ Pushed to GitHub (main branch)

## 🚀 Next Steps for Full Deployment

### Step 1: Verify GitHub Deployment
1. Go to your GitHub repository: https://github.com/Fazorrazor/Trend
2. Verify the latest commits are visible
3. Check that the schema files no longer contain mock data

### Step 2: Update Render Backend

**Automatic Deployment (if enabled):**
- Render should automatically detect the new commits and redeploy
- Check your Render dashboard for deployment status

**Manual Deployment (if needed):**
1. Go to https://dashboard.render.com
2. Select your backend service
3. Click "Manual Deploy" → "Deploy latest commit"
4. Wait for deployment to complete

### Step 3: Clean Mock Data from Render Database

**Option A: Using Render Web Shell (Easiest)**

1. Go to https://dashboard.render.com
2. Navigate to your PostgreSQL database service
3. Click on the "Shell" tab
4. Run this SQL command:

```sql
DELETE FROM cluster_affiliate_mapping 
WHERE (cluster = 'Cluster A' AND affiliate IN ('Affiliate 1', 'Affiliate 2'))
   OR (cluster = 'Cluster B' AND affiliate IN ('Affiliate 3', 'Affiliate 4'));

-- Verify cleanup
SELECT COUNT(*) as remaining_mappings FROM cluster_affiliate_mapping;
```

**Option B: Using External Connection**

1. Get your database connection string from Render
2. Connect using a PostgreSQL client (like pgAdmin, DBeaver, or psql)
3. Run the same SQL commands as above

### Step 4: Verify the Changes

1. **Check Frontend**
   - Visit your deployed app: https://fazorrazor.github.io/Trend/
   - Navigate to Settings → Organizational Structure
   - You should see "No organizational structure defined"

2. **Test Adding New Mappings**
   - Try adding a new cluster and affiliate
   - Verify it saves successfully
   - Refresh the page to confirm persistence

### Step 5: Update Frontend (if needed)

The frontend is deployed to GitHub Pages. To update:

```bash
# In the root directory
npm run build
npm run deploy
```

This will rebuild and deploy the latest frontend code.

## 🔍 Verification Checklist

- [ ] GitHub shows latest commits
- [ ] Render backend redeployed successfully
- [ ] Render database cleaned (no mock data)
- [ ] Frontend shows empty organizational structure
- [ ] Can add new clusters/affiliates successfully
- [ ] Data persists after page refresh

## 🆘 Troubleshooting

### Issue: Render didn't auto-deploy
**Solution:** Manually trigger deployment from Render dashboard

### Issue: Can't access Render database shell
**Solution:** Use the "Connect" button to get connection string, then use a local PostgreSQL client

### Issue: Frontend still shows old data
**Solution:** 
1. Clear browser cache
2. Rebuild and redeploy frontend: `npm run build && npm run deploy`

### Issue: Database connection error
**Solution:** Check that your Render database is running and the connection string is correct

## 📝 Notes

- The schema changes only affect **new** database setups
- Existing databases need the migration script run manually
- The changes are backward compatible - won't break existing functionality
- Users can now build their organizational structure from scratch

## 🎯 Expected Outcome

After completing all steps:
1. New users will start with a clean slate (no mock data)
2. Existing users will see their custom mappings (if any)
3. The mock "Cluster A/B" and "Affiliate 1-4" will be gone
4. Users can add their own organizational structure through the UI

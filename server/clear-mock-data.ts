import { query } from './src/db/index.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
    try {
        console.log('🧹 Removing mock cluster-affiliate mappings...');

        const result = await query(`
      DELETE FROM cluster_affiliate_mapping 
      WHERE (cluster = 'Cluster A' AND affiliate IN ('Affiliate 1', 'Affiliate 2'))
         OR (cluster = 'Cluster B' AND affiliate IN ('Affiliate 3', 'Affiliate 4'))
      RETURNING *
    `);

        console.log(`✅ Removed ${result.rowCount} mock mappings`);

        // Verify cleanup
        const countResult = await query('SELECT COUNT(*) as count FROM cluster_affiliate_mapping');
        console.log(`📊 Remaining mappings: ${countResult.rows[0].count}`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

runMigration();

// config.ts - Load environment variables
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Try multiple paths
const envPath = join(__dirname, '..', '.env');
const result = dotenv.config({ path: envPath });

if (result.error) {
    console.error('❌ Failed to load .env file:', result.error);
    console.log('📁 Tried path:', envPath);
} else {
    console.log('✅ .env file loaded from:', envPath);
}

// Debug: Log all DB env vars
console.log('🔧 ENV Check:', {
    DB_HOST: process.env.DB_HOST,
    DB_PORT: process.env.DB_PORT,
    DB_NAME: process.env.DB_NAME,
    DB_USER: process.env.DB_USER,
    DB_PASSWORD_SET: !!process.env.DB_PASSWORD,
    DB_PASSWORD_LENGTH: process.env.DB_PASSWORD?.length || 0,
    DB_PASSWORD_LAST4: process.env.DB_PASSWORD?.slice(-4) || 'NONE'
});

export { };

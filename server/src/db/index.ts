import pkg from 'pg';
const { Pool } = pkg;
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Lazy pool creation - only create when first accessed
let _pool: pkg.Pool | null = null;

function getPool() {
    if (!_pool) {
        const isProduction = process.env.NODE_ENV === 'production';
        const connectionString = process.env.DATABASE_URL;

        const config: pkg.PoolConfig = connectionString
            ? { connectionString }
            : {
                host: process.env.DB_HOST || 'localhost',
                port: parseInt(process.env.DB_PORT || '5432'),
                database: process.env.DB_NAME || 'trend_analytics',
                user: process.env.DB_USER || 'postgres',
                password: process.env.DB_PASSWORD || 'postgres',
            };

        _pool = new Pool({
            ...config,
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 10000, // Increased to 10s
            ssl: isProduction ? { rejectUnauthorized: false } : false,
        });

        // Debug: Log connection config (mask sensitive info)
        if (connectionString) {
            console.log('📊 Database Config: Using connection string (SSL: ' + (isProduction ? 'YES' : 'NO') + ')');
        } else {
            console.log('📊 Database Config:', {
                host: process.env.DB_HOST || 'localhost',
                port: process.env.DB_PORT || '5432',
                database: process.env.DB_NAME || 'trend_analytics',
                user: process.env.DB_USER || 'postgres',
                password: process.env.DB_PASSWORD ? '***' + process.env.DB_PASSWORD.slice(-4) : 'NOT SET',
                ssl: isProduction ? 'YES' : 'NO'
            });
        }

        // Test connection
        _pool.on('connect', () => {
            console.log('✅ Connected to PostgreSQL database');
        });

        _pool.on('error', (err: any) => {
            console.error('❌ Unexpected error on idle client', err);
            process.exit(-1);
        });
    }
    return _pool;
}

// Export pool getter
export const pool = new Proxy({} as pkg.Pool, {
    get(target, prop) {
        return (getPool() as any)[prop];
    }
});

/**
 * Initialize database schema
 */
export async function initializeDatabase() {
    console.log('Initializing database schema...');

    try {
        // Read schema file
        const schemaPath = join(__dirname, 'schema.sql');
        const schema = readFileSync(schemaPath, 'utf-8');

        // Execute schema
        await getPool().query(schema);

        console.log('✅ Database schema initialized successfully');
    } catch (error) {
        console.error('❌ Failed to initialize database:', error);
        throw error;
    }
}

/**
 * Helper function to execute queries
 */
export async function query(text: string, params?: any[]) {
    const start = Date.now();
    const res = await getPool().query(text, params);
    const duration = Date.now() - start;

    if (process.env.NODE_ENV !== 'production') {
        console.log('Executed query', { text, duration, rows: res.rowCount });
    }

    return res;
}

/**
 * Get a client from the pool for transactions
 */
export async function getClient() {
    const client = await getPool().connect();
    return client;
}

// Graceful shutdown
process.on('exit', () => {
    if (_pool) _pool.end();
});

process.on('SIGINT', async () => {
    if (_pool) await _pool.end();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    if (_pool) await _pool.end();
    process.exit(0);
});

export default pool;

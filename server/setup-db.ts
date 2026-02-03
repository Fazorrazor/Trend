#!/usr/bin/env node

/**
 * Database Setup Script
 * Creates the PostgreSQL database and initializes the schema
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config();

const DB_NAME = process.env.DB_NAME || 'trend_analytics';
const DB_USER = process.env.DB_USER || 'postgres';
const DB_PASSWORD = process.env.DB_PASSWORD || 'postgres';
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = parseInt(process.env.DB_PORT || '5432');

async function setupDatabase() {
    console.log('🚀 Starting database setup...\n');

    // Connect to postgres database to create our database
    const adminClient = new Client({
        host: DB_HOST,
        port: DB_PORT,
        user: DB_USER,
        password: DB_PASSWORD,
        database: 'postgres', // Connect to default postgres database
    });

    try {
        await adminClient.connect();
        console.log('✅ Connected to PostgreSQL');

        // Check if database exists
        const checkDb = await adminClient.query(
            `SELECT 1 FROM pg_database WHERE datname = $1`,
            [DB_NAME]
        );

        if (checkDb.rows.length === 0) {
            // Create database
            console.log(`📦 Creating database: ${DB_NAME}...`);
            await adminClient.query(`CREATE DATABASE ${DB_NAME}`);
            console.log(`✅ Database created: ${DB_NAME}`);
        } else {
            console.log(`ℹ️  Database already exists: ${DB_NAME}`);
        }

        await adminClient.end();

        // Connect to the new database and run schema
        const dbClient = new Client({
            host: DB_HOST,
            port: DB_PORT,
            user: DB_USER,
            password: DB_PASSWORD,
            database: DB_NAME,
        });

        await dbClient.connect();
        console.log(`✅ Connected to database: ${DB_NAME}`);

        // Read and execute schema
        const schemaPath = join(__dirname, 'src', 'db', 'schema.sql');
        const schema = readFileSync(schemaPath, 'utf-8');

        console.log('📝 Executing schema...');
        await dbClient.query(schema);
        console.log('✅ Schema initialized successfully');

        // Verify tables
        const tables = await dbClient.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

        console.log('\n📊 Created tables:');
        tables.rows.forEach((row) => {
            console.log(`   - ${row.table_name}`);
        });

        await dbClient.end();

        console.log('\n✅ Database setup complete!');
        console.log('\n🎯 Next steps:');
        console.log('   1. Start the server: npm run dev');
        console.log('   2. Test the API: curl http://localhost:4000/health');
        console.log('   3. Register a user: POST /api/auth/register\n');

    } catch (error: any) {
        console.error('\n❌ Error setting up database:', error.message);

        if (error.code === 'ECONNREFUSED') {
            console.error('\n💡 Troubleshooting:');
            console.error('   - Ensure PostgreSQL is running');
            console.error('   - Check connection settings in .env file');
            console.error('   - Verify PostgreSQL is listening on port', DB_PORT);
        } else if (error.code === '28P01') {
            console.error('\n💡 Authentication failed:');
            console.error('   - Check DB_USER and DB_PASSWORD in .env file');
            console.error('   - Verify PostgreSQL authentication settings');
        }

        process.exit(1);
    }
}

setupDatabase();

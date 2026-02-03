# Trend Analytics Backend - PostgreSQL Setup Guide

## Prerequisites

1. **PostgreSQL** installed and running
   - Download from: https://www.postgresql.org/download/
   - Or use Docker: `docker run --name trend-postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres`

2. **Node.js** (v18 or higher)

## Setup Steps

### 1. Install Dependencies

```bash
cd server
npm install
```

### 2. Create Database

Connect to PostgreSQL and create the database:

```bash
# Using psql
psql -U postgres

# In psql:
CREATE DATABASE trend_analytics;
\q
```

Or using pgAdmin or any PostgreSQL client.

### 3. Configure Environment

The `.env` file is already created with default values:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=trend_analytics
DB_USER=postgres
DB_PASSWORD=postgres
```

**Update the password** if your PostgreSQL has a different password.

### 4. Initialize Database Schema

The schema will be automatically initialized when you first start the server.

Alternatively, you can manually run the schema:

```bash
psql -U postgres -d trend_analytics -f src/db/schema.sql
```

### 5. Start the Server

```bash
# Development mode (with hot reload)
npm run dev

# Production mode
npm run build
npm start
```

The server will start on `http://localhost:4000`

## Testing the API

### Health Check

```bash
curl http://localhost:4000/health
```

### Register a User

```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "password123",
    "full_name": "Admin User"
  }'
```

### Login

```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "password123"
  }'
```

Save the returned `token` for authenticated requests.

### Get Profile (Authenticated)

```bash
curl http://localhost:4000/api/users/profile \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Database Management

### View Tables

```sql
\dt
```

### Check Data

```sql
SELECT * FROM user_profiles;
SELECT * FROM data_imports;
SELECT * FROM ticket_data LIMIT 10;
```

### Reset Database

```sql
DROP DATABASE trend_analytics;
CREATE DATABASE trend_analytics;
```

Then restart the server to reinitialize the schema.

## Troubleshooting

### Connection Error

If you get "connection refused":
- Ensure PostgreSQL is running: `pg_ctl status` or check services
- Verify the port: PostgreSQL default is 5432
- Check firewall settings

### Authentication Error

If you get "password authentication failed":
- Update `.env` with correct PostgreSQL password
- Check `pg_hba.conf` for authentication method

### Schema Errors

If tables don't exist:
- Manually run: `psql -U postgres -d trend_analytics -f src/db/schema.sql`
- Check server logs for initialization errors

## Next Steps

1. Update the frontend to use the new API endpoints
2. Test data import functionality
3. Configure production environment variables
4. Set up database backups

## Production Deployment

For production:

1. Use environment variables for sensitive data
2. Enable SSL for PostgreSQL connections
3. Set up connection pooling limits
4. Configure proper logging
5. Use a process manager like PM2
6. Set up database backups

```bash
# Example PM2 setup
npm install -g pm2
pm2 start dist/index.js --name trend-backend
pm2 save
pm2 startup
```

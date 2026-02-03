# 🚀 Quick Start Guide

## Prerequisites Check

```bash
# Check Node.js version (need v18+)
node --version

# Check if PostgreSQL is installed
psql --version

# Check if PostgreSQL is running
# Windows:
Get-Service postgresql*

# Or check if port 5432 is listening
netstat -an | findstr 5432
```

## Installation (5 Minutes)

### 1. Install Dependencies
```bash
cd server
npm install
```

### 2. Setup Database (Automated)
```bash
# This will create the database and initialize the schema
npm run setup-db
```

**OR manually:**
```bash
# Create database
psql -U postgres -c "CREATE DATABASE trend_analytics;"

# Run schema
psql -U postgres -d trend_analytics -f src/db/schema.sql
```

### 3. Configure Environment
Edit `.env` file if needed (already created with defaults):
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=trend_analytics
DB_USER=postgres
DB_PASSWORD=postgres  # ⚠️ Change this if different
```

### 4. Start Server
```bash
npm run dev
```

Server will start on: **http://localhost:4000**

## Quick Test

### 1. Health Check
```bash
curl http://localhost:4000/health
```

Expected response:
```json
{"status":"ok","timestamp":"2026-02-03T..."}
```

### 2. Register User
```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@example.com\",\"password\":\"password123\",\"full_name\":\"Admin User\"}"
```

Save the `token` from response!

### 3. Get Profile (with token)
```bash
curl http://localhost:4000/api/users/profile \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Common Commands

```bash
# Development (with hot reload)
npm run dev

# Build for production
npm run build

# Run production
npm start

# Setup/Reset database
npm run setup-db
```

## Troubleshooting

### ❌ "ECONNREFUSED" Error
**Problem:** Can't connect to PostgreSQL

**Solutions:**
1. Start PostgreSQL service
2. Check if running on port 5432: `netstat -an | findstr 5432`
3. Verify credentials in `.env`

### ❌ "password authentication failed"
**Problem:** Wrong PostgreSQL password

**Solutions:**
1. Update `DB_PASSWORD` in `.env`
2. Reset PostgreSQL password if needed

### ❌ "database does not exist"
**Problem:** Database not created

**Solutions:**
```bash
# Run setup script
npm run setup-db

# Or manually create
psql -U postgres -c "CREATE DATABASE trend_analytics;"
```

### ❌ Port 4000 already in use
**Problem:** Another process using port 4000

**Solutions:**
1. Change `PORT` in `.env`
2. Or kill the process using port 4000

## API Endpoints Reference

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Tickets
- `GET /api/tickets?limit=100&offset=0` - List tickets
- `POST /api/tickets/batch` - Batch insert
- `GET /api/tickets/:id` - Get one ticket
- `DELETE /api/tickets?import_id=xxx` - Delete by import

### Imports
- `GET /api/imports` - List imports
- `POST /api/imports` - Create import
- `DELETE /api/imports/:id` - Delete import

### Users
- `GET /api/users/profile` - Get profile
- `PUT /api/users/profile` - Update profile
- `GET /api/users/activity` - Activity log

### Analytics
- `GET /api/analytics/key-findings` - Get findings
- `POST /api/analytics/key-findings` - Create finding
- `GET /api/analytics/detailed-analysis` - Get analysis
- `POST /api/analytics/detailed-analysis` - Save analysis

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 4000 | Server port |
| `NODE_ENV` | development | Environment |
| `DB_HOST` | localhost | PostgreSQL host |
| `DB_PORT` | 5432 | PostgreSQL port |
| `DB_NAME` | trend_analytics | Database name |
| `DB_USER` | postgres | Database user |
| `DB_PASSWORD` | postgres | Database password |
| `JWT_SECRET` | (auto) | JWT signing key |
| `JWT_EXPIRES_IN` | 7d | Token expiration |
| `CORS_ORIGIN` | http://localhost:5173 | Allowed origin |

## Next Steps

1. ✅ Backend is ready
2. ⏭️ Update frontend to use new API
3. ⏭️ Test data import functionality
4. ⏭️ Deploy to production

## Need Help?

- 📖 Detailed setup: [SETUP.md](./SETUP.md)
- 📋 Full documentation: [README.md](./README.md)
- 🔄 Migration info: [MIGRATION_SUMMARY.md](./MIGRATION_SUMMARY.md)

---

**Status:** ✅ Ready to use!

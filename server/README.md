# Trend Analytics Backend

Custom Node.js/Express backend for the Trend Analytics System.

## Features

- ✅ **JWT Authentication** - Secure user authentication with bcrypt password hashing
- ✅ **PostgreSQL Database** - Production-ready relational database with connection pooling
- ✅ **RESTful API** - Clean, organized API endpoints
- ✅ **Batch Processing** - Efficient transaction-based batch inserts
- ✅ **Security** - Helmet, CORS, rate limiting
- ✅ **TypeScript** - Full type safety

## Quick Start

### Prerequisites

- Node.js v18+
- PostgreSQL 12+ (running locally or remote)

### Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and update values:

```bash
cp .env.example .env
```

### 3. Start Development Server

```bash
npm run dev
```

The server will start on `http://localhost:4000`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Data Imports
- `GET /api/imports` - List all imports
- `POST /api/imports` - Create import record
- `GET /api/imports/:id` - Get specific import
- `DELETE /api/imports/:id` - Delete import

### Tickets
- `GET /api/tickets` - List tickets (with pagination & filters)
- `POST /api/tickets/batch` - Batch insert tickets
- `GET /api/tickets/:id` - Get specific ticket
- `DELETE /api/tickets` - Delete tickets by import_id

### Users
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `GET /api/users/activity` - Get activity log
- `POST /api/users/activity` - Log activity

### Analytics
- `GET /api/analytics/key-findings` - Get key findings
- `POST /api/analytics/key-findings` - Create key finding
- `DELETE /api/analytics/key-findings/:id` - Delete finding
- `GET /api/analytics/detailed-analysis` - Get analysis
- `POST /api/analytics/detailed-analysis` - Create/update analysis

## Database

PostgreSQL database with automatic schema initialization.

**Create the database first:**
```bash
psql -U postgres -c "CREATE DATABASE trend_analytics;"
```

The schema will be automatically initialized when the server starts.

For detailed setup instructions, see [SETUP.md](./SETUP.md)

## Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server

## Security

- JWT tokens for authentication
- Bcrypt password hashing (10 rounds)
- Helmet for HTTP headers security
- CORS protection
- Rate limiting (100 requests per 15 minutes)

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL (pg client)
- **Auth**: JWT + bcrypt

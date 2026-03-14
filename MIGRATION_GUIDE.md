# Database Migration Guide for Vercel Deployment

## Problem
Vercel doesn't automatically run database migrations during deployment. You need to handle database schema setup manually.

## Solutions

### Option 1: Schema Deployment + Migration Endpoints (Recommended)

We've created two endpoints to handle database setup:

#### **Step 1: Deploy Database Schema**
**GET /api/deploy-schema** - Create database tables and schema (Serverless-friendly)
```bash
curl https://your-vercel-app.vercel.app/api/deploy-schema
```

This endpoint:
- ✅ Uses Prisma Client with raw SQL (no shell commands)
- ✅ Works within Vercel serverless constraints
- ✅ Creates tables directly with CREATE TABLE statements
- ✅ Checks database connection and existing schema
- ✅ Returns current data counts
- ✅ Handles both schema creation and verification

#### **Step 2: Migrate/Seed Data** 
**GET /api/migrate** - Check database status and seed if empty
```bash
curl https://your-vercel-app.vercel.app/api/migrate
```

**POST /api/migrate** - Force reset and reseed database
```bash
curl -X POST https://your-vercel-app.vercel.app/api/migrate
```

### Option 2: Manual Database Setup (Production)

1. **Set up your production database** (MySQL on PlanetScale, Supabase, etc.)

2. **Run schema deployment:**
```bash
npx prisma db push --accept-data-loss
```

3. **Generate Prisma client:**
```bash
npx prisma generate
```

4. **Seed initial data (optional):**
```bash
npx prisma db seed
```

### Option 3: Build-time Migration (Automatic)

Set your Vercel build command to:
```bash
prisma db push && prisma generate && next build
```

Or use the npm script:
```bash
npm run build:vercel
```

## Environment Variables for Vercel

Make sure you set these in your Vercel dashboard:

```env
DATABASE_URL="mysql://username:password@host:port/database"
NODE_ENV="production"
```

## Database Schema

The application expects these tables:
- `categories` - Income/Expense categories
- `transactions` - Financial transactions linked to categories

Both tables are defined in `prisma/schema.prisma`

## Troubleshooting

### If you get "Table doesn't exist" errors:
1. Use the `/api/migrate` endpoint to check database status
2. Run `prisma db push` manually to create tables
3. Check your DATABASE_URL is correct

### If you get "Empty database" warnings:
1. Call `POST /api/migrate` to seed initial data
2. Or manually run `npx prisma db seed`

### For fresh deployment:
1. Deploy to Vercel
2. Visit `https://your-app.vercel.app/api/migrate`
3. Check response - should create tables and seed data automatically

## Migration Endpoint Response Format

```json
{
  "success": true,
  "message": "Database migration completed successfully",
  "data": {
    "categoriesCount": 8,
    "transactionsCount": 10,
    "status": "seeded" // or "existing"
  }
}
```

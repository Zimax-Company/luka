# Laravel-Style Database Migration Guide

## Overview
This application now uses a Laravel-style migration system that tracks and versions database changes. This approach preserves production data while allowing for incremental schema updates.

## Migration System Features

- ✅ **Versioned Migrations**: Each migration has a unique ID and timestamp
- ✅ **Batch Tracking**: Migrations are grouped in batches for easy rollback
- ✅ **Production Safe**: Only runs unexecuted migrations
- ✅ **Rollback Support**: Can rollback the last batch of migrations
- ✅ **Migration Status**: Check which migrations have been run
- ✅ **No Data Loss**: Schema-only changes, preserves existing data

## Migration Commands

### CLI Commands (Development)
```bash
# Check migration status
npm run migrate:status

# Run pending migrations
npm run migrate:run

# Rollback last batch
npm run migrate:rollback

# Create new migration file
npm run migrate:make create_users_table
```

### API Endpoints (Production)

#### **Check Migration Status**
**GET /api/migrate** - Check what migrations are pending/executed
```bash
curl https://your-app.vercel.app/api/migrate
```

Response:
```json
{
  "success": true,
  "data": {
    "status": {
      "total": 3,
      "executed": 2,
      "pending": 1,
      "lastBatch": 2
    },
    "pendingMigrations": [
      {
        "id": "003_add_user_preferences",
        "description": "Add user preferences table"
      }
    ],
    "executedMigrations": [
      "001_create_migrations_table",
      "002_create_categories_table"
    ],
    "upToDate": false
  }
}
```

#### **Run Pending Migrations**
**POST /api/migrate** - Execute unrun migrations
```bash
curl -X POST https://your-app.vercel.app/api/migrate
```

#### **Rollback Last Batch**
**POST /api/migrate/rollback** - Rollback last batch of migrations
```bash
curl -X POST https://your-app.vercel.app/api/migrate/rollback
```

## Migration Workflow

### Development Workflow
1. **Create Migration**: `npm run migrate:make create_new_feature_table`
2. **Edit Migration**: Add your `up()` and `down()` logic to the generated file
3. **Run Migration**: `npm run migrate:run`
4. **Check Status**: `npm run migrate:status`

### Production Deployment Workflow
1. **Deploy Code**: Deploy to Vercel with new migration files
2. **Run Migrations**: `curl -X POST https://your-app.vercel.app/api/migrate`
3. **Verify**: `curl https://your-app.vercel.app/api/migrate` (check status)

### Rollback Workflow
If something goes wrong:
```bash
# Development
npm run migrate:rollback

# Production
curl -X POST https://your-app.vercel.app/api/migrate/rollback
```

## Migration File Structure

Each migration file follows this pattern:
```typescript
/**
 * Migration: Create users table
 * Created: 2026-03-14
 */

export const migration = {
  id: '20260314120000_create_users_table',
  description: 'Create users table with authentication fields',
  
  async up(prisma: any) {
    console.log('📊 Creating users table...');
    
    await prisma.$executeRaw`
      CREATE TABLE users (
        id VARCHAR(191) NOT NULL PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
      )
    `;
    
    console.log('✅ Users table created');
  },
  
  async down(prisma: any) {
    console.log('🗑️ Dropping users table...');
    await prisma.$executeRaw`DROP TABLE IF EXISTS users`;
    console.log('✅ Users table dropped');
  }
};
```

## Migration Tracking

The system uses a `migrations` table to track:
- **id**: Unique migration identifier
- **batch**: Batch number for grouping related migrations
- **executed_at**: When the migration was executed

This ensures:
- Migrations run only once
- Rollbacks affect the correct group
- Production data is preserved
- Schema changes are versioned

## Existing Migration Files

The system comes with these initial migrations:
1. `001_create_migrations_table.ts` - Creates the migration tracking table
2. `002_create_categories_table.ts` - Creates the categories table
3. `003_create_transactions_table.ts` - Creates the transactions table

## Benefits over Traditional Approaches

✅ **Production Safe**: Only unrun migrations execute
✅ **Data Preservation**: Existing data is never touched
✅ **Version Control**: All schema changes are tracked in code
✅ **Team Collaboration**: Migrations are shared via git
✅ **Rollback Capability**: Easy to undo problematic changes
✅ **Environment Consistency**: Same schema across dev/staging/production

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
2. Visit `https://your-app.vercel.app/api/deploy-schema` - creates database tables
3. Visit `https://your-app.vercel.app/api/migrate` - checks schema status
4. Start using the app - create categories and transactions as needed

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

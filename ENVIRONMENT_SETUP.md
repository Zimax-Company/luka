# Environment Variables Configuration Guide

## Local Development

### Setup
1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Update `.env.local` with your local database credentials:
   ```bash
   DATABASE_URL="mysql://root:your_password@localhost:3306/luka_categories"
   NODE_ENV=development
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

### File Structure
- `.env` - Default/fallback values (committed to git)
- `.env.local` - Local development secrets (NOT committed to git)
- `.env.example` - Template file (committed to git)

## Vercel Production Deployment

### Required Environment Variables

Set these in your Vercel dashboard under Project Settings → Environment Variables:

#### Database Configuration
```
DATABASE_URL = mysql://username:password@production-host:3306/database_name
```

#### Environment Settings
```
NODE_ENV = production
```

#### Public Variables (accessible in browser)
```
NEXT_PUBLIC_APP_URL = https://your-app-name.vercel.app
```

### Setting Environment Variables in Vercel

1. **Via Vercel Dashboard:**
   - Go to your project dashboard
   - Navigate to Settings → Environment Variables
   - Add each variable with its value
   - Set the environment (Production, Preview, Development)

2. **Via Vercel CLI:**
   ```bash
   vercel env add DATABASE_URL
   vercel env add NODE_ENV
   vercel env add NEXT_PUBLIC_APP_URL
   ```

3. **Via GitHub Integration:**
   - Vercel will automatically use environment variables set in the dashboard
   - Variables are encrypted and secure

### Database Options for Production

#### Option 1: PlanetScale (Recommended)
- Free tier available
- Serverless MySQL platform
- Easy Vercel integration
- Format: `mysql://username:password@host.planetscale.com/database?ssl={"rejectUnauthorized":true}`

#### Option 2: Railway
- PostgreSQL or MySQL
- Simple setup with Vercel
- Format: `mysql://user:password@host.railway.app:port/database`

#### Option 3: AWS RDS
- Enterprise solution
- Format: `mysql://user:password@instance.region.rds.amazonaws.com:3306/database`

## Environment Variable Loading Order

Next.js loads environment variables in this order:
1. `process.env`
2. `.env.$(NODE_ENV).local`
3. `.env.local` (Not loaded when NODE_ENV is test)
4. `.env.$(NODE_ENV)`
5. `.env`

## Security Best Practices

### ✅ Do:
- Use `.env.local` for local secrets
- Prefix public variables with `NEXT_PUBLIC_`
- Set production variables in Vercel dashboard
- Use strong, unique database passwords
- Regularly rotate database credentials

### ❌ Don't:
- Commit `.env.local` to git
- Put secrets in `.env` files that are committed
- Use production credentials locally
- Share environment files in public repositories

## Verification

### Local Development
```bash
# Check environment variables are loaded
npm run dev
# Look for console output showing environment configuration
```

### Production Deployment
```bash
# Deploy with environment variables
vercel --prod
# Check deployment logs for environment validation
```

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Verify DATABASE_URL format
   - Check database server is running
   - Ensure network connectivity

2. **Environment Variables Not Loading**
   - Check file naming (.env.local not .env-local)
   - Restart development server
   - Verify variable names (case sensitive)

3. **Vercel Deployment Issues**
   - Check environment variables are set in Vercel dashboard
   - Verify build logs for errors
   - Ensure NEXT_PUBLIC_ prefix for client-side variables

### Debug Commands
```bash
# Check current environment
echo $NODE_ENV

# Test database connection
npm run db:test

# View environment variables (be careful with secrets)
printenv | grep DATABASE
```

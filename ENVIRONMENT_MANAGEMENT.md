# Environment Management Guide

## Quick Start Commands

### Local Development (NODE_ENV=development)

#### Option 1: Docker Compose (Recommended)
```bash
# Start development environment with MySQL
docker-compose up app-dev mysql

# Or start in background
docker-compose up -d app-dev mysql

# View logs
docker-compose logs -f app-dev

# Stop
docker-compose down
```

#### Option 2: Development Dockerfile
```bash
# Build and run development container
docker build -f Dockerfile.dev -t luka-app:dev .
docker run -d -p 3000:3000 --name luka-dev \
  --env-file .env.development \
  luka-app:dev
```

#### Option 3: Local npm (No Docker)
```bash
# Copy environment file
cp .env.development .env.local

# Start development server
npm run dev
```

### Production Testing (NODE_ENV=production)

#### Test Production Build Locally
```bash
# Option 1: Docker Compose
docker-compose up app-prod mysql

# Option 2: Manual Docker
docker build -t luka-app:prod .
docker run -d -p 3001:3000 --name luka-prod \
  --env-file .env.production \
  luka-app:prod
```

### Environment Verification

Check which environment your app is running in:

```bash
# Check environment endpoint
curl http://localhost:3000/api/env-check | jq '.environment'

# Expected responses:
# Development: { "NODE_ENV": "development", "IS_PRODUCTION": false }
# Production: { "NODE_ENV": "production", "IS_PRODUCTION": true }
```

## File Structure

```
├── .env.example          # Template (committed)
├── .env.development      # Development defaults (committed)
├── .env.production       # Production template (committed)
├── .env.local           # Local overrides (NOT committed)
├── Dockerfile           # Production container
├── Dockerfile.dev       # Development container
└── docker-compose.yml   # Multi-environment orchestration
```

## Environment-Specific Behavior

Your app will behave differently based on NODE_ENV:

### Development Mode
- Hot reload enabled
- Detailed error messages
- Debug logging
- Development database
- Local API URLs

### Production Mode
- Optimized build
- Minimal error messages
- Production logging
- Production database
- Production API URLs

## Migration Workflow by Environment

### Development
```bash
# Check migration status
curl http://localhost:3000/api/migrate

# Run migrations
curl -X POST http://localhost:3000/api/migrate

# Rollback if needed
curl -X POST http://localhost:3000/api/migrate/rollback
```

### Production
```bash
# Check migration status
curl https://your-app.vercel.app/api/migrate

# Run migrations
curl -X POST https://your-app.vercel.app/api/migrate

# Rollback if needed
curl -X POST https://your-app.vercel.app/api/migrate/rollback
```

## Troubleshooting

### Wrong Environment Detected
If you see production environment when expecting development:

1. **Check container command:**
   ```bash
   docker ps
   # Look for CMD - should be "npm run dev" for development
   ```

2. **Check environment variables:**
   ```bash
   docker exec <container-name> env | grep NODE_ENV
   ```

3. **Force environment override:**
   ```bash
   docker run -e NODE_ENV=development ...
   ```

### Database Connection Issues
- Development: Uses local MySQL (localhost:3306)
- Production: Uses external database (check Vercel env vars)

### Port Conflicts
- Development: http://localhost:3000
- Production test: http://localhost:3001

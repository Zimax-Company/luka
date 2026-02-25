# Luka - Next.js Docker App

A Next.js application with Docker containerization for local development and Vercel deployment.

## Features

- Next.js 16+ with TypeScript
- Docker containerization for local development
- Hello World API endpoint
- **Categories CRUD API** with INCOME/EXPENSE types
- Ready for Vercel deployment

## Local Development

### Using Docker

1. Build and run the production container:
```bash
docker build -t luka .
docker run -p 3000:3000 luka
```

2. Or use docker-compose:
```bash
docker-compose up nextjs-app
```

### API Endpoints

#### Hello World API
- **GET /api/hello** - Returns a hello world message with timestamp
- **POST /api/hello** - Accepts JSON data and returns it with a hello message

#### Categories CRUD API
- **GET /api/categories** - Get all categories
- **GET /api/categories/{id}** - Get category by ID
- **POST /api/categories** - Create new category
- **PUT /api/categories/{id}** - Update category
- **DELETE /api/categories/{id}** - Delete category

See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for detailed API documentation.

Example:
```bash
# Test Hello World endpoint
curl http://localhost:3000/api/hello

# Test Categories API
curl http://localhost:3000/api/categories

# Create a new category
curl -X POST http://localhost:3000/api/categories \
  -H "Content-Type: application/json" \
  -d '{"name": "Rent", "type": "EXPENSE"}'
```

## Vercel Deployment

This Next.js application is optimized for deployment on Vercel:

### Option 1: Deploy with Git Integration
1. Push your code to GitHub/GitLab/Bitbucket
2. Connect your repository to Vercel at [vercel.com](https://vercel.com)
3. Vercel will automatically detect Next.js and deploy

### Option 2: Deploy with Vercel CLI
1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Login to Vercel:
```bash
vercel login
```

3. Deploy from your project directory:
```bash
vercel
```

4. Follow the prompts to configure your deployment

### Environment Variables
For production deployment, you may want to set environment variables in the Vercel dashboard:
- `NODE_ENV=production` (automatically set by Vercel)
- Add any custom environment variables your app needs

### Automatic Deployments
- Every push to your main branch triggers a production deployment
- Pull requests create preview deployments
- Built-in CI/CD with zero configuration

### Custom Domain
You can add a custom domain in the Vercel dashboard under your project settings.

See [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) for detailed deployment instructions.

## Project Structure

```
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── hello/
│   │   │   │   └── route.ts         # Hello World API endpoint
│   │   │   └── categories/
│   │   │       ├── route.ts         # Categories CRUD endpoints
│   │   │       └── [id]/
│   │   │           └── route.ts     # Category by ID endpoints
│   │   ├── page.tsx                 # Home page
│   │   └── layout.tsx               # Root layout
│   ├── types/
│   │   └── category.ts              # Category interfaces
│   └── services/
│       └── categoryService.ts       # Category business logic
├── Dockerfile                       # Production Docker image
├── docker-compose.yml               # Local development
├── API_DOCUMENTATION.md             # Detailed API docs
└── README.md
```

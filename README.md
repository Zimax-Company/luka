# Luka - Next.js Docker App

A Next.js application with Docker containerization for both local development and AWS Fargate deployment.

## Features

- Next.js 16+ with TypeScript
- Docker containerization
- Hello World API endpoint
- **Categories CRUD API** with INCOME/EXPENSE types
- Ready for AWS Fargate deployment

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

## AWS Fargate Deployment

This Docker image is ready for deployment to AWS Fargate:

1. Build and push to ECR:
```bash
# Tag for ECR
docker tag luka:latest your-account.dkr.ecr.region.amazonaws.com/luka:latest

# Push to ECR
docker push your-account.dkr.ecr.region.amazonaws.com/luka:latest
```

2. Create Fargate task definition with:
   - Image: `your-account.dkr.ecr.region.amazonaws.com/luka:latest`
   - Port mapping: 3000
   - Environment: `NODE_ENV=production`

3. Deploy to ECS service

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

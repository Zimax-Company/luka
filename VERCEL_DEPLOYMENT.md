# Vercel Deployment Guide for Luka

This guide will help you deploy your Next.js Categories CRUD API to Vercel.

## Prerequisites

- A Vercel account (free at [vercel.com](https://vercel.com))
- Git repository (GitHub, GitLab, or Bitbucket)

## Deployment Methods

### Method 1: Git Integration (Recommended)

1. **Push your code to Git repository:**
```bash
git init
git add .
git commit -m "Initial commit with Categories CRUD API"
git remote add origin https://github.com/yourusername/luka.git
git push -u origin main
```

2. **Connect to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Click "Import Project"
   - Select your Git provider and repository
   - Click "Deploy"

3. **Automatic Configuration:**
   - Vercel automatically detects Next.js
   - No additional configuration needed
   - Your app will be deployed to a `.vercel.app` URL

### Method 2: Vercel CLI

1. **Install Vercel CLI:**
```bash
npm install -g vercel
```

2. **Login to Vercel:**
```bash
vercel login
```

3. **Deploy:**
```bash
vercel
```

4. **Follow the prompts:**
   - Set up and deploy? Y
   - Which scope? (select your account)
   - Link to existing project? N
   - What's your project's name? luka
   - In which directory is your code located? ./

## Testing Your Deployment

After deployment, test your API endpoints:

```bash
# Replace YOUR_VERCEL_URL with your actual Vercel URL
export VERCEL_URL="https://your-app-name.vercel.app"

# Test Hello World API
curl $VERCEL_URL/api/hello

# Test Categories API
curl $VERCEL_URL/api/categories

# Create a new category
curl -X POST $VERCEL_URL/api/categories \
  -H "Content-Type: application/json" \
  -d '{"name": "Rent", "type": "EXPENSE"}'
```

## Environment Variables

If you need to add environment variables:

1. Go to your Vercel dashboard
2. Select your project
3. Go to "Settings" → "Environment Variables"
4. Add your variables for Production, Preview, and Development

## Custom Domain

To add a custom domain:

1. Go to your project in Vercel dashboard
2. Click "Settings" → "Domains"
3. Add your custom domain
4. Follow DNS configuration instructions

## Automatic Deployments

- **Production**: Every push to `main` branch
- **Preview**: Every pull request creates a preview deployment
- **Development**: Use `vercel dev` for local development with Vercel environment

## Vercel Features Used

- ✅ Automatic Next.js detection
- ✅ Serverless Functions for API routes
- ✅ Global CDN for fast response times
- ✅ Automatic HTTPS
- ✅ Preview deployments for PRs
- ✅ Built-in analytics and monitoring

## Project Structure on Vercel

```
Your Vercel Deployment:
├── src/app/api/hello/route.ts → /api/hello
├── src/app/api/categories/route.ts → /api/categories
├── src/app/api/categories/[id]/route.ts → /api/categories/{id}
└── src/app/page.tsx → / (homepage)
```

## Troubleshooting

### Build Errors
- Check build logs in Vercel dashboard
- Ensure all TypeScript errors are resolved
- Verify all dependencies are in package.json

### API Issues
- Check Function logs in Vercel dashboard
- Serverless functions have execution time limits
- Consider memory usage for large datasets

### Performance
- Use Vercel Analytics to monitor performance
- Consider implementing caching for API responses
- Monitor cold start times for serverless functions

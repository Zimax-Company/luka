# Deployment

Luka deploys to **Vercel** (primary) and can also run as a **Docker** container.

## Build

The build command (used by both `npm run build` and Vercel) is:

```
prisma generate && next build
```

`build:vercel` is an identical alias. `.npmrc` sets `legacy-peer-deps=true`, so
installs tolerate React 19 peer-dependency ranges.

## Vercel

### Git integration (recommended)

1. Push the repo to GitHub/GitLab/Bitbucket.
2. At [vercel.com](https://vercel.com): **Import Project** → select the repo →
   **Deploy**. Vercel auto-detects Next.js.
3. From then on: every push to `main` is a Production deploy; every pull request
   gets a Preview deploy.

### CLI

```bash
npm install -g vercel
vercel login
vercel            # first run: set up & link the project
vercel --prod     # deploy to production
vercel logs       # view logs
```

### What `vercel.json` configures

- `framework: nextjs`, `buildCommand: npm run build`
- Routes all `/api/*` requests to the API functions
- Pins `NODE_ENV=production`

### Required production env vars

Set these in the Vercel dashboard (see [ENVIRONMENT.md](./ENVIRONMENT.md)):

- **`DATABASE_URL`** — or the `DB_USER` / `DB_PASSWORD` / `DB_HOST` / `DB_NAME` /
  `DB_PORT` component set (`src/lib/env.ts` will assemble the URL).
- **`NEXT_PUBLIC_APP_URL`** *(optional)* — your deployed URL,
  e.g. `https://<your-app>.vercel.app`.
- `NODE_ENV` is already set by `vercel.json` — no need to add it.

> `.env.production` ships a dummy `DATABASE_URL` so the build's `prisma generate`
> step succeeds without a live database. The real value is read from Vercel env
> at runtime.

### After deploying

Run migrations against the deployed database (see [MIGRATIONS.md](./MIGRATIONS.md)):

```bash
curl -X POST https://<your-app>/api/migrate     # run pending migrations
curl https://<your-app>/api/migrate             # verify status
curl https://<your-app>/api/categories          # smoke-test the API
```

## Docker

Production image (`Dockerfile`, `node:22-alpine`, runs `npm start`):

```bash
docker build -t luka-app:prod .
docker run -d -p 3001:3000 --name luka-prod --env-file .env.production luka-app:prod
```

Or with Compose (brings up the app plus a MySQL service):

```bash
docker compose up app-prod mysql
```

A fresh MySQL container starts empty — run migrations once it's up
(`docker compose exec app-dev npx tsx migrate.ts migrate`).

## Pre-deploy checklist

- [ ] `npm run build` succeeds locally (or `docker build .`)
- [ ] TypeScript compiles with no errors
- [ ] Core APIs work locally (`/api/categories`, `/api/transactions`, `/api/users`)
- [ ] `vercel.json`, `package.json`, `tsconfig.json` present and correct
- [ ] `.gitignore` excludes `.env*` (except `.env.example`) and `.next`
- [ ] Production env vars set in Vercel
- [ ] After first deploy: run `POST /api/migrate`, then verify `GET /api/migrate`

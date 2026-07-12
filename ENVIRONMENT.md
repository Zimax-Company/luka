# Environment Configuration

How environment variables are defined, loaded, and used across local, Docker,
and Vercel environments.

## How env is resolved

Configuration is centralized in [`src/lib/env.ts`](./src/lib/env.ts), which
exposes a typed `env` object. The database URL is resolved in this order:

1. If `DATABASE_URL` is set, use it directly.
2. Otherwise build it from the component vars: `DB_USER`, `DB_PASSWORD`,
   `DB_HOST`, `DB_NAME`, `DB_PORT` (defaults to `3306`).
3. Otherwise fall back to `mysql://root:password@localhost:3306/luka_categories`.

It also derives `IS_PRODUCTION` / `IS_DEVELOPMENT` from `NODE_ENV` and exposes
`env.validate()`, which logs the resolved config on the server in development.

`NODE_ENV` is set automatically: `npm run dev` → `development`, `npm start` and
Vercel → `production`. You normally do not set it by hand.

## Variables

### Application (read by `src/lib/env.ts`)

| Variable | Purpose | Example |
|----------|---------|---------|
| `DATABASE_URL` | Full MySQL connection string (preferred) | `mysql://root:password@localhost:3306/luka_categories` |
| `DB_USER` / `DB_PASSWORD` / `DB_HOST` / `DB_NAME` / `DB_PORT` | Components used to build `DATABASE_URL` when it isn't set directly | `luka_user` / `luka_password` / `mysql` / `luka_categories` / `3306` |
| `NODE_ENV` | Environment mode (auto-set) | `development` / `production` |
| `NEXT_PUBLIC_APP_URL` | Browser-accessible app URL | `http://localhost:3000` |

### Docker Compose only (read by `docker-compose.yml`)

| Variable | Purpose |
|----------|---------|
| `MYSQL_ROOT_PASSWORD` | MySQL root password |
| `MYSQL_DATABASE` | Database created on first boot |
| `MYSQL_USER` / `MYSQL_PASSWORD` | Application DB user |
| `MYSQL_PORT` | Host port mapped to MySQL |
| `APP_DEV_PORT` / `APP_PROD_PORT` | Host ports for the dev / prod app services |
| `MYSQL_CONTAINER_NAME` / `APP_CONTAINER_NAME` | Container names |

## `.env` files

| File | Committed? | Used by | Purpose |
|------|-----------|---------|---------|
| `.env.example` | yes | — | Template. Copy it to create your own local file. |
| `.env` | no | `docker-compose.yml` (`env_file`) | Values for the Docker `app-dev` / `app-prod` services. |
| `.env.local` | no | Next.js (`npm run dev`) | Personal local overrides. |
| `.env.development` | yes | Next.js when `NODE_ENV=development` | Shared dev defaults (localhost DB). |
| `.env.production` | yes | build / `npm start` | Production defaults; carries a dummy `DATABASE_URL` so build-time `prisma generate` works. Real value comes from Vercel at runtime. |

Next.js load order (later entries do **not** override earlier): `process.env` →
`.env.$(NODE_ENV).local` → `.env.local` → `.env.$(NODE_ENV)` → `.env`.

## Setup

### Local (no Docker)

```bash
cp .env.example .env.local      # then edit DATABASE_URL + NEXT_PUBLIC_APP_URL
npm install
npm run dev                     # http://localhost:3000
```

### Docker

`docker compose` reads `.env`. Create it from the template first:

```bash
cp .env.example .env            # then fill in MYSQL_* / ports / DATABASE_URL
docker compose up app-dev mysql # dev, with hot reload
docker compose logs -f app-dev
docker compose down
```

A fresh MySQL container starts empty — run migrations once it's up:

```bash
docker compose exec app-dev npx tsx migrate.ts migrate
```

See [MIGRATIONS.md](./MIGRATIONS.md).

## Verifying & debugging

```bash
curl http://localhost:3000/api/env-check | jq '.environment'   # resolved config
printenv | grep -E 'DATABASE|NODE_ENV'
```

## Vercel

Set production env vars in the Vercel dashboard (Settings → Environment
Variables) or via `vercel env add <NAME>`. At minimum set `DATABASE_URL` (or the
`DB_*` component set). `NODE_ENV` is already pinned to `production` by
`vercel.json`, so you don't need to add it. See [DEPLOYMENT.md](./DEPLOYMENT.md).

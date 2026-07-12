# Luka

A personal finance manager built with Next.js. Track income and expense
**transactions** across multiple **accounts**, organize them with
**categories**, manage **users** with role-based access, and view **reports** —
all backed by a REST API and a MySQL database.

## Tech stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **MySQL** via **Prisma** (`@prisma/client`) for queries
- A code-defined migration system (see [MIGRATIONS.md](./MIGRATIONS.md))
- **Tailwind CSS** + Radix UI + Recharts
- Docker for local development; Vercel for deployment

## Quick start

```bash
cp .env.example .env.local      # set DATABASE_URL + NEXT_PUBLIC_APP_URL
npm install
npm run migrate:run             # create tables (needs a reachable MySQL)
npm run dev                     # http://localhost:3000
```

Prefer Docker? See [ENVIRONMENT.md](./ENVIRONMENT.md#docker).

Default admin login (seeded by the users migration): `admin@example.com` /
`admin123` — **change this before any real use.**

## Pages

`/` (dashboard) · `/transactions` · `/categories` · `/accounts` · `/reports` ·
`/users` · `/settings`

## API

Base path `/api`. Resources:

| Resource | Endpoints |
|----------|-----------|
| Auth | `POST /api/auth/login` |
| Categories | `GET/POST /api/categories`, `GET/PUT/DELETE /api/categories/{id}` |
| Transactions | `GET/POST /api/transactions`, `GET/PUT/DELETE /api/transactions/{id}`, `GET /api/transactions/summary` |
| Accounts | `GET/POST /api/accounts`, `GET/PUT/DELETE /api/accounts/{id}` |
| Users | `GET/POST /api/users`, `GET/PUT/DELETE /api/users/{id}` |
| Reports | `GET /api/reports/summary` |
| Ops | `GET/POST /api/migrate`, `POST /api/migrate/rollback`, `GET /api/env-check`, `GET /api/hello` |

See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for request/response details
(Categories is fully documented; other resources follow the same conventions).

## Documentation

- [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) — REST API reference
- [ENVIRONMENT.md](./ENVIRONMENT.md) — env vars, `.env` files, local & Docker setup
- [DEPLOYMENT.md](./DEPLOYMENT.md) — Vercel and Docker deployment
- [MIGRATIONS.md](./MIGRATIONS.md) — database migration system

## Project structure

```
src/
  app/
    api/            # REST API route handlers
    (pages)/        # dashboard, transactions, categories, accounts, reports, users, settings
    layout.tsx, page.tsx, globals.css
  components/        # React UI components (+ ui/ primitives)
  contexts/          # AuthContext
  services/          # Prisma-backed data services (account, category, transaction, user)
  lib/               # env, prisma client, migrations runner, utils
  types/             # shared TypeScript types
prisma/              # schema.prisma (query models) + seed.ts
migrate.ts           # migration CLI
```

## Common scripts

```bash
npm run dev            # start dev server
npm run build          # prisma generate && next build
npm start              # start production server
npm run lint           # eslint
npm run migrate:status # migration status (see MIGRATIONS.md)
npm run db:seed        # seed data (prisma/seed.ts)
```

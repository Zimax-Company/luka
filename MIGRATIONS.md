# Database Migrations

Luka uses a single, self-contained migration system. There is **one source of
truth**: the `MIGRATIONS` array in [`src/lib/migrations.ts`](./src/lib/migrations.ts).

Migrations are defined in code (not loaded from files on disk) so they run
identically in local, Docker, and serverless (Vercel) environments, where
dynamic file imports aren't available.

> Note: `prisma/schema.prisma` defines the Prisma **client models** used for
> type-safe queries. It is kept in sync with the migrations by hand — the
> `prisma migrate` / `prisma db push` commands are **not** used to manage the
> schema. Do not run them against a real database.

## How it works

- Each migration is an object `{ id, description, up(prisma), down(prisma) }`.
- A MySQL `migrations` table tracks what has run (`id`, `batch`, `executed_at`).
- Running applies only the migrations not yet recorded, in order, under a new
  batch number. Rollback reverts the most recent batch.
- Migrations are **idempotent**: each one checks `information_schema` before
  `CREATE`/`ALTER` and uses `INSERT IGNORE`, so re-running is safe even on a
  partially-migrated database.

The same `MigrationRunner` class powers both the CLI and the HTTP API below.

## Current migrations

| id | Description |
|----|-------------|
| `001_create_migrations_table` | Create the migrations tracking table |
| `002_create_categories_table` | Categories table (INCOME / EXPENSE) |
| `003_create_transactions_table` | Transactions table with FK to categories |
| `004_create_accounts_table` | Accounts table for multi-account management |
| `005_add_account_relations` | Add `account_id` FK to categories & transactions |
| `006_remove_account_balances` | Drop balance columns (balances computed from transactions) |
| `007_create_users_table` | Users table with ADMIN / EDITOR / VIEWER roles |
| `008_add_user_to_accounts` | Add `user_id` FK to accounts for ownership |

## CLI commands

Run from the project root (uses [`migrate.ts`](./migrate.ts)):

```bash
npm run migrate:status     # Show executed vs pending migrations
npm run migrate:run        # Run all pending migrations
npm run migrate:rollback   # Roll back the last batch
npm run migrate:make <name># Print a snippet to paste into src/lib/migrations.ts
```

Inside Docker:

```bash
docker compose exec app-dev npx tsx migrate.ts status
docker compose exec app-dev npx tsx migrate.ts migrate
```

## HTTP API

Useful for running migrations on a deployed environment (e.g. Vercel) where you
don't have shell access. **These endpoints are unauthenticated — protect or
remove them before exposing publicly.**

```bash
# Check status
curl https://<your-app>/api/migrate

# Run pending migrations
curl -X POST https://<your-app>/api/migrate

# Roll back the last batch
curl -X POST https://<your-app>/api/migrate/rollback
```

`GET /api/migrate` returns `{ status: { total, executed, pending, lastBatch },
pendingMigrations, executedMigrations, upToDate }`.

## Adding a migration

1. Run `npm run migrate:make create_widgets_table` to print a stub.
2. Paste it into the `MIGRATIONS` array in
   [`src/lib/migrations.ts`](./src/lib/migrations.ts), keeping the sequential
   `NNN_` id ordering.
3. Implement `up` and `down`. Keep them idempotent — check `information_schema`
   before `CREATE`/`ALTER`, use `CREATE TABLE IF NOT EXISTS` and `INSERT IGNORE`,
   and wrap `DROP`s in try/catch (MySQL has no `DROP ... IF EXISTS` for
   columns/indexes/constraints).
4. If the change affects query models, update `prisma/schema.prisma` to match.
5. Run `npm run migrate:run`.

## Default admin user

Migration `007` seeds a default admin: `admin@example.com` / `admin123`.
The password is stored in plain text — **change it and add password hashing
(e.g. bcrypt) before any real use.**

## Notes / history

- All migrations were made idempotent and partial-state-safe (April 2026): each
  checks for existing tables/columns/constraints first and wraps drops in
  try/catch, fixing failures when a previous run left the database half-migrated.
- `.env.production` ships a dummy `DATABASE_URL` so build-time `prisma generate`
  succeeds without a live database; the real URL is supplied at runtime.

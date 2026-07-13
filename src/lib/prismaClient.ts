import { PrismaClient } from '@prisma/client';
import env from './env';

// Central factory so every Prisma client uses the same connection string.
//
// The datasource URL is taken from env.DATABASE_URL, which resolves in this order
// (see src/lib/env.ts):
//   1. process.env.DATABASE_URL if set directly, else
//   2. composed from DB_USER/DB_PASSWORD/DB_HOST/DB_NAME/DB_PORT (the Vercel setup).
//
// This is why the app works with individual DB_* env vars on Vercel without a
// literal DATABASE_URL — the Prisma schema's env("DATABASE_URL") alone would not.
export function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    datasources: { db: { url: env.DATABASE_URL } },
  });
}

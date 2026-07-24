// Next.js runtime startup hook. Runs pending DB migrations automatically on the
// first server boot after each deploy, so migrations never have to be run by
// hand. Idempotent + guarded by a server-global advisory lock so overlapping
// cold starts don't collide; failures are logged and retried on the next boot.
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  // Use the app's client factory (composes DATABASE_URL from DB_* parts on
  // Vercel) — a bare `new PrismaClient()` fails there with no DATABASE_URL.
  const { createPrismaClient } = await import('./lib/prismaClient');
  const { MigrationRunner } = await import('./lib/migrations');
  const prisma = createPrismaClient();

  try {
    const lock = await prisma.$queryRawUnsafe<Array<{ l: number | null }>>(
      "SELECT GET_LOCK('luka_auto_migrate', 15) AS l",
    );
    const gotLock = Number(lock?.[0]?.l ?? 0) === 1;
    try {
      const runner = new MigrationRunner(prisma);
      const status = await runner.getStatus();
      if (status.pending > 0) {
        console.log(`🔄 Auto-migrate: running ${status.pending} pending migration(s)…`);
        const res = await runner.runMigrations();
        console.log(`✅ Auto-migrate executed: ${res.executed.join(', ') || 'none'}`);
        if (res.errors.length) console.error('⚠️ Auto-migrate errors:', res.errors);
      }
    } finally {
      if (gotLock) {
        await prisma.$queryRawUnsafe("SELECT RELEASE_LOCK('luka_auto_migrate')").catch(() => {});
      }
    }
  } catch (error) {
    console.error('Auto-migrate skipped (will retry on next boot):', error);
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

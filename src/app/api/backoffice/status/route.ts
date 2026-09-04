import { NextResponse } from 'next/server';
import { createPrismaClient } from '@/lib/prismaClient';
import { defaultBootstrapCredentials } from '@/lib/backoffice';

const prisma = createPrismaClient();

// GET /api/backoffice/status — public setup state for the login page.
// While no admins exist, exposes the default bootstrap credentials (which are
// hardcoded/non-secret) so the operator can sign in and create real accounts.
export async function GET() {
  try {
    const adminCount = await prisma.backofficeUser.count({ where: { isActive: true } });
    const bootstrap = adminCount === 0;
    return NextResponse.json({
      success: true,
      bootstrap,
      defaults: bootstrap ? defaultBootstrapCredentials() : null,
    });
  } catch {
    return NextResponse.json({ success: true, bootstrap: false, defaults: null });
  }
}

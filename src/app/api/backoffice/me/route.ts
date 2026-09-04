import { NextRequest, NextResponse } from 'next/server';
import { createPrismaClient } from '@/lib/prismaClient';
import { BOOTSTRAP_SUB, getBackofficeSub, envBootstrapEmail } from '@/lib/backoffice';

const prisma = createPrismaClient();

// GET /api/backoffice/me — identity of the signed-in back-office user (or the
// bootstrap owner). 401 if the session is missing/expired. Used by the pages to
// gate rendering / redirect to login.
export async function GET(request: NextRequest) {
  const sub = getBackofficeSub(request);
  if (!sub) {
    return NextResponse.json({ success: false }, { status: 401 });
  }

  if (sub === BOOTSTRAP_SUB) {
    return NextResponse.json({
      success: true,
      user: { id: BOOTSTRAP_SUB, name: 'Owner (bootstrap)', email: envBootstrapEmail(), bootstrap: true },
    });
  }

  const user = await prisma.backofficeUser.findFirst({
    where: { id: sub, isActive: true },
    select: { id: true, name: true, email: true },
  });
  if (!user) {
    return NextResponse.json({ success: false }, { status: 401 });
  }
  return NextResponse.json({ success: true, user: { ...user, bootstrap: false } });
}

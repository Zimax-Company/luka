import { NextRequest, NextResponse } from 'next/server';
import { createPrismaClient } from '@/lib/prismaClient';
import { getBackofficeSub } from '@/lib/backoffice';

const prisma = createPrismaClient();

// DELETE /api/backoffice/users/[id] — deactivate a back-office admin. Refuses to
// remove the last remaining admin (would lock everyone out of the back office).
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sub = getBackofficeSub(request);
  if (!sub) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const user = await prisma.backofficeUser.findFirst({ where: { id, isActive: true } });
  if (!user) {
    return NextResponse.json({ success: false, error: 'Admin not found' }, { status: 404 });
  }

  const activeCount = await prisma.backofficeUser.count({ where: { isActive: true } });
  if (activeCount <= 1) {
    return NextResponse.json(
      { success: false, error: 'Cannot remove the last back-office admin' },
      { status: 400 },
    );
  }

  await prisma.backofficeUser.update({ where: { id }, data: { isActive: false } });
  return NextResponse.json({ success: true });
}

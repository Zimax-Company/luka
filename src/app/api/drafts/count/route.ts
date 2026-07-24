import { NextRequest, NextResponse } from 'next/server';
import { createPrismaClient } from '@/lib/prismaClient';
import { getActor } from '@/lib/actor';
import { getAccessibleAccountIds } from '@/lib/access';

const prisma = createPrismaClient();

// GET /api/drafts/count — pending inbox count for the badge.
export async function GET(request: NextRequest) {
  try {
    const actor = await getActor(request);
    if (!actor) return NextResponse.json({ success: true, count: 0 });
    const accessibleIds = await getAccessibleAccountIds(actor);
    if (accessibleIds.length === 0) return NextResponse.json({ success: true, count: 0 });
    const count = await prisma.draftEntry.count({
      where: { accountId: { in: accessibleIds }, status: 'PENDING' },
    });
    return NextResponse.json({ success: true, count });
  } catch (error) {
    console.error('Error in GET /api/drafts/count:', error);
    return NextResponse.json({ success: true, count: 0 });
  }
}

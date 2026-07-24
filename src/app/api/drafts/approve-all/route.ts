import { NextRequest, NextResponse } from 'next/server';
import { createPrismaClient } from '@/lib/prismaClient';
import { getActor } from '@/lib/actor';
import { getAccessibleAccountIds } from '@/lib/access';
import { invalidateCategoryModel } from '@/lib/categorizeStore';
import { PrismaEntryService } from '@/services/prismaEntryService';

const prisma = createPrismaClient();

// POST /api/drafts/approve-all — approve every ready pending draft (has a
// category + amount) across the user's accessible accounts. Incomplete drafts
// (missing category/amount) are skipped and left for manual review.
export async function POST(request: NextRequest) {
  try {
    const actor = await getActor(request);
    if (!actor || actor.role === 'VIEWER') {
      return NextResponse.json({ success: false, error: 'Not permitted' }, { status: 403 });
    }
    const accessibleIds = await getAccessibleAccountIds(actor);
    if (accessibleIds.length === 0) return NextResponse.json({ success: true, approved: 0, skipped: 0 });

    const drafts = await prisma.draftEntry.findMany({
      where: { accountId: { in: accessibleIds }, status: 'PENDING' },
      take: 500,
    });

    let approved = 0;
    let skipped = 0;
    const touchedAccounts = new Set<string>();

    for (const d of drafts) {
      const amount = d.amount != null ? Number(d.amount) : NaN;
      if (!d.categoryId || isNaN(amount) || amount <= 0) {
        skipped += 1;
        continue;
      }
      try {
        await PrismaEntryService.create({
          accountId: d.accountId,
          categoryId: d.categoryId,
          amount,
          date: d.date.toISOString().slice(0, 10),
          note: d.note ?? '',
        });
        await prisma.draftEntry.update({ where: { id: d.id }, data: { status: 'APPROVED' } });
        touchedAccounts.add(d.accountId);
        approved += 1;
      } catch {
        skipped += 1;
      }
    }

    touchedAccounts.forEach(invalidateCategoryModel);
    return NextResponse.json({ success: true, approved, skipped });
  } catch (error) {
    console.error('Error in approve-all:', error);
    return NextResponse.json({ success: false, error: 'Failed to approve drafts' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { createPrismaClient } from '@/lib/prismaClient';
import { getActor } from '@/lib/actor';
import { getAccessibleAccountIds } from '@/lib/access';

const prisma = createPrismaClient();

// GET /api/onboarding — new-customer setup checklist, derived from data.
export async function GET(request: NextRequest) {
  try {
    const actor = await getActor(request);
    if (!actor) return NextResponse.json({ success: false, error: 'Not identified' }, { status: 401 });

    const accessibleIds = await getAccessibleAccountIds(actor);
    const categoriesCount =
      accessibleIds.length > 0
        ? await prisma.category.count({ where: { accountId: { in: accessibleIds } } })
        : 0;

    const customer = actor.customerId
      ? await prisma.customer.findUnique({
          where: { id: actor.customerId },
          select: { onboardingDismissed: true },
        })
      : null;

    const steps = [
      { key: 'account', title: 'Create an account', done: accessibleIds.length > 0 },
      { key: 'category', title: 'Add your first category', done: categoriesCount > 0 },
    ];
    const complete = steps.every(s => s.done);

    return NextResponse.json({
      success: true,
      data: { steps, complete, dismissed: !!customer?.onboardingDismissed },
    });
  } catch (error) {
    console.error('Error in GET /api/onboarding:', error);
    return NextResponse.json({ success: false, error: 'Failed to load onboarding' }, { status: 500 });
  }
}

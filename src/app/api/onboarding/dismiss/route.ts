import { NextRequest, NextResponse } from 'next/server';
import { createPrismaClient } from '@/lib/prismaClient';
import { getActor } from '@/lib/actor';

const prisma = createPrismaClient();

// POST /api/onboarding/dismiss — hide the onboarding checklist for the customer.
export async function POST(request: NextRequest) {
  try {
    const actor = await getActor(request);
    if (!actor || actor.role === 'VIEWER') {
      return NextResponse.json({ success: false, error: 'Not permitted' }, { status: 403 });
    }
    if (actor.customerId) {
      await prisma.customer.update({
        where: { id: actor.customerId },
        data: { onboardingDismissed: true },
      });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in POST /api/onboarding/dismiss:', error);
    return NextResponse.json({ success: false, error: 'Failed to dismiss' }, { status: 500 });
  }
}

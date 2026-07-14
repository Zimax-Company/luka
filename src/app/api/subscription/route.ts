import { NextRequest, NextResponse } from 'next/server';
import { createPrismaClient } from '@/lib/prismaClient';
import { getActor } from '@/lib/actor';

const prisma = createPrismaClient();

// GET /api/subscription — the caller's billable account + subscription.
// Subscription history (events) is only returned to the ROOT user of the
// billable account (email === customer.rootEmail).
export async function GET(request: NextRequest) {
  try {
    const actor = await getActor(request);
    if (!actor) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }
    if (!actor.customerId) {
      return NextResponse.json(
        { success: false, error: 'No billable account linked to this user' },
        { status: 404 },
      );
    }

    const customer = await prisma.customer.findUnique({ where: { id: actor.customerId } });
    if (!customer) {
      return NextResponse.json({ success: false, error: 'Billable account not found' }, { status: 404 });
    }

    const isRoot = actor.email.toLowerCase() === customer.rootEmail.toLowerCase();

    const events = isRoot
      ? await prisma.subscriptionEvent.findMany({
          where: { customerId: customer.id },
          orderBy: { createdAt: 'desc' },
        })
      : null;

    return NextResponse.json({
      success: true,
      data: {
        customer: {
          id: customer.id,
          name: customer.name,
          rootEmail: customer.rootEmail,
          plan: customer.plan,
          status: customer.status,
        },
        isRoot,
        // History is root-only; non-root users just see current plan/status.
        history: events
          ? events.map(e => ({
              id: e.id,
              plan: e.plan,
              type: e.type,
              amount: e.amount != null ? Number(e.amount) : null,
              currency: e.currency,
              note: e.note,
              createdAt: e.createdAt.toISOString(),
            }))
          : null,
      },
    });
  } catch (error) {
    console.error('Error in GET /api/subscription:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch subscription' },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { createPrismaClient } from '@/lib/prismaClient';
import { getActor } from '@/lib/actor';

const prisma = createPrismaClient();

// GET /api/notifications/unread-count — lightweight endpoint the bell polls.
export async function GET(request: NextRequest) {
  try {
    const actor = await getActor(request);
    if (!actor) return NextResponse.json({ success: true, count: 0 });
    const count = await prisma.notification.count({
      where: { recipientId: actor.id, readAt: null },
    });
    return NextResponse.json({ success: true, count });
  } catch (error) {
    console.error('Error in GET /api/notifications/unread-count:', error);
    return NextResponse.json({ success: true, count: 0 });
  }
}

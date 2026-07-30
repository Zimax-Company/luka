import { NextRequest, NextResponse } from 'next/server';
import { createPrismaClient } from '@/lib/prismaClient';
import { getActor } from '@/lib/actor';

const prisma = createPrismaClient();

// POST /api/devices — register (or move) an FCM token to the current user.
// Body: { token, platform? }
export async function POST(request: NextRequest) {
  try {
    const actor = await getActor(request);
    if (!actor) return NextResponse.json({ success: false, error: 'Not identified' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const token = (body?.token ?? '').trim();
    const platform = (body?.platform ?? 'android').trim();
    if (!token) return NextResponse.json({ success: false, error: 'token is required' }, { status: 400 });

    // A token is unique to a device; on re-login it moves to the new user.
    await prisma.deviceToken.upsert({
      where: { token },
      create: { userId: actor.id, token, platform },
      update: { userId: actor.id, platform },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error registering device token:', error);
    return NextResponse.json({ success: false, error: 'Failed to register device' }, { status: 500 });
  }
}

// DELETE /api/devices — unregister a token (on logout). Body: { token }
export async function DELETE(request: NextRequest) {
  try {
    const actor = await getActor(request);
    if (!actor) return NextResponse.json({ success: false, error: 'Not identified' }, { status: 401 });
    const body = await request.json().catch(() => ({}));
    const token = (body?.token ?? '').trim();
    if (token) await prisma.deviceToken.deleteMany({ where: { token, userId: actor.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing device token:', error);
    return NextResponse.json({ success: false, error: 'Failed to remove device' }, { status: 500 });
  }
}

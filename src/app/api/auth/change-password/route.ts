import { NextRequest, NextResponse } from 'next/server';
import { createPrismaClient } from '@/lib/prismaClient';
import { getActor } from '@/lib/actor';
import { recordAudit } from '@/lib/audit';

const prisma = createPrismaClient();

// POST /api/auth/change-password — { currentPassword, newPassword }
// Actor-gated (x-user-id). Verifies the current password, then sets the new one.
// NOTE: passwords are stored plaintext to match the existing login check — see
// docs/FEATURES.md §4 (tech debt). Migrate login + storage to hashing together.
export async function POST(request: NextRequest) {
  try {
    const actor = await getActor(request);
    if (!actor) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    let currentPassword: string | undefined;
    let newPassword: string | undefined;
    try {
      const body = await request.json();
      currentPassword = body?.currentPassword;
      newPassword = body?.newPassword;
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });
    }

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { success: false, error: 'Current and new password are required' },
        { status: 400 },
      );
    }
    if (newPassword.length < 8) {
      return NextResponse.json(
        { success: false, error: 'New password must be at least 8 characters' },
        { status: 400 },
      );
    }
    if (newPassword === currentPassword) {
      return NextResponse.json(
        { success: false, error: 'New password must be different from the current one' },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({ where: { id: actor.id } });
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }
    if (user.password !== currentPassword) {
      return NextResponse.json({ success: false, error: 'Current password is incorrect' }, { status: 400 });
    }

    await prisma.user.update({ where: { id: user.id }, data: { password: newPassword } });
    recordAudit(actor, 'UPDATE', 'user', user.id, 'Changed password');

    return NextResponse.json({ success: true, message: 'Password updated' });
  } catch (error) {
    console.error('Error in POST /api/auth/change-password:', error);
    return NextResponse.json({ success: false, error: 'Failed to change password' }, { status: 500 });
  }
}

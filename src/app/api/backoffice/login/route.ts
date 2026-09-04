import { NextRequest, NextResponse } from 'next/server';
import { createPrismaClient } from '@/lib/prismaClient';
import {
  BO_COOKIE,
  BO_TTL_MS,
  BOOTSTRAP_SUB,
  checkBootstrap,
  createSessionToken,
  verifyPassword,
} from '@/lib/backoffice';

const prisma = createPrismaClient();

function setSession(sub: string) {
  const res = NextResponse.json({ success: true });
  res.cookies.set(BO_COOKIE, createSessionToken(sub), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: Math.floor(BO_TTL_MS / 1000),
  });
  return res;
}

// POST /api/backoffice/login — { email, password }
// Authenticates against backoffice_users. While that table has no active admins,
// the default bootstrap login is accepted so the first real account can be made.
export async function POST(request: NextRequest) {
  let email: string | undefined;
  let password: string | undefined;
  try {
    const body = await request.json();
    email = body?.email;
    password = body?.password;
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });
  }

  try {
    const adminCount = await prisma.backofficeUser.count({ where: { isActive: true } });

    // Normal path: authenticate against the DB.
    if (adminCount > 0) {
      const user = email
        ? await prisma.backofficeUser.findFirst({ where: { email, isActive: true } })
        : null;
      if (!user || !password || !verifyPassword(password, user.password)) {
        return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 });
      }
      return setSession(user.id);
    }

    // Bootstrap path: no admins yet — accept the default (or overridden) password.
    if (!checkBootstrap(password)) {
      return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 });
    }
    return setSession(BOOTSTRAP_SUB);
  } catch (error) {
    console.error('Error in POST /api/backoffice/login:', error);
    return NextResponse.json({ success: false, error: 'Login failed' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import {
  BO_COOKIE,
  BO_TTL_MS,
  backofficeEnabled,
  checkBackofficeCredentials,
  createSessionToken,
} from '@/lib/backoffice';

// POST /api/backoffice/login — { email?, password } → sets the bo_session cookie.
export async function POST(request: NextRequest) {
  if (!backofficeEnabled()) {
    return NextResponse.json(
      { success: false, error: 'Back office is not configured (set BACKOFFICE_PASSWORD).' },
      { status: 503 },
    );
  }

  let email: string | undefined;
  let password: string | undefined;
  try {
    const body = await request.json();
    email = body?.email;
    password = body?.password;
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 });
  }

  if (!checkBackofficeCredentials(email, password)) {
    return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 });
  }

  const res = NextResponse.json({ success: true });
  res.cookies.set(BO_COOKIE, createSessionToken(), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: Math.floor(BO_TTL_MS / 1000),
  });
  return res;
}

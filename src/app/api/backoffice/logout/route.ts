import { NextResponse } from 'next/server';
import { BO_COOKIE } from '@/lib/backoffice';

// POST /api/backoffice/logout — clears the back-office session cookie.
export async function POST() {
  const res = NextResponse.json({ success: true });
  res.cookies.set(BO_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
  return res;
}

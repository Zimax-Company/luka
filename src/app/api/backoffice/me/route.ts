import { NextRequest, NextResponse } from 'next/server';
import { isBackofficeRequest } from '@/lib/backoffice';

// GET /api/backoffice/me — 200 if the session is valid, else 401. Used by the
// back-office pages to gate rendering / redirect to login.
export async function GET(request: NextRequest) {
  if (!isBackofficeRequest(request)) {
    return NextResponse.json({ success: false }, { status: 401 });
  }
  return NextResponse.json({ success: true });
}

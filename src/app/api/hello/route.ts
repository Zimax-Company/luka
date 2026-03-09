import { NextRequest, NextResponse } from 'next/server';
import env from '@/lib/env';

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Hello World!',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
    appUrl: env.NEXT_PUBLIC_APP_URL,
    isProduction: env.IS_PRODUCTION,
    databaseConfigured: !!env.DATABASE_URL
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  
  return NextResponse.json({
    message: 'Hello World POST!',
    receivedData: body,
    timestamp: new Date().toISOString()
  });
}

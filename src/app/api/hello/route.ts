import { NextRequest, NextResponse } from 'next/server';
import env from '@/lib/env';
import { logStartupInfo } from '@/lib/startup-logger';

// Log startup information on first API call
let hasLogged = false;

export async function GET(request: NextRequest) {
  if (!hasLogged) {
    logStartupInfo();
    hasLogged = true;
  }

  return NextResponse.json({
    message: 'Hello World!',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
    appUrl: env.NEXT_PUBLIC_APP_URL,
    isProduction: env.IS_PRODUCTION,
    databaseConfigured: !!env.DATABASE_URL,
    platform: process.env.VERCEL ? 'Vercel' : 'Local'
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

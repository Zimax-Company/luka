import { NextRequest, NextResponse } from 'next/server';
import env from '@/lib/env';

export async function GET(request: NextRequest) {
  // Log database configuration for debugging (especially for Vercel)
  console.log('=== DATABASE CONFIGURATION DEBUG ===');
  console.log('Environment:', process.env.NODE_ENV);
  console.log('Direct DATABASE_URL:', process.env.DATABASE_URL || 'NOT SET');
  console.log('DB_USER:', process.env.DB_USER || 'NOT SET');
  console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '***SET***' : 'NOT SET');
  console.log('DB_HOST:', process.env.DB_HOST || 'NOT SET');
  console.log('DB_NAME:', process.env.DB_NAME || 'NOT SET');
  console.log('DB_PORT:', process.env.DB_PORT || 'NOT SET');
  console.log('Constructed DATABASE_URL:', env.DATABASE_URL);
  console.log('=====================================');

  return NextResponse.json({
    message: 'Environment Configuration Check',
    timestamp: new Date().toISOString(),
    environment: {
      NODE_ENV: env.NODE_ENV,
      IS_PRODUCTION: env.IS_PRODUCTION,
      IS_DEVELOPMENT: env.IS_DEVELOPMENT,
      NEXT_PUBLIC_APP_URL: env.NEXT_PUBLIC_APP_URL
    },
    database: {
      configured: !!env.DATABASE_URL,
      hasIndividualComponents: !!(env.DB_USER && env.DB_PASSWORD && env.DB_HOST && env.DB_NAME),
      directDatabaseUrl: !!process.env.DATABASE_URL,
      components: {
        DB_HOST: env.DB_HOST || 'not set',
        DB_NAME: env.DB_NAME || 'not set', 
        DB_USER: env.DB_USER || 'not set',
        DB_PORT: env.DB_PORT || 'not set',
        DB_PASSWORD: env.DB_PASSWORD ? '***' : 'not set'
      },
      databaseUrl: env.DATABASE_URL ? 'mysql://***:***@' + env.DATABASE_URL.split('@')[1] : 'not configured',
      fullDatabaseUrl: env.DATABASE_URL // Include full URL for debugging (be careful in production)
    },
    rawEnvironment: {
      DATABASE_URL: process.env.DATABASE_URL || 'not set',
      DB_USER: process.env.DB_USER || 'not set',
      DB_PASSWORD: process.env.DB_PASSWORD ? '***SET***' : 'not set',
      DB_HOST: process.env.DB_HOST || 'not set',
      DB_NAME: process.env.DB_NAME || 'not set',
      DB_PORT: process.env.DB_PORT || 'not set',
      NODE_ENV: process.env.NODE_ENV || 'not set'
    }
  });
}

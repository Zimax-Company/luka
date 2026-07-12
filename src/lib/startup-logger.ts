// Startup logging for Vercel deployment debugging
import env from '@/lib/env';

export function logStartupInfo() {
  if (typeof window !== 'undefined') {
    // Don't log on client side
    return;
  }

  console.log('===================================');
  console.log('🚀 LUKA APPLICATION STARTUP');
  console.log('===================================');
  console.log('Timestamp:', new Date().toISOString());
  console.log('Environment:', process.env.NODE_ENV);
  console.log('Platform:', process.env.VERCEL ? 'Vercel' : 'Local');
  
  console.log('\n📊 Environment Variables:');
  console.log('- NODE_ENV:', process.env.NODE_ENV || 'undefined');
  console.log('- VERCEL:', process.env.VERCEL || 'undefined');
  console.log('- VERCEL_ENV:', process.env.VERCEL_ENV || 'undefined');
  console.log('- VERCEL_URL:', process.env.VERCEL_URL || 'undefined');

  console.log('\n🗄️  Database Configuration:');
  console.log('- DATABASE_URL (direct):', process.env.DATABASE_URL ? '***SET***' : 'NOT SET');
  console.log('- DB_USER:', process.env.DB_USER || 'NOT SET');
  console.log('- DB_PASSWORD:', process.env.DB_PASSWORD ? '***SET***' : 'NOT SET');
  console.log('- DB_HOST:', process.env.DB_HOST || 'NOT SET');
  console.log('- DB_NAME:', process.env.DB_NAME || 'NOT SET');
  console.log('- DB_PORT:', process.env.DB_PORT || 'NOT SET');

  console.log('\n🔧 Constructed Configuration:');
  console.log('- Final DATABASE_URL:', env.DATABASE_URL ? '***CONSTRUCTED***' : 'NOT AVAILABLE');
  console.log('- Database source:', 
    process.env.DATABASE_URL ? 'Direct URL' : 
    (env.DB_USER && env.DB_HOST) ? 'Individual components' : 'Default/fallback');

  console.log('\n📝 All Environment Variables (filtered):');
  const envVars = Object.keys(process.env)
    .filter(key => key.startsWith('DB_') || key.includes('DATABASE') || key === 'NODE_ENV' || key.startsWith('VERCEL'))
    .sort();
  
  envVars.forEach(key => {
    const value = process.env[key];
    const maskedValue = key.includes('PASSWORD') || key.includes('SECRET') ? '***SET***' : value;
    console.log(`- ${key}:`, maskedValue || 'undefined');
  });

  console.log('===================================');
}

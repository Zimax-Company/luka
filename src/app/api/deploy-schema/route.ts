import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// GET /api/deploy-schema - Deploy database schema using Prisma
export async function GET(request: NextRequest) {
  try {
    console.log('🔄 Starting database schema deployment...');
    
    // Run prisma db push to create/update schema
    console.log('📊 Running prisma db push...');
    const { stdout, stderr } = await execAsync('npx prisma db push --accept-data-loss');
    
    // Filter out update notifications and warnings that aren't actual errors
    const actualErrors = stderr
      ?.split('\n')
      .filter(line => 
        line.trim() && 
        !line.includes('Update available') &&
        !line.includes('major update') &&
        !line.includes('pris.ly/d/major-version-upgrade') &&
        !line.includes('npm i') &&
        !line.includes('│') &&
        !line.includes('┌') &&
        !line.includes('└') &&
        !line.includes('warn')
      )
      .join('\n');
    
    if (actualErrors && actualErrors.trim()) {
      console.error('❌ Schema deployment error:', actualErrors);
      return NextResponse.json({
        success: false,
        error: 'Schema deployment failed',
        details: actualErrors,
        suggestion: 'Check your DATABASE_URL and database connection'
      }, { status: 500 });
    }
    
    console.log('✅ Schema deployment successful');
    console.log('Output:', stdout);
    
    // After schema is created, we can safely test the connection
    try {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      
      await prisma.$connect();
      
      // Count existing data
      const categoryCount = await prisma.category.count();
      const transactionCount = await prisma.transaction.count();
      
      await prisma.$disconnect();
      
      return NextResponse.json({
        success: true,
        message: 'Database schema deployed successfully',
        data: {
          schemaDeployed: true,
          categoriesCount: categoryCount,
          transactionsCount: transactionCount,
          output: stdout,
          nextStep: categoryCount === 0 ? 'Run /api/migrate to seed initial data' : 'Database ready to use'
        }
      });
      
    } catch (connectionError) {
      return NextResponse.json({
        success: true,
        message: 'Schema deployed but connection test failed',
        data: {
          schemaDeployed: true,
          output: stdout,
          connectionWarning: 'Could not test database connection after deployment',
          nextStep: 'Try /api/migrate endpoint to verify database'
        }
      });
    }
    
  } catch (error) {
    console.error('❌ Schema deployment failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to deploy database schema',
      message: error instanceof Error ? error.message : 'Unknown error',
      suggestions: [
        'Check that DATABASE_URL is correctly set',
        'Ensure database server is running',
        'Verify database credentials and permissions',
        'Make sure database exists (create it if needed)'
      ]
    }, { status: 500 });
  }
}

// POST /api/deploy-schema - Force schema reset and deploy
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Starting forced schema reset and deployment...');
    
    // Force push schema with data loss acceptance
    console.log('📊 Running prisma db push --force-reset...');
    const { stdout, stderr } = await execAsync('npx prisma db push --force-reset --accept-data-loss');
    
    if (stderr && !stderr.includes('warn')) {
      console.error('❌ Force schema reset error:', stderr);
      return NextResponse.json({
        success: false,
        error: 'Force schema reset failed',
        details: stderr
      }, { status: 500 });
    }
    
    console.log('✅ Force schema reset successful');
    
    return NextResponse.json({
      success: true,
      message: 'Database schema forcefully reset and deployed',
      data: {
        schemaReset: true,
        output: stdout,
        warning: 'All existing data was deleted',
        nextStep: 'Run /api/migrate to seed fresh data'
      }
    });
    
  } catch (error) {
    console.error('❌ Force schema reset failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to reset and deploy schema',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

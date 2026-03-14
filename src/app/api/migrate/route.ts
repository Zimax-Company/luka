import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { MigrationRunner } from '@/lib/migrations';

// GET /api/migrate - Check migration status (Laravel-style)
export async function GET(request: NextRequest) {
  try {
    console.log('🔄 Checking migration status...');
    
    const prisma = new PrismaClient();
    const migrationRunner = new MigrationRunner(prisma);
    
    try {
      await prisma.$connect();
      console.log('✅ Database connection successful');
      
      // Get migration status
      const status = await migrationRunner.getStatus();
      const pendingMigrations = await migrationRunner.getPendingMigrations();
      const executedMigrations = await migrationRunner.getExecutedMigrations();
      
      console.log(`📈 Migration Status:`);
      console.log(`   Total migrations: ${status.total}`);
      console.log(`   Executed: ${status.executed}`);
      console.log(`   Pending: ${status.pending}`);
      console.log(`   Last batch: ${status.lastBatch}`);
      
      await prisma.$disconnect();
      
      return NextResponse.json({
        success: true,
        message: 'Migration status retrieved successfully',
        data: {
          status: {
            total: status.total,
            executed: status.executed,
            pending: status.pending,
            lastBatch: status.lastBatch
          },
          pendingMigrations: pendingMigrations.map(m => ({
            id: m.id,
            description: m.description
          })),
          executedMigrations,
          upToDate: status.pending === 0
        }
      });
      
    } catch (error) {
      console.error('❌ Migration status check failed:', error);
      await prisma.$disconnect();
      
      return NextResponse.json({
        success: false,
        error: 'Migration status check failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        suggestions: [
          'Verify database connection is working',
          'Check if database exists on server',
          'Ensure migration files are properly formatted'
        ]
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('❌ Migration status check failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to check migration status',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST /api/migrate - Run pending migrations (Laravel-style)
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Running database migrations...');
    
    const prisma = new PrismaClient();
    const migrationRunner = new MigrationRunner(prisma);
    
    try {
      await prisma.$connect();
      console.log('✅ Database connection successful');
      
      // Run pending migrations
      const result = await migrationRunner.runMigrations();
      
      await prisma.$disconnect();
      
      if (result.errors.length > 0) {
        return NextResponse.json({
          success: false,
          error: 'Some migrations failed',
          data: {
            executed: result.executed,
            errors: result.errors
          }
        }, { status: 500 });
      }
      
      return NextResponse.json({
        success: true,
        message: result.executed.length > 0 
          ? `Successfully executed ${result.executed.length} migrations` 
          : 'No pending migrations to run',
        data: {
          executed: result.executed,
          count: result.executed.length,
          status: 'completed'
        }
      });
      
    } catch (error) {
      console.error('❌ Migration execution failed:', error);
      await prisma.$disconnect();
      
      return NextResponse.json({
        success: false,
        error: 'Migration execution failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        suggestions: [
          'Check database permissions',
          'Verify migration file syntax',
          'Ensure database connection is stable'
        ]
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('❌ Migration execution failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Migration execution failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

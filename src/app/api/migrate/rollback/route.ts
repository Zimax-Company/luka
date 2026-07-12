import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { MigrationRunner } from '@/lib/migrations';

// POST /api/migrate/rollback - Rollback last batch of migrations
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Rolling back last batch of migrations...');
    
    const prisma = new PrismaClient();
    const migrationRunner = new MigrationRunner(prisma);
    
    try {
      await prisma.$connect();
      console.log('✅ Database connection successful');
      
      // Rollback last batch
      const result = await migrationRunner.rollbackLastBatch();
      
      await prisma.$disconnect();
      
      if (result.errors.length > 0) {
        return NextResponse.json({
          success: false,
          error: 'Some rollbacks failed',
          data: {
            rolledBack: result.rolledBack,
            errors: result.errors
          }
        }, { status: 500 });
      }
      
      return NextResponse.json({
        success: true,
        message: result.rolledBack.length > 0 
          ? `Successfully rolled back ${result.rolledBack.length} migrations` 
          : 'No migrations to rollback',
        data: {
          rolledBack: result.rolledBack,
          count: result.rolledBack.length,
          status: 'completed'
        }
      });
      
    } catch (error) {
      console.error('❌ Rollback execution failed:', error);
      await prisma.$disconnect();
      
      return NextResponse.json({
        success: false,
        error: 'Rollback execution failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        suggestions: [
          'Check database permissions',
          'Verify migration files exist',
          'Ensure database connection is stable'
        ]
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('❌ Rollback execution failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Rollback execution failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

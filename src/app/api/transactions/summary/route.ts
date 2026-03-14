import { NextRequest, NextResponse } from 'next/server';
import { PrismaTransactionService } from '@/services/prismaTransactionService';

// Always use database service (we have MySQL running)
function getTransactionService() {
  return PrismaTransactionService;
}

// GET /api/transactions/summary - Get transaction summary/statistics
export async function GET(request: NextRequest) {
  try {
    console.log('Generating transaction summary from database...');
    const service = getTransactionService();
    
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Get raw summary data from service
    const rawSummary = await service.getSummary();
    
    // Transform to match dashboard component expectations
    const transformedSummary = {
      totals: {
        income: rawSummary.totalIncome,
        expenses: rawSummary.totalExpenses,
        net: rawSummary.netIncome
      },
      statistics: {
        totalTransactions: rawSummary.totalTransactions,
        incomeTransactions: Object.values(rawSummary.categoryBreakdown)
          .filter((cat: any) => cat.type === 'INCOME')
          .reduce((sum: number, cat: any) => sum + cat.count, 0),
        expenseTransactions: Object.values(rawSummary.categoryBreakdown)
          .filter((cat: any) => cat.type === 'EXPENSE')
          .reduce((sum: number, cat: any) => sum + cat.count, 0),
        avgTransactionAmount: rawSummary.avgTransactionAmount,
        lastTransactionDate: new Date().toISOString(), // We'll improve this later
        categoryBreakdown: rawSummary.categoryBreakdown
      }
    };
    
    return NextResponse.json({
      success: true,
      data: transformedSummary,
      source: 'database'
    });

  } catch (error) {
    console.error('Error fetching transaction summary:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch transaction summary',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

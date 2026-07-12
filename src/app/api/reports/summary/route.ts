import { NextRequest, NextResponse } from 'next/server';
import { PrismaTransactionService } from '@/services/prismaTransactionService';

// GET /api/reports/summary - Get financial summary data for reports
export async function GET(request: NextRequest) {
  try {
    console.log('📊 Fetching financial summary for reports...');
    
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    // Get all transactions
    const allTransactions = await PrismaTransactionService.getAll();
    console.log(`✅ Found ${allTransactions.length} total transactions`);
    
    // Filter by date range if provided
    let filteredTransactions = allTransactions;
    if (startDate && endDate) {
      filteredTransactions = allTransactions.filter(transaction => {
        const transactionDate = new Date(transaction.date);
        const start = new Date(startDate);
        const end = new Date(endDate);
        return transactionDate >= start && transactionDate <= end;
      });
      console.log(`✅ Filtered to ${filteredTransactions.length} transactions for date range ${startDate} to ${endDate}`);
    }
    
    // Calculate totals
    const summary = filteredTransactions.reduce((acc, transaction) => {
      if (transaction.category.type === 'INCOME') {
        acc.totalIncome += transaction.amount;
        acc.incomeCount++;
      } else {
        acc.totalExpense += transaction.amount;
        acc.expenseCount++;
      }
      acc.transactionCount++;
      return acc;
    }, {
      totalIncome: 0,
      totalExpense: 0,
      transactionCount: 0,
      incomeCount: 0,
      expenseCount: 0
    });
    
    const netAmount = summary.totalIncome - summary.totalExpense;
    
    // Calculate category breakdown
    const categoryBreakdown = filteredTransactions.reduce((acc, transaction) => {
      const categoryName = transaction.category.name;
      const categoryType = transaction.category.type;
      
      if (!acc[categoryName]) {
        acc[categoryName] = {
          name: categoryName,
          type: categoryType,
          total: 0,
          count: 0
        };
      }
      
      acc[categoryName].total += transaction.amount;
      acc[categoryName].count++;
      
      return acc;
    }, {} as Record<string, {
      name: string;
      type: 'INCOME' | 'EXPENSE';
      total: number;
      count: number;
    }>);
    
    // Convert to array and sort by total
    const categoryData = Object.values(categoryBreakdown)
      .sort((a, b) => b.total - a.total);
    
    console.log(`📊 Summary calculated:`);
    console.log(`   Income: ₦${summary.totalIncome.toLocaleString()}`);
    console.log(`   Expenses: ₦${summary.totalExpense.toLocaleString()}`);
    console.log(`   Net: ₦${netAmount.toLocaleString()}`);
    console.log(`   Categories: ${categoryData.length}`);
    
    return NextResponse.json({
      success: true,
      data: {
        summary: {
          ...summary,
          netAmount,
          dateRange: startDate && endDate ? { startDate, endDate } : null
        },
        categoryBreakdown: categoryData,
        recentTransactions: filteredTransactions
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 10)
      },
      message: 'Financial summary retrieved successfully'
    });
    
  } catch (error) {
    console.error('❌ Error fetching financial summary:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch financial summary',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

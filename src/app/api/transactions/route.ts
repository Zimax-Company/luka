import { NextRequest, NextResponse } from 'next/server';
import { PrismaTransactionService } from '@/services/prismaTransactionService';
import { CreateTransactionRequest } from '@/types/transaction';

// Always use database service (we have MySQL running)
function getTransactionService() {
  return PrismaTransactionService;
}

// GET /api/transactions - Get all transactions
export async function GET(request: NextRequest) {
  try {
    console.log('Getting all transactions from database...');
    
    const service = getTransactionService();
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = searchParams.get('limit');
    const type = searchParams.get('type');
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    let transactions;

    if (categoryId) {
      transactions = await service.getByCategory(categoryId);
    } else if (startDate && endDate) {
      transactions = await service.getByDateRange(startDate, endDate);
    } else {
      transactions = await service.getAll();
    }

    // Apply type filter if specified
    if (type && (type === 'INCOME' || type === 'EXPENSE')) {
      transactions = transactions.filter(transaction => transaction.category?.type === type);
    }

    // Apply month filter if specified
    if (month) {
      const monthNum = parseInt(month, 10);
      if (!isNaN(monthNum) && monthNum >= 1 && monthNum <= 12) {
        transactions = transactions.filter(transaction => {
          const transactionMonth = new Date(transaction.date).getMonth() + 1; // getMonth() returns 0-11
          return transactionMonth === monthNum;
        });
      }
    }

    // Apply year filter if specified
    if (year) {
      const yearNum = parseInt(year, 10);
      if (!isNaN(yearNum)) {
        transactions = transactions.filter(transaction => {
          const transactionYear = new Date(transaction.date).getFullYear();
          return transactionYear === yearNum;
        });
      }
    }

    // Apply limit if specified
    if (limit) {
      const limitNum = parseInt(limit, 10);
      if (!isNaN(limitNum) && limitNum > 0) {
        transactions = transactions.slice(0, limitNum);
      }
    }

    return NextResponse.json({
      success: true,
      data: transactions,
      count: transactions.length,
      source: 'database'
    });

  } catch (error) {
    console.error('Error fetching transactions:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch transactions',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST /api/transactions - Create new transaction
export async function POST(request: NextRequest) {
  try {
    console.log('Creating new transaction...');
    const service = getTransactionService();

    const body: CreateTransactionRequest = await request.json();

    // Validate required fields
    if (!body.date || !body.note || !body.categoryId || body.amount === undefined) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields',
          message: 'date, note, categoryId, and amount are required'
        },
        { status: 400 }
      );
    }

    const transaction = await service.create(body);

    return NextResponse.json({
      success: true,
      data: transaction,
      message: 'Transaction created successfully',
      source: 'database'
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating transaction:', error);
    
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid category',
          message: error.message
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create transaction',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

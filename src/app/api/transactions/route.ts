import { NextRequest, NextResponse } from 'next/server';
import { TransactionService } from '@/services/transactionService';
import { CreateTransactionRequest } from '@/types/transaction';
import env from '@/lib/env';

// GET /api/transactions - Get all transactions
export async function GET(request: NextRequest) {
  try {
    // Log database configuration for debugging
    console.log('=== TRANSACTIONS API - DATABASE CHECK ===');
    console.log('Database URL configured:', !!env.DATABASE_URL);
    console.log('Environment:', env.NODE_ENV);
    console.log('Database components check:', {
      hasUser: !!env.DB_USER,
      hasPassword: !!env.DB_PASSWORD,
      hasHost: !!env.DB_HOST,
      hasName: !!env.DB_NAME
    });
    console.log('==========================================');

    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let transactions;

    if (categoryId) {
      transactions = await TransactionService.getByCategory(categoryId);
    } else if (startDate && endDate) {
      transactions = await TransactionService.getByDateRange(startDate, endDate);
    } else {
      transactions = await TransactionService.getAll();
    }

    return NextResponse.json({
      success: true,
      data: transactions,
      count: transactions.length
    });

  } catch (error) {
    console.error('Error fetching transactions:', error);
    console.error('Database configuration:', {
      DATABASE_URL: env.DATABASE_URL ? 'SET' : 'NOT SET',
      components: {
        DB_USER: env.DB_USER || 'NOT SET',
        DB_HOST: env.DB_HOST || 'NOT SET',
        DB_NAME: env.DB_NAME || 'NOT SET'
      }
    });
    
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

    const transaction = await TransactionService.create(body);

    return NextResponse.json({
      success: true,
      data: transaction,
      message: 'Transaction created successfully'
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

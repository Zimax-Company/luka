import { NextRequest, NextResponse } from 'next/server';
import { TransactionService } from '@/services/transactionService';
import { UpdateTransactionRequest } from '@/types/transaction';

// GET /api/transactions/[id] - Get transaction by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const transaction = await TransactionService.getById(id);

    if (!transaction) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Transaction not found',
          message: `Transaction with id ${id} does not exist`
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: transaction
    });

  } catch (error) {
    console.error('Error fetching transaction:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch transaction',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// PUT /api/transactions/[id] - Update transaction
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body: UpdateTransactionRequest = await request.json();

    const transaction = await TransactionService.update(id, body);

    if (!transaction) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Transaction not found',
          message: `Transaction with id ${id} does not exist`
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: transaction,
      message: 'Transaction updated successfully'
    });

  } catch (error) {
    console.error('Error updating transaction:', error);

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
        error: 'Failed to update transaction',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// DELETE /api/transactions/[id] - Delete transaction
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deleted = await TransactionService.delete(id);

    if (!deleted) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Transaction not found',
          message: `Transaction with id ${id} does not exist`
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Transaction deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting transaction:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to delete transaction',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

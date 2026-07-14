import { NextRequest, NextResponse } from 'next/server';
import { PrismaEntryService } from '@/services/prismaEntryService';
import { UpdateEntryRequest } from '@/types/entry';
import { getActor } from '@/lib/actor';
import { recordAudit } from '@/lib/audit';

// GET /api/entries/[id] - Get entry by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log(`Getting transaction with ID: ${id}`);
    
    const transaction = await PrismaEntryService.getById(id);

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
      source: 'database'
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

// PUT /api/entries/[id] - Update entry
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log(`Updating transaction with ID: ${id}`);
    
    const body: UpdateEntryRequest = await request.json();

    const transaction = await PrismaEntryService.update(id, body);

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

    recordAudit(
      await getActor(request),
      'UPDATE',
      'entry',
      id,
      `Updated entry ${Number(transaction.amount)} · ${transaction.category?.name ?? ''}`,
    );

    return NextResponse.json({
      success: true,
      data: transaction,
      message: 'Transaction updated successfully',
      source: 'database'
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

// DELETE /api/entries/[id] - Delete entry
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log(`Deleting transaction with ID: ${id}`);
    
    await PrismaEntryService.delete(id);

    recordAudit(await getActor(request), 'DELETE', 'entry', id, `Deleted entry ${id}`);

    return NextResponse.json({
      success: true,
      message: 'Transaction deleted successfully',
      source: 'database'
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

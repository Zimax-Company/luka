import { NextRequest, NextResponse } from 'next/server';
import { PrismaAccountService } from '@/services/prismaAccountService';
import { UpdateAccountRequest } from '@/types/account';

// GET /api/accounts/[id] - Get account by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log(`🏦 Getting account with ID: ${id}`);
    
    // Check if requesting account with stats
    const { searchParams } = new URL(request.url);
    const withStats = searchParams.get('withStats') === 'true';
    
    let account;
    if (withStats) {
      account = await PrismaAccountService.getWithStats(id);
    } else {
      account = await PrismaAccountService.getById(id);
    }
    
    if (!account) {
      return NextResponse.json(
        { success: false, error: 'Account not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: account,
      source: 'database'
    });
  } catch (error) {
    console.error('Error in GET /api/accounts/[id]:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch account' },
      { status: 500 }
    );
  }
}

// PUT /api/accounts/[id] - Update account
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log(`🏦 Updating account with ID: ${id}`);
    
    const body: UpdateAccountRequest = await request.json();
    
    // Validation
    if (body.type && !['PERSONAL', 'BUSINESS', 'SAVINGS', 'CHECKING', 'CREDIT', 'INVESTMENT'].includes(body.type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid account type' },
        { status: 400 }
      );
    }

    const account = await PrismaAccountService.update(id, body);
    
    if (!account) {
      return NextResponse.json(
        { success: false, error: 'Account not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: account,
      message: 'Account updated successfully',
      source: 'database'
    });
  } catch (error) {
    console.error('Error in PUT /api/accounts/[id]:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update account' },
      { status: 500 }
    );
  }
}

// DELETE /api/accounts/[id] - Delete (deactivate) account
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log(`🏦 Deactivating account with ID: ${id}`);
    
    // Don't allow deletion of default account
    if (id === 'acc_default_001') {
      return NextResponse.json(
        { success: false, error: 'Cannot delete the default account' },
        { status: 400 }
      );
    }
    
    await PrismaAccountService.delete(id);
    
    return NextResponse.json({
      success: true,
      message: 'Account deactivated successfully',
      source: 'database'
    });
  } catch (error) {
    console.error('Error in DELETE /api/accounts/[id]:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to deactivate account' },
      { status: 500 }
    );
  }
}

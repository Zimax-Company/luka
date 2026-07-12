import { NextRequest, NextResponse } from 'next/server';
import { PrismaAccountService } from '@/services/prismaAccountService';
import { CreateAccountRequest } from '@/types/account';

// GET /api/accounts - Get all accounts
export async function GET() {
  try {
    console.log('🏦 Getting all accounts...');
    const accounts = await PrismaAccountService.getAll();
    
    return NextResponse.json({ 
      success: true, 
      data: accounts,
      message: `Retrieved ${accounts.length} accounts`,
      source: 'database'
    });
  } catch (error) {
    console.error('Error in GET /api/accounts:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch accounts', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

// POST /api/accounts - Create a new account
export async function POST(request: NextRequest) {
  try {
    console.log('🏦 Creating new account...');
    const body: CreateAccountRequest = await request.json();
    
    // Validation
    if (!body.name || !body.type) {
      return NextResponse.json(
        { success: false, error: 'Name and type are required' },
        { status: 400 }
      );
    }

    if (!['PERSONAL', 'BUSINESS', 'SAVINGS', 'CHECKING', 'CREDIT', 'INVESTMENT'].includes(body.type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid account type' },
        { status: 400 }
      );
    }

    const account = await PrismaAccountService.create(body);
    
    return NextResponse.json(
      { 
        success: true, 
        data: account, 
        message: 'Account created successfully',
        source: 'database'
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in POST /api/accounts:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create account',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { PrismaEntryService } from '@/services/prismaEntryService';
import { CreateEntryRequest } from '@/types/entry';
import { parsePagination, paginateArray } from '@/lib/pagination';
import { getActor } from '@/lib/actor';
import { recordAudit } from '@/lib/audit';
import { getAccessibleAccountIds, scopeByAccount, canAccessAccount } from '@/lib/access';
import { notifyEntryChange } from '@/lib/notify';
import { invalidateCategoryModel } from '@/lib/categorizeStore';

// Always use database service (we have MySQL running)
function getEntryService() {
  return PrismaEntryService;
}

// GET /api/entries - Get all entries
export async function GET(request: NextRequest) {
  try {
    console.log('Getting all transactions from database...');
    
    const service = getEntryService();
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = searchParams.get('limit');
    const type = searchParams.get('type');
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const accountId = searchParams.get('accountId');
    const search = searchParams.get('search');

    let transactions;

    if (categoryId) {
      transactions = await service.getByCategory(categoryId);
    } else if (startDate && endDate) {
      transactions = await service.getByDateRange(startDate, endDate);
    } else {
      transactions = await service.getAll();
    }

    // Scope to the accounts the acting user can access (dashboard, lists, etc.).
    const actor = await getActor(request);
    const accessibleIds = await getAccessibleAccountIds(actor);
    transactions = scopeByAccount(transactions, accessibleIds);

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

    // Filter by account if specified
    if (accountId) {
      transactions = transactions.filter(transaction => transaction.accountId === accountId);
    }

    // Keyword search across note and category name
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      transactions = transactions.filter(transaction =>
        (transaction.note ?? '').toLowerCase().includes(q) ||
        (transaction.category?.name ?? '').toLowerCase().includes(q)
      );
    }

    // Apply limit if specified (kept for backwards-compatible "recent N" callers)
    if (limit) {
      const limitNum = parseInt(limit, 10);
      if (!isNaN(limitNum) && limitNum > 0) {
        transactions = transactions.slice(0, limitNum);
      }
    }

    // Opt-in pagination: when page/pageSize are present, return a page slice plus
    // pagination metadata so mobile can lazy-load as the user scrolls.
    const pagination = parsePagination(searchParams);
    if (pagination) {
      const paged = paginateArray(transactions, pagination);
      return NextResponse.json({
        success: true,
        data: paged.data,
        pagination: paged.pagination,
        count: paged.data.length,
        source: 'database'
      });
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

// POST /api/entries - Create new entry
export async function POST(request: NextRequest) {
  try {
    console.log('Creating new entry...');
    const service = getEntryService();

    const body: CreateEntryRequest = await request.json();

    // Validate required fields (note is optional)
    if (!body.date || !body.categoryId || body.amount === undefined) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields',
          message: 'date, categoryId, and amount are required'
        },
        { status: 400 }
      );
    }

    // Access control: viewers can't write; user must have access to the account.
    const actor = await getActor(request);
    if (!actor || actor.role === 'VIEWER') {
      return NextResponse.json({ success: false, error: 'Not permitted to create entries' }, { status: 403 });
    }
    if (!(await canAccessAccount(actor, body.accountId))) {
      return NextResponse.json({ success: false, error: 'No access to this account' }, { status: 403 });
    }

    const transaction = await service.create(body);

    const kind = transaction.category?.type === 'INCOME' ? 'income' : 'expense';
    recordAudit(
      actor,
      'CREATE',
      'entry',
      transaction.id,
      `Added ${kind} ${Number(transaction.amount)} · ${transaction.category?.name ?? ''}`,
    );
    // Notify other users with access to this account.
    void notifyEntryChange(actor, 'CREATE', transaction as any);
    invalidateCategoryModel(transaction.accountId); // new labeled data

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

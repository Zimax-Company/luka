import { NextRequest, NextResponse } from 'next/server';
import { PrismaCategoryService } from '@/services/prismaCategoryService';
import { CreateCategoryRequest } from '@/types/category';
import { getActor } from '@/lib/actor';
import { recordAudit } from '@/lib/audit';
import { getAccessibleAccountIds, scopeByAccount, canAccessAccount } from '@/lib/access';

// Always use database service (we have MySQL running)
function getCategoryService() {
  return PrismaCategoryService;
}

// GET /api/categories - Get categories for accounts the actor can access
export async function GET(request: NextRequest) {
  try {
    const service = getCategoryService();
    const accessibleIds = await getAccessibleAccountIds(await getActor(request));
    const categories = scopeByAccount(await service.getAll(), accessibleIds);
    return NextResponse.json({
      success: true,
      data: categories,
      source: 'database'
    });
  } catch (error) {
    console.error('Error in GET /api/categories:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch categories', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST /api/categories - Create a new category
export async function POST(request: NextRequest) {
  try {
    console.log('Creating new category...');
    const service = getCategoryService();
    const body: CreateCategoryRequest = await request.json();
    
    // Validation
    if (!body.name || !body.type) {
      return NextResponse.json(
        { success: false, error: 'Name and type are required' },
        { status: 400 }
      );
    }

    if (!['INCOME', 'EXPENSE'].includes(body.type)) {
      return NextResponse.json(
        { success: false, error: 'Type must be INCOME or EXPENSE' },
        { status: 400 }
      );
    }

    // Access control: viewers can't write; must have access to the target account.
    const actor = await getActor(request);
    if (!actor || actor.role === 'VIEWER') {
      return NextResponse.json({ success: false, error: 'Not permitted to create categories' }, { status: 403 });
    }
    if (!(await canAccessAccount(actor, body.accountId))) {
      return NextResponse.json({ success: false, error: 'No access to this account' }, { status: 403 });
    }

    const category = await service.create(body);

    recordAudit(actor, 'CREATE', 'category', category.id, `Created ${category.type} category "${category.name}"`);

    return NextResponse.json(
      {
        success: true,
        data: category,
        message: 'Category created successfully',
        source: 'database'
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in POST /api/categories:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create category', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

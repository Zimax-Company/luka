import { NextRequest, NextResponse } from 'next/server';
import { PrismaCategoryService } from '@/services/prismaCategoryService';
import { CreateCategoryRequest } from '@/types/category';

// Always use database service (we have MySQL running)
function getCategoryService() {
  return PrismaCategoryService;
}

// GET /api/categories - Get all categories
export async function GET() {
  try {
    const service = getCategoryService();
    const categories = await service.getAll();
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

    const category = await service.create(body);
    
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

import { NextRequest, NextResponse } from 'next/server';
import { CategoryService } from '@/services/categoryService';
import { CreateCategoryRequest } from '@/types/category';

// GET /api/categories - Get all categories
export async function GET() {
  try {
    const categories = await CategoryService.getAll();
    return NextResponse.json({ 
      success: true, 
      data: categories 
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}

// POST /api/categories - Create a new category
export async function POST(request: NextRequest) {
  try {
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

    const category = await CategoryService.create(body);
    
    return NextResponse.json(
      { success: true, data: category },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to create category' },
      { status: 500 }
    );
  }
}

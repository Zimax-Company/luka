import { NextRequest, NextResponse } from 'next/server';
import { PrismaCategoryService } from '@/services/prismaCategoryService';
import { UpdateCategoryRequest } from '@/types/category';

// GET /api/categories/[id] - Get category by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log(`Getting category with ID: ${id}`);
    
    const category = await PrismaCategoryService.getById(id);
    
    if (!category) {
      return NextResponse.json(
        { success: false, error: 'Category not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: category,
      source: 'database'
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch category' },
      { status: 500 }
    );
  }
}

// PUT /api/categories/[id] - Update category
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body: UpdateCategoryRequest = await request.json();
    
    // Validation
    if (body.type && !['INCOME', 'EXPENSE'].includes(body.type)) {
      return NextResponse.json(
        { success: false, error: 'Type must be INCOME or EXPENSE' },
        { status: 400 }
      );
    }

    const category = await PrismaCategoryService.update(id, body);
    
    if (!category) {
      return NextResponse.json(
        { success: false, error: 'Category not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: category,
      source: 'database'
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to update category' },
      { status: 500 }
    );
  }
}

// DELETE /api/categories/[id] - Delete category
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log(`Deleting category with ID: ${id}`);
    
    await PrismaCategoryService.delete(id);

    return NextResponse.json({
      success: true,
      message: 'Category deleted successfully',
      source: 'database'
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to delete category' },
      { status: 500 }
    );
  }
}

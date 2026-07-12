import { NextRequest, NextResponse } from 'next/server';
import { PrismaUserService } from '@/services/prismaUserService';
import { UpdateUserRequest } from '@/types/user';

// GET /api/users/[id] - Get user by ID with optional members
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const includeMembers = searchParams.get('includeMembers') === 'true';

    console.log('👤 Getting user by ID:', id);

    let user;
    if (includeMembers) {
      user = await PrismaUserService.getWithMembers(id);
    } else {
      user = await PrismaUserService.getById(id);
    }

    if (!user) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'User not found',
          message: `No user found with ID: ${id}`
        },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ 
      success: true, 
      data: user,
      message: `Retrieved user: ${user.name}`,
      source: 'database'
    });
  } catch (error) {
    console.error('Error in GET /api/users/[id]:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch user',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// PUT /api/users/[id] - Update user
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const updateData: UpdateUserRequest = await request.json();
    
    console.log('👤 Updating user:', id);

    // Validate role if provided
    if (updateData.role && !['ADMIN', 'EDITOR', 'VIEWER'].includes(updateData.role)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid role',
          message: 'Role must be ADMIN, EDITOR, or VIEWER'
        },
        { status: 400 }
      );
    }

    // Check if email already exists (if updating email)
    if (updateData.email) {
      const existingUser = await PrismaUserService.getByEmail(updateData.email);
      if (existingUser && existingUser.id !== id) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Email already exists',
            message: 'A user with this email already exists'
          },
          { status: 409 }
        );
      }
    }

    const updatedUser = await PrismaUserService.update(id, updateData);

    if (!updatedUser) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'User not found',
          message: `No user found with ID: ${id}`
        },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ 
      success: true, 
      data: updatedUser,
      message: `User ${updatedUser.name} updated successfully`
    });
    
  } catch (error) {
    console.error('Error in PUT /api/users/[id]:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update user',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// DELETE /api/users/[id] - Deactivate user (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    console.log('👤 Deactivating user:', id);

    await PrismaUserService.delete(id);
    
    return NextResponse.json({ 
      success: true, 
      message: 'User deactivated successfully'
    });
    
  } catch (error) {
    console.error('Error in DELETE /api/users/[id]:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to deactivate user',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

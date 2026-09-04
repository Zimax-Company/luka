import { NextRequest, NextResponse } from 'next/server';
import { PrismaUserService } from '@/services/prismaUserService';
import { CreateUserRequest } from '@/types/user';
import { getActor } from '@/lib/actor';
import { recordAudit } from '@/lib/audit';

// GET /api/users - Users in the caller's billable account (tenant).
// Always scoped to the actor's customer so one customer can never see another
// customer's users. The `role` query param filters within that scope; the
// legacy `adminId` param is ignored (scoping is enforced by customer, not by a
// client-supplied id).
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role') as any;

    console.log('👥 Getting users (customer-scoped)...');

    const actor = await getActor(request);
    if (!actor) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    // Only admins manage users; others get just themselves.
    const users = actor.customerId
      ? await PrismaUserService.getByCustomerId(actor.customerId, role || undefined)
      : await PrismaUserService.getSelfAndMembers(actor.id, role || undefined);

    return NextResponse.json({
      success: true,
      data: users,
      message: `Retrieved ${users.length} users`,
      source: 'database'
    });
  } catch (error) {
    console.error('Error in GET /api/users:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch users',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST /api/users - Create a new user
export async function POST(request: NextRequest) {
  try {
    const userData: CreateUserRequest = await request.json();
    
    console.log('👥 Creating user:', userData.email);

    // Validate required fields
    if (!userData.email || !userData.name || !userData.password || !userData.role) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields',
          message: 'Email, name, password, and role are required'
        },
        { status: 400 }
      );
    }

    // Validate role
    if (!['ADMIN', 'EDITOR', 'VIEWER'].includes(userData.role)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid role',
          message: 'Role must be ADMIN, EDITOR, or VIEWER'
        },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingUser = await PrismaUserService.getByEmail(userData.email);
    if (existingUser) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Email already exists',
          message: 'A user with this email already exists'
        },
        { status: 409 }
      );
    }

    // Invited users belong to the creator's billable account (and admin), so a
    // customer can have multiple admins/members under one subscription.
    const actor = await getActor(request);
    const newUser = await PrismaUserService.create({
      ...userData,
      customerId: userData.customerId ?? actor?.customerId ?? undefined,
      adminId: userData.adminId ?? actor?.id,
    });

    recordAudit(actor, 'CREATE', 'user', newUser.id, `Invited ${newUser.email} as ${newUser.role}`);

    return NextResponse.json({
      success: true,
      data: newUser,
      message: `User ${newUser.name} created successfully`
    }, { status: 201 });
    
  } catch (error) {
    console.error('Error in POST /api/users:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create user',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

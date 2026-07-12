import { NextRequest, NextResponse } from 'next/server';
import { PrismaUserService } from '@/services/prismaUserService';

// POST /api/auth/login - User login
export async function POST(request: NextRequest) {
  try {
    let email, password;
    try {
      const body = await request.json();
      email = body.email;
      password = body.password;
    } catch (parseError) {
      console.log('❌ Login failed: Invalid JSON');
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    console.log('🔐 Login attempt:', email);

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Get user by email (including password for verification)
    const user = await PrismaUserService.getByEmail(email);

    if (!user) {
      console.log('❌ Login failed: User not found');
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Simple password check (use bcrypt in production)
    if (user.password !== password) {
      console.log('❌ Login failed: Invalid password');
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Get user permissions based on role
    const permissions = PrismaUserService.getPermissions(user.role);

    console.log('✅ Login successful:', user.name, `(${user.role})`);

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json({
      user: userWithoutPassword,
      permissions,
      message: 'Login successful'
    });

  } catch (error) {
    console.error('💥 Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

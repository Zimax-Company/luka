import { User, UserWithMembers, CreateUserRequest, UpdateUserRequest, UserRole, UserPermissions } from '@/types/user';
import { createPrismaClient } from '@/lib/prismaClient';

const prisma = createPrismaClient();

export class PrismaUserService {
  
  private static logDatabaseOperation(operation: string, details?: string) {
    console.log(`👥 USER DATABASE OPERATION: ${operation}`);
    console.log(`📊 MySQL Database: luka_categories@localhost:3306`);
    if (details) console.log(`   Details: ${details}`);
  }

  // Get all users from MySQL database
  static async getAll(): Promise<User[]> {
    this.logDatabaseOperation('SELECT * FROM users WHERE is_active = TRUE ORDER BY created_at DESC');
    
    const result = await prisma.user.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log(`✅ Database returned ${result.length} active users`);
    return result.map((user: any) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as UserRole,
      isActive: user.isActive,
      adminId: user.adminId || undefined,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString()
    }));
  }

  // Get user by ID from MySQL database
  static async getById(id: string): Promise<User | null> {
    this.logDatabaseOperation('SELECT * FROM users WHERE id = ? AND is_active = TRUE', `id=${id}`);
    
    const user = await prisma.user.findFirst({
      where: { 
        id,
        isActive: true
      }
    });
    
    if (user) {
      console.log(`✅ Database found user: ${user.name} (${user.role})`);
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role as UserRole,
        isActive: user.isActive,
        adminId: user.adminId || undefined,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString()
      };
    } else {
      console.log(`❌ Database: No active user found with id=${id}`);
      return null;
    }
  }

  // Get user by email (for authentication)
  static async getByEmail(email: string): Promise<(User & { password: string }) | null> {
    this.logDatabaseOperation('SELECT * FROM users WHERE email = ? AND is_active = TRUE', `email=${email}`);
    
    const user = await prisma.user.findFirst({
      where: { 
        email,
        isActive: true
      }
    });
    
    if (user) {
      console.log(`✅ Database found user: ${user.name} (${user.role})`);
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role as UserRole,
        isActive: user.isActive,
        adminId: user.adminId || undefined,
        password: user.password,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString()
      };
    } else {
      console.log(`❌ Database: No active user found with email=${email}`);
      return null;
    }
  }

  // Get user with their members (for admins)
  static async getWithMembers(id: string): Promise<UserWithMembers | null> {
    const user = await this.getById(id);
    if (!user) return null;

    this.logDatabaseOperation('Getting user members', `userId=${id}`);

    const members = await prisma.user.findMany({
      where: { 
        adminId: id,
        isActive: true
      },
      orderBy: { name: 'asc' }
    });

    console.log(`✅ Database returned ${members.length} members for user ${user.name}`);

    return {
      ...user,
      members: members.map((member: any) => ({
        id: member.id,
        email: member.email,
        name: member.name,
        role: member.role as UserRole,
        isActive: member.isActive,
        adminId: member.adminId || undefined,
        createdAt: member.createdAt.toISOString(),
        updatedAt: member.updatedAt.toISOString()
      }))
    };
  }

  // Create new user in MySQL database
  static async create(data: CreateUserRequest): Promise<User> {
    this.logDatabaseOperation('INSERT INTO users (email, name, password, role, admin_id) VALUES (?, ?, ?, ?, ?)', 
      `${data.email} (${data.role})`);
    
    // Hash password (simplified for demo - use bcrypt in production)
    const hashedPassword = data.password; // Will implement proper hashing later
    
    const newUser = await prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        password: hashedPassword,
        role: data.role,
        adminId: data.adminId,
        customerId: data.customerId,
        isActive: true
      }
    });
    
    console.log(`✅ Database created user with id=${newUser.id}`);
    
    return {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role as UserRole,
      isActive: newUser.isActive,
      adminId: newUser.adminId || undefined,
      createdAt: newUser.createdAt.toISOString(),
      updatedAt: newUser.updatedAt.toISOString()
    };
  }

  // Update user in MySQL database
  static async update(id: string, data: UpdateUserRequest): Promise<User | null> {
    const updateFields = Object.keys(data).join(', ');
    this.logDatabaseOperation('UPDATE users SET updated_at = NOW() WHERE id = ?', `id=${id}, fields=[${updateFields}]`);
    
    try {
      const updatedUser = await prisma.user.update({
        where: { id },
        data
      });
      
      console.log(`✅ Database updated user: ${updatedUser.name} (${updatedUser.role})`);
      
      return {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.role as UserRole,
        isActive: updatedUser.isActive,
        adminId: updatedUser.adminId || undefined,
        createdAt: updatedUser.createdAt.toISOString(),
        updatedAt: updatedUser.updatedAt.toISOString()
      };
    } catch (error) {
      console.log(`❌ Database: No user found with id=${id} to update`);
      return null;
    }
  }

  // Soft delete user (set isActive to false)
  static async delete(id: string): Promise<void> {
    this.logDatabaseOperation('UPDATE users SET is_active = FALSE WHERE id = ?', `id=${id}`);
    
    try {
      const updatedUser = await prisma.user.update({
        where: { id },
        data: { isActive: false }
      });
      console.log(`✅ Database deactivated user: ${updatedUser.name}`);
    } catch (error) {
      console.log(`⚠️  Database: No user found with id=${id} to deactivate`);
    }
  }

  // Get users by role
  static async getByRole(role: UserRole): Promise<User[]> {
    this.logDatabaseOperation('SELECT * FROM users WHERE role = ? AND is_active = TRUE ORDER BY name ASC', `role=${role}`);
    
    const result = await prisma.user.findMany({
      where: { 
        role,
        isActive: true
      },
      orderBy: { name: 'asc' }
    });
    
    console.log(`✅ Database returned ${result.length} ${role} users`);
    
    return result.map((user: any) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as UserRole,
      isActive: user.isActive,
      adminId: user.adminId || undefined,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString()
    }));
  }

  // Get members of an admin user
  static async getMembersByAdminId(adminId: string): Promise<User[]> {
    this.logDatabaseOperation('SELECT * FROM users WHERE admin_id = ? AND is_active = TRUE ORDER BY name ASC', `adminId=${adminId}`);
    
    const result = await prisma.user.findMany({
      where: { 
        adminId,
        isActive: true
      },
      orderBy: { name: 'asc' }
    });
    
    console.log(`✅ Database returned ${result.length} members for admin ${adminId}`);
    
    return result.map((user: any) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as UserRole,
      isActive: user.isActive,
      adminId: user.adminId || undefined,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString()
    }));
  }

  // Check user permissions based on role
  static getPermissions(role: UserRole): UserPermissions {
    switch (role) {
      case 'ADMIN':
        return {
          canCreateAccounts: true,
          canEditAccounts: true,
          canDeleteAccounts: true,
          canCreateTransactions: true,
          canEditTransactions: true,
          canDeleteTransactions: true,
          canViewReports: true,
          canManageUsers: true
        };
      case 'EDITOR':
        return {
          canCreateAccounts: false,
          canEditAccounts: false,
          canDeleteAccounts: false,
          canCreateTransactions: true,
          canEditTransactions: true,
          canDeleteTransactions: true,
          canViewReports: true,
          canManageUsers: false
        };
      case 'VIEWER':
        return {
          canCreateAccounts: false,
          canEditAccounts: false,
          canDeleteAccounts: false,
          canCreateTransactions: false,
          canEditTransactions: false,
          canDeleteTransactions: false,
          canViewReports: true,
          canManageUsers: false
        };
      default:
        return {
          canCreateAccounts: false,
          canEditAccounts: false,
          canDeleteAccounts: false,
          canCreateTransactions: false,
          canEditTransactions: false,
          canDeleteTransactions: false,
          canViewReports: false,
          canManageUsers: false
        };
    }
  }
}

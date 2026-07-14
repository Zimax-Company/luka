export type UserRole = 'ADMIN' | 'EDITOR' | 'VIEWER';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  adminId?: string; // Reference to admin user (null for admin users)
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserRequest {
  email: string;
  name: string;
  password: string;
  role: UserRole;
  adminId?: string;
  customerId?: string; // Billable account the invited user belongs to
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  role?: UserRole;
  isActive?: boolean;
}

export interface UserWithMembers extends User {
  members: User[];
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  user: User;
  permissions: UserPermissions;
  token?: string;
  message?: string;
}

// Permission checking
export interface UserPermissions {
  canCreateAccounts: boolean;
  canEditAccounts: boolean;
  canDeleteAccounts: boolean;
  canCreateTransactions: boolean;
  canEditTransactions: boolean;
  canDeleteTransactions: boolean;
  canViewReports: boolean;
  canManageUsers: boolean;
}

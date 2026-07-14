'use client';

import { useState, useEffect } from 'react';
import { User, UserWithMembers, CreateUserRequest, UserRole, UserPermissions } from '@/types/user';
import { authFetch } from '@/lib/api';

interface UserManagementPageProps {
  currentUser: User;
  permissions: UserPermissions;
}

export default function UserManagementPage({ currentUser, permissions }: UserManagementPageProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  
  const [newUser, setNewUser] = useState<CreateUserRequest>({
    email: '',
    name: '',
    password: '',
    role: 'EDITOR',
    adminId: currentUser.role === 'ADMIN' ? currentUser.id : currentUser.adminId
  });

  // Fetch users based on current user's permissions
  const fetchUsers = async () => {
    try {
      setLoading(true);
      console.log('👥 Fetching users for:', currentUser.name);
      
      let url = '/api/users';
      if (currentUser.role === 'ADMIN') {
        // Admins see all users + their members
        url = `/api/users?adminId=${currentUser.id}`;
      } else {
        // Non-admins only see users in their organization
        url = `/api/users?adminId=${currentUser.adminId}`;
      }

      const response = await authFetch(url);
      const data = await response.json();

      if (data.success) {
        setUsers(data.data);
        console.log(`✅ Loaded ${data.data.length} users`);
      } else {
        console.error('❌ Failed to fetch users:', data.error);
      }
    } catch (error) {
      console.error('💥 Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  // Create new user
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      console.log('👤 Creating user:', newUser.email);
      
      const response = await authFetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newUser)
      });

      const data = await response.json();
      
      if (data.success) {
        console.log('✅ User created:', data.data.name);
        await fetchUsers();
        setNewUser({
          email: '',
          name: '',
          password: '',
          role: 'EDITOR',
          adminId: currentUser.role === 'ADMIN' ? currentUser.id : currentUser.adminId
        });
        setShowCreateForm(false);
      } else {
        console.error('❌ Failed to create user:', data.error);
        alert(data.error || 'Failed to create user');
      }
    } catch (error) {
      console.error('💥 Error creating user:', error);
      alert('Network error - please try again');
    }
  };

  // Deactivate user
  const handleDeactivateUser = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to deactivate user "${userName}"?`)) {
      return;
    }

    try {
      console.log('🗑️ Deactivating user:', userName);
      
      const response = await authFetch(`/api/users/${userId}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      
      if (data.success) {
        console.log('✅ User deactivated:', userName);
        await fetchUsers();
      } else {
        console.error('❌ Failed to deactivate user:', data.error);
        alert(data.error || 'Failed to deactivate user');
      }
    } catch (error) {
      console.error('💥 Error deactivating user:', error);
      alert('Network error - please try again');
    }
  };

  useEffect(() => {
    if (permissions.canManageUsers) {
      fetchUsers();
    }
  }, [permissions.canManageUsers]);

  if (!permissions.canManageUsers) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-red-400 mb-2">Access Denied</h1>
          <p className="text-muted-foreground">You don't have permission to manage users.</p>
        </div>
      </div>
    );
  }

  const selectedUser = users.find(user => user.id === selectedUserId);

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-foreground mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-6 py-8 max-w-7xl">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2 text-foreground">👥 User Management</h1>
            <p className="text-muted-foreground">Manage team members and permissions</p>
          </div>

          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors flex items-center gap-2"
          >
            <span>➕</span>
            Add User
          </button>
        </div>

        {/* Current User Info */}
        <div className="bg-card rounded-xl p-6 mb-8 border border-border">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-foreground mb-2">Current User</h2>
              <div className="text-muted-foreground">
                <span className="text-blue-400">{currentUser.name}</span> ({currentUser.email})
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                Role: <span className="text-green-400 font-medium">{currentUser.role}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Permissions:</div>
              <div className="text-xs space-y-1 mt-2">
                {permissions.canManageUsers && <div className="text-green-400">✓ Manage Users</div>}
                {permissions.canCreateAccounts && <div className="text-green-400">✓ Create Accounts</div>}
                {permissions.canCreateTransactions && <div className="text-green-400">✓ Create Transactions</div>}
                {permissions.canViewReports && <div className="text-green-400">✓ View Reports</div>}
              </div>
            </div>
          </div>
        </div>

        {/* Users List */}
        <div className="bg-card rounded-xl border border-border">
          <div className="p-6 border-b border-border">
            <h2 className="text-xl font-bold text-foreground">Team Members ({users.length})</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left py-4 px-6 text-muted-foreground font-medium">User</th>
                  <th className="text-left py-4 px-6 text-muted-foreground font-medium">Role</th>
                  <th className="text-left py-4 px-6 text-muted-foreground font-medium">Status</th>
                  <th className="text-left py-4 px-6 text-muted-foreground font-medium">Created</th>
                  <th className="text-center py-4 px-6 text-muted-foreground font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-accent transition-colors">
                    <td className="py-4 px-6">
                      <div>
                        <div className="font-medium text-foreground">{user.name}</div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        user.role === 'ADMIN' ? 'bg-red-900 text-red-200' :
                        user.role === 'EDITOR' ? 'bg-blue-900 text-blue-200' :
                        'bg-green-900 text-green-200'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        user.isActive ? 'bg-green-900 text-green-200' : 'bg-card text-muted-foreground'
                      }`}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-muted-foreground text-sm">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-6 text-center">
                      {user.id !== currentUser.id && (
                        <button
                          onClick={() => handleDeactivateUser(user.id, user.name)}
                          className="text-red-400 hover:text-red-300 transition-colors text-sm"
                        >
                          🗑️ Deactivate
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {users.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <div className="text-4xl mb-4">👥</div>
                <p>No team members found. Add your first user!</p>
              </div>
            )}
          </div>
        </div>

        {/* Create User Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-background bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-card rounded-xl p-8 w-full max-w-md border border-border">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-foreground">Add New User</h3>
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateUser} className="space-y-4">
                <div>
                  <label className="block text-muted-foreground text-sm font-medium mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={newUser.name}
                    onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                    className="w-full px-4 py-3 bg-input border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:border-blue-500"
                    placeholder="Enter full name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-muted-foreground text-sm font-medium mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                    className="w-full px-4 py-3 bg-input border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:border-blue-500"
                    placeholder="Enter email address"
                    required
                  />
                </div>

                <div>
                  <label className="block text-muted-foreground text-sm font-medium mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                    className="w-full px-4 py-3 bg-input border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:border-blue-500"
                    placeholder="Enter password"
                    required
                  />
                </div>

                <div>
                  <label className="block text-muted-foreground text-sm font-medium mb-2">
                    Role & Permissions
                  </label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({...newUser, role: e.target.value as UserRole})}
                    className="w-full px-4 py-3 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:border-blue-500"
                  >
                    <option value="EDITOR">Editor - Can create/edit transactions</option>
                    <option value="VIEWER">Viewer - Read-only access</option>
                    {currentUser.role === 'ADMIN' && (
                      <option value="ADMIN">Admin - Full access</option>
                    )}
                  </select>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="flex-1 bg-muted hover:bg-accent text-foreground py-3 px-4 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg transition-colors"
                  >
                    Create User
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

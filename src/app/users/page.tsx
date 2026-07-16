'use client';

import { useAuth } from '@/contexts/AuthContext';
import Navigation from '@/components/Navigation';
import UserManagementPage from '@/components/UserManagementPage';

export default function UsersPage() {
  const { currentUser, permissions } = useAuth();

  if (!currentUser || !permissions) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-foreground mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation />
      <main className="bg-background">
        <UserManagementPage currentUser={currentUser} permissions={permissions} />
      </main>
    </div>
  );
}

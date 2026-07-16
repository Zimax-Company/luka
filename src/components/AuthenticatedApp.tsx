'use client';

import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import LoginPage from '@/components/LoginPage';
import Navigation from '@/components/Navigation';
import DashboardContent from '@/components/DashboardContent';

function AppContent() {
  const { isAuthenticated, currentUser, permissions, loading, login } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-foreground mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading Luka Finance...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !currentUser || !permissions) {
    return <LoginPage onLogin={login} />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation currentUser={currentUser} permissions={permissions} />
      <main className="bg-background">
        <DashboardContent />
      </main>
    </div>
  );
}

export default function AuthenticatedApp() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

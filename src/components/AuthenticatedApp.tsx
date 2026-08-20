'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useActiveAccount } from '@/contexts/ActiveAccountContext';
import LoginPage from '@/components/LoginPage';
import Navigation from '@/components/Navigation';
import DashboardContent from '@/components/DashboardContent';
import AccountChooser from '@/components/AccountChooser';
import BusinessDashboard from '@/components/business/BusinessDashboard';

function AppContent() {
  const { isAuthenticated, currentUser, permissions, loading, login } = useAuth();
  const { chosen, isReady, activeAccount } = useActiveAccount();

  if (loading || !isReady) {
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

  // Profile gate: pick an account before entering the app (Netflix-style).
  if (!chosen) {
    return <AccountChooser />;
  }

  // The active account's mode drives the whole experience.
  const isBusiness = activeAccount?.mode === 'BUSINESS';

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation currentUser={currentUser} permissions={permissions} />
      <main className="bg-background">
        {isBusiness ? <BusinessDashboard /> : <DashboardContent />}
      </main>
    </div>
  );
}

export default function AuthenticatedApp() {
  return <AppContent />;
}

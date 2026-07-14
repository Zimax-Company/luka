'use client';

import Navigation from '@/components/Navigation';
import AuditPage from '@/components/AuditPage';

export default function Audit() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation />
      <main className="bg-background">
        <AuditPage />
      </main>
    </div>
  );
}

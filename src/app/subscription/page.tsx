'use client';

import Navigation from '@/components/Navigation';
import SubscriptionPage from '@/components/SubscriptionPage';

export default function Subscription() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation />
      <main className="bg-background">
        <SubscriptionPage />
      </main>
    </div>
  );
}

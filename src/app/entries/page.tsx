import { Suspense } from 'react';
import Navigation from '@/components/Navigation';
import EntriesPage from '@/components/EntriesPage';

export default function Entries() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation />
      <main className="bg-background">
        <Suspense fallback={null}>
          <EntriesPage />
        </Suspense>
      </main>
    </div>
  );
}

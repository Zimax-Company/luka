import Navigation from '@/components/Navigation';
import TransfersPage from '@/components/TransfersPage';

export default function Transfers() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation />
      <main className="bg-background">
        <TransfersPage />
      </main>
    </div>
  );
}

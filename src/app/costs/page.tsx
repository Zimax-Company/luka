import Navigation from '@/components/Navigation';
import CostsPage from '@/components/business/CostsPage';

export default function Costs() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation />
      <main className="bg-background">
        <CostsPage />
      </main>
    </div>
  );
}

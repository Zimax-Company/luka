import Navigation from '@/components/Navigation';
import TransactionsPage from '@/components/TransactionsPage';

export default function Transactions() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation />
      <main className="bg-background">
        <TransactionsPage />
      </main>
    </div>
  );
}

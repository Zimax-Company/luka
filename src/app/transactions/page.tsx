import Navigation from '@/components/Navigation';
import TransactionsPage from '@/components/TransactionsPage';

export default function Transactions() {
  return (
    <div className="min-h-screen bg-black text-white">
      <Navigation />
      <main className="bg-black">
        <TransactionsPage />
      </main>
    </div>
  );
}

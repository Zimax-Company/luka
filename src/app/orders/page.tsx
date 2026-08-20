import Navigation from '@/components/Navigation';
import OrdersPage from '@/components/business/OrdersPage';

export default function Orders() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation />
      <main className="bg-background">
        <OrdersPage />
      </main>
    </div>
  );
}

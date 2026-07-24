import Navigation from '@/components/Navigation';
import InboxPage from '@/components/InboxPage';

export default function Inbox() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation />
      <main className="bg-background">
        <InboxPage />
      </main>
    </div>
  );
}

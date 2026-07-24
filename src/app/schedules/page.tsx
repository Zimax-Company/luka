import Navigation from '@/components/Navigation';
import SchedulesPage from '@/components/SchedulesPage';

export default function Schedules() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation />
      <main className="bg-background">
        <SchedulesPage />
      </main>
    </div>
  );
}

import Navigation from "@/components/Navigation";
import DashboardContent from "@/components/DashboardContent";

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-white">
      <Navigation />
      <main className="bg-black">
        <DashboardContent />
      </main>
    </div>
  );
}

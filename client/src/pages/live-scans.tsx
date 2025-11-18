import { Header } from "@/components/header-new";
import { Footer } from "@/components/footer";
import { LiveScansDashboard } from "@/components/live-scans-dashboard";

export default function LiveScans() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <LiveScansDashboard />
      </main>
      <Footer />
    </div>
  );
}

import Navbar from "../components/Navbar";
import LandingHeader from "../components/LandingHeader";
import DashboardPreview from "../components/DashboardPreview";
import FeaturesSection from "../components/FeaturesSection";
import InternalFooter from "../components/InternalFooter";

export default function Home() {
  return (
    <main className="min-h-screen bg-brand-bg text-brand-text font-body selection:bg-brand-accent selection:text-black flex flex-col overflow-x-hidden">
      <Navbar />
      <LandingHeader />
      <DashboardPreview />
      <FeaturesSection />
      <div className="mt-auto">
        <InternalFooter />
      </div>
    </main>
  );
}

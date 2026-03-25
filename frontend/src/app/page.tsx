import Navbar from "./Navbar";

export default function Home() {
  return (
    <main className="min-h-screen bg-brand-bg text-brand-text font-body selection:bg-brand-accent selection:text-black">
      <Navbar />
      
      {/* Hero spacing */}
      <div className="pt-32 pb-16 px-6 flex flex-col items-center justify-center text-center max-w-5xl mx-auto gap-8">
        <h1 className="font-display text-6xl italic text-brand-accent animate-fade-up">
          HireLens
        </h1>
        <p className="text-brand-text-muted animate-fade-up delay-200">
          Phase 2: Navbar complete. Open localhost to view it.
        </p>
      </div>
    </main>
  );
}

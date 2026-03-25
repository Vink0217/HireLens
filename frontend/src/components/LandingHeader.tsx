export default function LandingHeader() {
  return (
    <section className="pt-32 pb-16 px-6 flex flex-col items-center justify-center text-center max-w-5xl mx-auto gap-8">
      {/* Eyebrow */}
      <div className="animate-fade-up flex items-center gap-2 px-3 py-1 rounded-full border border-brand-accent/20 bg-brand-accent/5 text-brand-accent text-sm font-medium tracking-wide">
        <span className="w-1.5 h-1.5 rounded-full bg-brand-accent animate-pulse"></span>
        Gemini 2.5 Flash Powered
      </div>

      {/* Headline */}
      <h1 className="font-display text-5xl md:text-7xl leading-[1.1] tracking-tight text-brand-text animate-fade-up delay-100 max-w-4xl">
        Stop reading resumes. <br className="hidden md:inline" />
        <span className="text-brand-accent italic">Start reading signal.</span>
      </h1>

      {/* Subtext */}
      <p className="text-lg md:text-xl text-brand-text-muted animate-fade-up delay-200 max-w-2xl leading-relaxed">
        Upload resumes in bulk, define what matters for the role, and let AI give you 
        evidence-based scores in seconds. <span className="text-brand-text">No black boxes. No endless skimming.</span>
      </p>

      {/* CTAs */}
      <div className="flex flex-col sm:flex-row items-center gap-4 mt-4 animate-fade-up delay-300">
        <button className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-brand-accent text-black font-semibold text-base hover:bg-brand-accent-dim hover:scale-105 transition-all duration-300 shadow-[0_0_20px_rgba(224,179,85,0.3)] hover:shadow-[0_0_30px_rgba(224,179,85,0.5)] cursor-pointer">
          Start Screening
        </button>
        <button className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-transparent border border-brand-border text-brand-text font-medium text-base hover:bg-brand-surface hover:border-brand-text-muted transition-all duration-300 cursor-pointer">
          See How It Works
        </button>
      </div>

      {/* Social Proof / Stats limit */}
      <div className="flex flex-wrap justify-center items-center gap-6 mt-8 animate-fade-in delay-400 opacity-60">
        <div className="flex flex-col text-left">
          <span className="text-xl font-display text-brand-text">100%</span>
          <span className="text-xs text-brand-text-muted uppercase tracking-wider">Automated dedup</span>
        </div>
        <div className="w-px h-8 bg-brand-border"></div>
        <div className="flex flex-col text-left">
          <span className="text-xl font-display text-brand-text">1-10</span>
          <span className="text-xs text-brand-text-muted uppercase tracking-wider">Justified scoring</span>
        </div>
        <div className="w-px h-8 bg-brand-border hidden sm:block"></div>
        <div className="flex flex-col text-left hidden sm:flex">
          <span className="text-xl font-display text-brand-text">Multi-role</span>
          <span className="text-xs text-brand-text-muted uppercase tracking-wider">Parallel ranking</span>
        </div>
      </div>
    </section>
  );
}

export default function FeaturesSection() {
  const features = [
    {
      title: "Configurable Extraction",
      description: "Define exactly which fields to pull — skills, years of experience, education, or anything custom. Change the config, and every resume re-extracts automatically.",
    },
    {
      title: "Evidence-Based Scoring",
      description: "Every score comes with specific justification. Not 'strong candidate' — but '5 years Python at Razorpay, directly relevant to fintech JD requirements.'",
    },
    {
      title: "Duplicate Detection",
      description: "Same resume uploaded twice for the same role? Caught instantly via content hashing. No wasted API calls, no duplicate reviews.",
    },
    {
      title: "Multi-Role Ranking",
      description: "One candidate, five open roles. Score them against all five simultaneously and see where they fit best — in seconds.",
    }
  ];

  return (
    <section className="py-32 px-6 max-w-6xl mx-auto border-t border-brand-border/20 mt-16">
      <div className="flex flex-col md:flex-row gap-16 justify-between items-start">
        
        {/* Left Column: Context */}
        <div className="md:w-1/3 sticky top-32 animate-fade-up">
          <h2 className="font-display text-4xl text-brand-text leading-tight mb-4">
            Designed for <br/>
            <span className="text-brand-accent italic">signal</span>, not noise.
          </h2>
          <p className="text-brand-text-muted text-lg">
            Built to handle thousands of applications without losing the context that makes a great hire.
          </p>
        </div>

        {/* Right Column: Features List */}
        <div className="md:w-7/12 flex flex-col gap-12">
          {features.map((feature, idx) => (
            <div 
              key={idx} 
              className={`flex flex-col gap-3 group relative pl-6 border-l border-brand-border hover:border-brand-accent transition-colors duration-500 animate-fade-up`}
              style={{ animationDelay: `${(idx + 1) * 150}ms` }}
            >
              <div className="absolute -left-[5px] top-2 w-2 h-2 rounded-full bg-brand-bg border border-brand-border group-hover:bg-brand-accent group-hover:border-brand-accent transition-colors duration-500"></div>
              
              <h3 className="text-xl font-semibold text-brand-text tracking-wide">
                {feature.title}
              </h3>
              <p className="text-brand-text-muted leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}

export default function DashboardPreview() {
  return (
    <div className="w-full max-w-5xl mx-auto mt-16 animate-fade-up delay-400 perspective-1000 px-4">
      <div className="relative w-full rounded-2xl border border-brand-border bg-brand-bg-raised shadow-2xl overflow-hidden transform-gpu hover:-translate-y-2 transition-transform duration-700">
        
        {/* Glow effect behind dashboard */}
        <div className="absolute inset-x-0 -top-px h-px w-full bg-gradient-to-r from-transparent via-brand-accent/50 to-transparent"></div>
        
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-brand-border/50 bg-brand-surface/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-brand-accent/10 flex items-center justify-center border border-brand-accent/20">
              <span className="text-brand-accent text-sm font-bold">FE</span>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-brand-text">Senior Frontend Engineer</h3>
              <p className="text-xs text-brand-text-muted">HireLens Inc. • Remote</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1a2e22] border border-[#2e523d]">
            <span className="w-2 h-2 rounded-full bg-brand-success animate-pulse"></span>
            <span className="text-xs font-medium text-brand-success">4 candidates screened</span>
          </div>
        </div>

        {/* Column Headers */}
        <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-brand-border/50 bg-brand-surface/20 text-xs font-medium text-brand-text-muted tracking-wider uppercase">
          <div className="col-span-3">Candidate</div>
          <div className="col-span-2">Match Score</div>
          <div className="col-span-5">AI Justification</div>
          <div className="col-span-2">Key Skills</div>
        </div>

        {/* Rows */}
        <div className="flex flex-col">
          
          {/* Row 1: High Match */}
          <div className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-brand-border/30 hover:bg-brand-surface/30 transition-colors group">
            <div className="col-span-3 flex flex-col justify-center">
              <span className="text-sm font-medium text-brand-text group-hover:text-brand-accent transition-colors">Priya Mehta</span>
              <span className="text-xs text-brand-text-muted">Uploaded 2 mins ago</span>
            </div>
            <div className="col-span-2 flex items-center">
              <div className="flex items-center justify-center w-12 h-12 rounded-full border-2 border-brand-success bg-[#1a2e22] text-brand-success font-bold relative">
                <span className="animate-fade-in delay-500">9.2</span>
              </div>
            </div>
            <div className="col-span-5 flex items-center pr-4">
              <p className="text-xs leading-relaxed text-[#c4c1b8]">
                &quot;5 yrs React + TypeScript. Led migration to Next.js App Router — <strong className="text-brand-success font-medium">direct JD match</strong> for core requirements.&quot;
              </p>
            </div>
            <div className="col-span-2 flex flex-wrap gap-1 items-center content-center">
              <span className="px-2 py-0.5 rounded bg-brand-surface border border-brand-border text-[10px] text-brand-text">React</span>
              <span className="px-2 py-0.5 rounded bg-brand-surface border border-brand-border text-[10px] text-brand-text">Next.js</span>
            </div>
          </div>

          {/* Row 2: Good Match */}
          <div className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-brand-border/30 hover:bg-brand-surface/30 transition-colors group">
            <div className="col-span-3 flex flex-col justify-center">
              <span className="text-sm font-medium text-brand-text group-hover:text-brand-accent transition-colors">Arjun Nair</span>
              <span className="text-xs text-brand-text-muted">Uploaded 15 mins ago</span>
            </div>
            <div className="col-span-2 flex items-center">
              <div className="flex items-center justify-center w-12 h-12 rounded-full border-2 border-brand-success/60 bg-[#1a2e22]/50 text-brand-success relative">
                <span className="animate-fade-in delay-500">7.8</span>
              </div>
            </div>
            <div className="col-span-5 flex items-center pr-4">
              <p className="text-xs leading-relaxed text-[#c4c1b8]">
                &quot;Strong component design. 3 yrs frontend, but limited context on performance optimization at scale.&quot;
              </p>
            </div>
            <div className="col-span-2 flex flex-wrap gap-1 items-center content-center">
              <span className="px-2 py-0.5 rounded bg-brand-surface border border-brand-border text-[10px] text-brand-text">TypeScript</span>
              <span className="px-2 py-0.5 rounded bg-brand-surface border border-brand-border text-[10px] text-brand-text">Vue</span>
            </div>
          </div>

          {/* Row 3: Poor Match */}
          <div className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-brand-border/30 hover:bg-brand-surface/30 transition-colors group opacity-70">
            <div className="col-span-3 flex flex-col justify-center">
              <span className="text-sm font-medium text-brand-text group-hover:text-brand-accent transition-colors">Sneha Kulkarni</span>
              <span className="text-xs text-brand-text-muted">Uploaded 1 hour ago</span>
            </div>
            <div className="col-span-2 flex items-center">
              <div className="flex items-center justify-center w-12 h-12 rounded-full border-2 border-brand-danger bg-[#3b1c1c] text-brand-danger relative">
                <span>4.2</span>
              </div>
            </div>
            <div className="col-span-5 flex items-center pr-4">
              <p className="text-xs leading-relaxed text-[#c4c1b8]">
                &quot;Junior profile. Primarily backend (Node). No production-scale React experience mentioned.&quot;
              </p>
            </div>
            <div className="col-span-2 flex flex-wrap gap-1 items-center content-center">
              <span className="px-2 py-0.5 rounded bg-brand-surface border border-brand-border text-[10px] text-brand-text">Node.js</span>
            </div>
          </div>

          {/* Row 4: Duplicate */}
          <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-brand-surface/10 hover:bg-brand-surface/30 transition-colors group opacity-50 relative overflow-hidden">
            <div className="absolute inset-0 opacity-[0.03]" style={{backgroundImage: "repeating-linear-gradient(45deg, #fff 25%, transparent 25%, transparent 75%, #fff 75%, #fff), repeating-linear-gradient(45deg, #fff 25%, transparent 25%, transparent 75%, #fff 75%, #fff)", backgroundPosition: "0 0, 10px 10px", backgroundSize: "20px 20px"}}></div>
            
            <div className="col-span-3 flex flex-col justify-center relative z-10">
              <span className="text-sm font-medium text-brand-text">Rahul Verma</span>
              <span className="text-xs text-brand-danger line-through">Rejected via 409 Conflict</span>
            </div>
            <div className="col-span-2 flex items-center relative z-10">
              <div className="px-2 py-1 rounded border border-brand-border bg-brand-surface text-[10px] text-brand-text-muted font-mono">
                DUPLICATE
              </div>
            </div>
            <div className="col-span-5 flex items-center pr-4 relative z-10">
              <p className="text-xs leading-relaxed text-brand-text-muted">
                Hashes matched exactly with application #HL-2847. Processing aborted to save API credits.
              </p>
            </div>
            <div className="col-span-2 flex flex-wrap gap-1 items-center content-center relative z-10">
              <span className="px-2 py-0.5 rounded bg-transparent border-brand-border border border-dashed text-[10px] text-brand-text-muted">Skipped</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

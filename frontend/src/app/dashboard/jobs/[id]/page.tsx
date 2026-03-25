"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, UploadCloud, FileText, CheckCircle, AlertCircle, Eye, Search, Filter } from "lucide-react";

// Mock data
const MOCK_CANDIDATES = [
  { id: 1, name: "Priya Mehta", score: 9.2, status: "Scored", match: "High", time: "2m ago", skills: ["React", "TypeScript", "Next.js"] },
  { id: 2, name: "Arjun Nair", score: 7.8, status: "Scored", match: "Medium", time: "1h ago", skills: ["Vue", "TypeScript"] },
  { id: 3, name: "Sneha Kulkarni", score: 4.2, status: "Scored", match: "Low", time: "3h ago", skills: ["Node.js", "Express"] },
  { id: 4, name: "Rahul Verma", score: null, status: "Duplicate", match: "Skipped", time: "5h ago", skills: [] },
  { id: 5, name: "processing_batch_1.pdf", score: null, status: "Processing", match: "Pending", time: "Just now", skills: [] },
];

export default function JobDetailView({ params }: { params: { id: string } }) {
  const [isUploading, setIsUploading] = useState(false);
  
  return (
    <div className="flex flex-col gap-8 animate-fade-in pb-12">
      
      {/* Top Header & Breadcrumb */}
      <header className="flex flex-col gap-4 border-b border-brand-border/30 pb-6">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-brand-text-muted hover:text-brand-text transition-colors w-fit">
          <ArrowLeft size={16} />
          <span>Back to Jobs</span>
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-display text-brand-text mb-2">Senior Backend Engineer</h1>
            <div className="flex items-center gap-3 text-sm text-brand-text-muted">
              <span className="px-2 py-0.5 rounded bg-brand-surface border border-brand-border">Remote - IND</span>
              <span>•</span>
              <span>142 Candidates</span>
              <span>•</span>
              <span className="text-brand-success font-medium flex items-center gap-1"><CheckCircle size={14}/> Active</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
             <button className="px-4 py-2 border border-brand-border bg-brand-surface text-brand-text font-medium text-sm rounded-lg hover:bg-brand-surface/80 transition-colors flex items-center gap-2">
                <SettingsToggleIcon />
                JD / Config
             </button>
          </div>
        </div>
      </header>

      {/* Main Layout: Split between Upload & List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Col: Upload Zone */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          <div 
            className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center transition-all duration-300 ${
              isUploading ? 'border-brand-accent bg-brand-accent/5' : 'border-brand-border hover:border-brand-accent/50 hover:bg-brand-surface/20'
            }`}
            onDragOver={(e) => { e.preventDefault(); setIsUploading(true); }}
            onDragLeave={() => setIsUploading(false)}
            onDrop={(e) => { e.preventDefault(); setIsUploading(false); }}
          >
            <div className="w-12 h-12 rounded-full bg-brand-surface flex items-center justify-center mb-4 text-brand-accent">
              <UploadCloud size={24} />
            </div>
            <h3 className="text-brand-text font-medium mb-1">Drag & Drop Resumes</h3>
            <p className="text-xs text-brand-text-muted mb-4">PDF, DOCX up to 10MB each.</p>
            <button className="px-4 py-2 bg-brand-surface border border-brand-border text-brand-text text-sm rounded-lg hover:border-brand-accent transition-colors cursor-pointer">
              Browse Files
            </button>
          </div>

          {/* Quick Stats */}
          <div className="bg-brand-surface/30 border border-brand-border/50 rounded-xl p-5 border-l-2 border-l-brand-success">
            <h4 className="text-xs font-bold uppercase tracking-wider text-brand-text-muted mb-3">Pipeline Health</h4>
            <div className="grid grid-cols-2 gap-4">
               <div>
                 <p className="text-2xl font-light text-brand-text">14</p>
                 <p className="text-xs text-brand-success font-medium">High Match (8+)</p>
               </div>
               <div>
                 <p className="text-2xl font-light text-brand-text">42</p>
                 <p className="text-xs text-brand-text-muted">Total Screened</p>
               </div>
            </div>
          </div>
        </div>

        {/* Right Col: Candidate List */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          
          {/* List Controls */}
          <div className="flex items-center justify-between gap-4">
             <div className="relative flex-1 max-w-sm">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-muted" />
                <input type="text" placeholder="Search candidates or skills..." className="w-full pl-9 pr-4 py-2 bg-brand-surface border border-brand-border rounded-lg text-sm text-brand-text focus:border-brand-accent focus:outline-none transition-colors" />
             </div>
             <button className="p-2 border border-brand-border rounded-lg text-brand-text-muted hover:text-brand-text hover:bg-brand-surface transition-colors">
               <Filter size={18} />
             </button>
          </div>

          {/* The Table */}
          <div className="bg-brand-bg-raised border border-brand-border/50 rounded-xl overflow-hidden">
            <div className="grid grid-cols-12 gap-4 px-5 py-3 border-b border-brand-border/50 bg-brand-surface/40 text-xs font-medium text-brand-text-muted tracking-wider uppercase">
              <div className="col-span-4">Candidate</div>
              <div className="col-span-2">Score</div>
              <div className="col-span-4">Status</div>
              <div className="col-span-2 text-right">Action</div>
            </div>

            <div className="flex flex-col divide-y divide-brand-border/30">
              {MOCK_CANDIDATES.map((c) => (
                <div key={c.id} className="grid grid-cols-12 gap-4 px-5 py-4 items-center hover:bg-brand-surface/30 transition-colors group">
                  <div className="col-span-4 flex flex-col">
                    <span className="text-sm font-medium text-brand-text">{c.name}</span>
                    <span className="text-xs text-brand-text-muted">{c.time}</span>
                  </div>
                  
                  <div className="col-span-2">
                    {c.score ? (
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full border text-xs font-bold ${
                        c.score >= 8 ? 'border-brand-success text-brand-success bg-brand-success/10' :
                        c.score >= 5 ? 'border-brand-accent text-brand-accent bg-brand-accent/10' :
                        'border-brand-danger text-brand-danger bg-brand-danger/10'
                      }`}>
                        {c.score}
                      </span>
                    ) : (
                      <span className="text-xs text-brand-text-muted font-mono">—</span>
                    )}
                  </div>

                  <div className="col-span-4 flex items-center">
                     {c.status === "Processing" ? (
                       <div className="flex items-center gap-2 text-xs text-brand-accent">
                         <div className="w-3 h-3 border-2 border-brand-accent border-t-transparent rounded-full animate-spin"></div>
                         Extracting via Gemini...
                       </div>
                     ) : c.status === "Duplicate" ? (
                       <div className="flex items-center gap-1.5 text-xs text-brand-text-muted">
                         <AlertCircle size={14} className="opacity-50" />
                         Skipped (Hash Match)
                       </div>
                     ) : (
                       <div className="flex flex-wrap gap-1">
                          {c.skills.slice(0, 2).map(s => (
                            <span key={s} className="px-2 py-0.5 rounded bg-brand-surface border border-brand-border text-[10px] text-brand-text">{s}</span>
                          ))}
                          {c.skills.length > 2 && <span className="px-1 py-0.5 text-[10px] text-brand-text-muted">+{c.skills.length - 2}</span>}
                       </div>
                     )}
                  </div>

                  <div className="col-span-2 flex justify-end">
                    <button className="p-1.5 text-brand-text-muted hover:text-brand-accent hover:bg-brand-accent/10 rounded transition-colors" title="View Full Analysis">
                      <Eye size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsToggleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
      <circle cx="12" cy="12" r="3"></circle>
    </svg>
  );
}

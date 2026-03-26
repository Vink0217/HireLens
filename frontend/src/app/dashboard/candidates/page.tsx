"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, Filter, AlertCircle, Eye, Users, Trash2, Loader2 } from "lucide-react";
import useSWR from "swr";
import { fetcher, deleteResume } from "@/lib/api";

interface BackendResume {
  id: string;
  file_name: string;
  file_type: string;
  extracted_data?: any;
  score?: number;
  summary?: string;
  confidence?: string;
  screened_at?: string;
  job_id?: string;
  job_title?: string;
  job_company?: string;
}

export default function GlobalCandidatesView() {
  const { data: swrCandidates, error, mutate } = useSWR("/resumes", fetcher);
  const candidates = Array.isArray(swrCandidates) ? swrCandidates : [];
  const isLoading = !swrCandidates && !error;

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState("All Roles");
  const [minScore, setMinScore] = useState(0);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteResumeId, setDeleteResumeId] = useState<string | null>(null);
  const [deleteResumeName, setDeleteResumeName] = useState("");

  const confirmDelete = async () => {
    if (!deleteResumeId) return;
    setIsDeleting(true);
    try {
      await deleteResume(deleteResumeId);
      mutate();
      setDeleteResumeId(null);
    } catch (error) {
      console.error(error);
      alert("Failed to delete resume.");
    } finally {
      setIsDeleting(false);
    }
  };

  const groupedCandidates = useMemo(() => {
    const groups: Record<string, any> = {};
    
    candidates.forEach((c: any) => {
      let name = c.file_name;
      if (c.extracted_data) {
        try {
          const data = typeof c.extracted_data === "string" ? JSON.parse(c.extracted_data) : c.extracted_data;
          name = data.name || data.full_name || data.candidate_name || name;
        } catch (e) {}
      }
      
      if (!groups[name]) {
        groups[name] = {
           id: c.id,
           name: name,
           roles: [],
           best_score: 0,
           best_summary: c.summary,
           file_type: c.file_type,
           screened_at: c.screened_at,
        };
      }
      
      const score = c.score || 0;
      if (score > groups[name].best_score) {
         groups[name].best_score = score;
      }
      // Always favor a summary that actually exists
      if (c.summary && (!groups[name].best_summary || score >= groups[name].best_score)) {
         groups[name].best_summary = c.summary;
      }
      
      if (c.job_title && c.job_title !== 'null' && c.job_id !== 'null') {
        if (!groups[name].roles.find((r: any) => r.title === c.job_title)) {
          groups[name].roles.push({
            title: c.job_title,
            company: c.job_company,
            score: c.score,
            id: c.id,
            job_id: c.job_id
          });
        }
      }
    });
    
    return Object.values(groups).sort((a, b) => b.best_score - a.best_score);
  }, [candidates]);

  let filteredGroups = groupedCandidates.filter(g => 
    g.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    g.roles.some((r: any) => r.title.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (selectedRole !== "All Roles") {
    filteredGroups = filteredGroups.filter(g => g.roles.some((r: any) => r.title === selectedRole));
  }

  if (minScore > 0) {
    filteredGroups = filteredGroups.filter(g => g.best_score >= minScore);
  }

  const uniqueRoles = Array.from(new Set(candidates.map((c: any) => c.job_title).filter(title => Boolean(title) && title !== 'null'))) as string[];

  return (
    <div className="flex flex-col gap-8 animate-fade-in pb-12">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between border-b border-brand-border/30 pb-6 gap-4">
        <div>
          <h1 className="text-3xl font-display text-brand-text mb-1 tracking-wide flex items-center gap-3">
            <Users size={28} className="text-brand-accent" />
            Talent Pool
          </h1>
          <p className="text-sm text-brand-text-muted">Global directory of all processed candidates across all requisitions.</p>
        </div>
      </header>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
         <div className="relative flex-1 w-full max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-muted" />
            <input 
              type="text" 
              placeholder="Search by name or job title..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-brand-surface/50 border border-brand-border rounded-lg text-sm text-brand-text focus:border-brand-accent focus:bg-brand-surface focus:outline-none transition-all shadow-inner" 
            />
         </div>
         <div className="relative">
           <button 
             onClick={() => setIsFilterOpen(!isFilterOpen)}
             className={`px-4 py-2.5 border rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${(selectedRole !== "All Roles" || minScore > 0) ? 'bg-brand-accent/10 border-brand-accent text-brand-accent shadow-[0_0_10px_rgba(224,179,85,0.2)]' : 'bg-brand-surface border-brand-border text-brand-text hover:border-brand-accent/50'} cursor-pointer`}
           >
             <Filter size={16} />
             Filters {(selectedRole !== "All Roles" || minScore > 0) && "(Active)"}
           </button>

           {isFilterOpen && (
             <div className="absolute right-0 top-full mt-2 w-72 bg-brand-bg-raised border border-brand-border/50 rounded-xl shadow-2xl p-5 z-50 animate-fade-in flex flex-col gap-5">
               
               <div className="flex items-center justify-between border-b border-brand-border/30 pb-3">
                 <h3 className="text-sm font-bold text-brand-text">Filter Candidates</h3>
                 <button onClick={() => { setSelectedRole("All Roles"); setMinScore(0); }} className="text-xs font-medium text-brand-text-muted hover:text-brand-accent transition-colors">Clear All</button>
               </div>
               
               <div>
                 <label className="block text-[10px] font-bold text-brand-text-muted uppercase tracking-wider mb-2">Applied Role</label>
                 <select 
                   value={selectedRole}
                   onChange={(e) => setSelectedRole(e.target.value)}
                   className="w-full px-3 py-2 bg-brand-surface border border-brand-border rounded-lg text-sm text-brand-text focus:outline-none focus:border-brand-accent transition-all cursor-pointer appearance-none"
                   style={{ backgroundImage: "none" }}
                 >
                   <option value="All Roles">All Roles</option>
                   {uniqueRoles.map(role => (
                     <option key={role} value={role}>{role}</option>
                   ))}
                 </select>
               </div>

               <div>
                 <label className="block text-[10px] font-bold text-brand-text-muted uppercase tracking-wider mb-2">Minimum Match Score</label>
                 <select 
                   value={minScore.toString()}
                   onChange={(e) => setMinScore(Number(e.target.value))}
                   className="w-full px-3 py-2 bg-brand-surface border border-brand-border rounded-lg text-sm text-brand-text focus:outline-none focus:border-brand-accent transition-all cursor-pointer appearance-none"
                   style={{ backgroundImage: "none" }}
                 >
                   <option value="0">All Scores</option>
                   <option value="5">Score &ge; 5 (Average)</option>
                   <option value="7">Score &ge; 7 (Good)</option>
                   <option value="8">Score &ge; 8 (High Match)</option>
                   <option value="9">Score &ge; 9 (Exceptional)</option>
                 </select>
               </div>
               
               <button onClick={() => setIsFilterOpen(false)} className="w-full py-2 bg-brand-accent/10 border border-brand-accent text-brand-accent rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-brand-accent hover:text-black transition-all">
                 Apply Filters
               </button>
             </div>
           )}
         </div>
      </div>

      <div className="bg-brand-bg-raised border border-brand-border/50 rounded-xl overflow-hidden min-h-[500px] shadow-lg">
        <div className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-brand-border/50 bg-brand-surface/60 text-xs font-bold text-brand-text-muted tracking-wider uppercase">
          <div className="col-span-3">Candidate</div>
          <div className="col-span-3">Applied Role</div>
          <div className="col-span-2">Match Score</div>
          <div className="col-span-3">Analysis Snapshot</div>
          <div className="col-span-1 text-right">View</div>
        </div>

        {isLoading ? (
           <div className="flex justify-center items-center h-64">
             <div className="w-8 h-8 rounded-full border-2 border-brand-accent border-t-transparent animate-spin"></div>
           </div>
        ) : filteredGroups.length === 0 ? (
           <div className="flex flex-col justify-center items-center h-64 text-center">
             <Search size={32} className="text-brand-text-muted/30 mb-4" />
             <p className="text-brand-text-muted mb-2 font-medium">No candidates found.</p>
             <p className="text-xs text-brand-text-muted/60">Try adjusting your search or filters.</p>
           </div>
        ) : (
          <div className="flex flex-col divide-y divide-brand-border/30">
            {filteredGroups.map((g) => {
              const isHighMatch = g.best_score >= 8;
              
              return (
                <div key={g.id} className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-brand-surface/20 transition-colors group">
                  <div className="col-span-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-brand-surface border border-brand-border/50 flex items-center justify-center text-xs font-bold text-brand-accent uppercase shrink-0">
                        {g.name.substring(0, 2)}
                      </div>
                      <div className="truncate">
                        <p className="text-sm font-medium text-brand-text truncate" title={g.name}>{g.name}</p>
                        <p className="text-[10px] text-brand-text-muted mt-0.5 uppercase tracking-wider">{g.file_type.replace('.', '')} • {new Date(g.screened_at || "").toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="col-span-3">
                    <div className="flex flex-wrap gap-1.5 -ml-2">
                      {g.roles.length > 0 ? g.roles.map((role: any, idx: number) => (
                        <Link key={idx} href={`/dashboard/jobs/${role.job_id}`} className="group-hover:bg-brand-surface/80 bg-brand-surface/50 border border-brand-border/50 px-2 py-1.5 rounded-lg transition-colors flex items-center gap-2">
                          <div>
                            <p className="text-[11px] font-bold text-brand-accent hover:underline leading-tight truncate max-w-[120px]" title={role.title}>{role.title}</p>
                            <p className="text-[9px] text-brand-text-muted leading-tight">{role.company || "HireLens Internal"}</p>
                          </div>
                          {role.score != null && (
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${role.score >= 8 ? 'bg-brand-success/20 text-brand-success' : 'bg-brand-surface border border-brand-border text-brand-text-muted'}`}>{role.score}</span>
                          )}
                        </Link>
                      )) : (
                        <span className="text-xs text-brand-text-muted italic px-2">General Application</span>
                      )}
                    </div>
                  </div>

                  <div className="col-span-2">
                    <div className="flex items-center gap-2.5">
                      <div className={`text-xl font-light w-8 text-center ${isHighMatch ? 'text-brand-success font-medium' : 'text-brand-text'}`}>
                        {g.best_score || 0}
                      </div>
                      <div className="flex-1 h-1.5 bg-brand-surface rounded-full overflow-hidden max-w-[80px]">
                        <div 
                          className={`h-full rounded-full ${isHighMatch ? 'bg-brand-success shadow-[0_0_8px_rgba(74,222,128,0.5)]' : 'bg-brand-accent opacity-70'}`}
                          style={{ width: `${(g.best_score || 0) * 10}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="col-span-3">
                    <p className="text-xs text-brand-text-muted line-clamp-2 leading-relaxed">
                      {g.best_summary || "No summary generated."}
                    </p>
                  </div>

                  <div className="col-span-1 flex justify-end gap-2">
                    <Link href={`/dashboard/jobs/${g.roles[0]?.job_id || ''}`} className="w-8 h-8 rounded-full border border-brand-border/50 flex items-center justify-center text-brand-text-muted hover:text-brand-accent hover:border-brand-accent transition-colors" title="View Profile">
                      <Eye size={14} />
                    </Link>
                    <button 
                      onClick={() => { setDeleteResumeId(g.id); setDeleteResumeName(g.name); }}
                      className="w-8 h-8 rounded-full border border-brand-border/50 flex items-center justify-center text-brand-text-muted hover:text-brand-danger hover:border-brand-danger transition-colors disabled:opacity-50"
                      title="Delete Candidate"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteResumeId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-brand-bg-raised border border-brand-border w-full max-w-md rounded-2xl shadow-2xl p-8 flex flex-col gap-5 text-center items-center">
            <div className="w-16 h-16 rounded-full bg-brand-danger/10 text-brand-danger flex items-center justify-center mb-2">
              <Trash2 size={32} />
            </div>
            <div>
              <h3 className="text-2xl font-display text-brand-text mb-2">Permanently Delete?</h3>
              <p className="text-brand-text-muted text-sm leading-relaxed max-w-sm">
                Are you sure you want to permanently delete <strong className="text-brand-text font-bold">{deleteResumeName}</strong>? This action cannot be undone and will remove all associated feedback, scores, and raw files across all requisitions.
              </p>
            </div>
            
            <div className="flex items-center justify-center gap-3 mt-4 w-full">
              <button 
                onClick={() => setDeleteResumeId(null)}
                disabled={isDeleting}
                className="flex-1 py-3 text-sm font-bold text-brand-text-muted hover:text-brand-text bg-brand-surface/50 border border-brand-border rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={confirmDelete}
                disabled={isDeleting}
                className="flex-1 py-3 bg-brand-danger text-white text-sm font-bold rounded-xl hover:brightness-110 flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(239,68,68,0.3)] disabled:opacity-50 cursor-pointer"
              >
                {isDeleting ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                {isDeleting ? "Deleting..." : "Permanently Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

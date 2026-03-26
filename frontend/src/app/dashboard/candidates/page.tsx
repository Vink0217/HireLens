"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { Search, Filter, Eye, Users, Trash2, Loader2, X, Layers3, FileSearch, ExternalLink } from "lucide-react";
import useSWR from "swr";
import { fetcher, deleteResume, runMultiRoleRanking, fetchRagEvidence, MultiRoleResult, RagEvidenceChunk } from "@/lib/api";

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

interface JobLite {
  id: string;
  title: string;
  company?: string;
}

export default function GlobalCandidatesView() {
  const { data: swrCandidates, error, mutate } = useSWR("/resumes", fetcher);
  const { data: swrJobs } = useSWR<JobLite[]>("/jobs", fetcher);
  const candidates = Array.isArray(swrCandidates) ? swrCandidates : [];
  const allJobs = Array.isArray(swrJobs) ? swrJobs : [];
  const isLoading = !swrCandidates && !error;
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState("All Roles");
  const [minScore, setMinScore] = useState(0);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteResumeId, setDeleteResumeId] = useState<string | null>(null);
  const [deleteResumeName, setDeleteResumeName] = useState("");
  const [selectedCandidate, setSelectedCandidate] = useState<any | null>(null);
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([]);
  const [multiRoleResults, setMultiRoleResults] = useState<MultiRoleResult[]>([]);
  const [isRunningMultiRole, setIsRunningMultiRole] = useState(false);
  const [multiRoleError, setMultiRoleError] = useState<string | null>(null);
  const [ragEvidence, setRagEvidence] = useState<RagEvidenceChunk[]>([]);
  const [isLoadingRagEvidence, setIsLoadingRagEvidence] = useState(false);
  const [ragError, setRagError] = useState<string | null>(null);
  const filterMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isFilterOpen) return;

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (filterMenuRef.current && !filterMenuRef.current.contains(target)) {
        setIsFilterOpen(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [isFilterOpen]);

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
           file_name: c.file_name,
           file_url: c.file_url,
           extracted_data: c.extracted_data,
        };
      }
      
      const score = c.score || 0;
      if (score > groups[name].best_score) {
         groups[name].best_score = score;
        groups[name].id = c.id;
        groups[name].file_name = c.file_name;
        groups[name].file_type = c.file_type;
        groups[name].file_url = c.file_url;
        groups[name].extracted_data = c.extracted_data;
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

  const getParsedData = (candidate: any) => {
    if (!candidate?.extracted_data) return {};
    try {
      return typeof candidate.extracted_data === "string"
        ? JSON.parse(candidate.extracted_data)
        : candidate.extracted_data;
    } catch {
      return {};
    }
  };

  const buildDownloadName = (candidate: any) => {
    const baseName = (candidate.file_name || "resume").trim();
    const ext = (candidate.file_type || "").toLowerCase();
    if (!ext) return baseName;
    return baseName.toLowerCase().endsWith(`.${ext}`) ? baseName : `${baseName}.${ext}`;
  };

  const triggerBlobDownload = (blob: Blob, filename: string) => {
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
  };

  const openResumeFile = async (candidate: any) => {
    const downloadUrl = `${apiBaseUrl}/resumes/${candidate.id}/download`;
    const filename = buildDownloadName(candidate);

    try {
      const response = await fetch(downloadUrl);
      if (response.ok) {
        const blob = await response.blob();
        triggerBlobDownload(blob, filename);
        return;
      }
    } catch {
      // fallback below
    }

    if (candidate.file_url) {
      window.open(candidate.file_url, "_blank", "noopener,noreferrer");
      return;
    }

    alert("Resume file is unavailable right now.");
  };

  const toggleJobSelection = (jobIdValue: string) => {
    setSelectedJobIds((prev) =>
      prev.includes(jobIdValue)
        ? prev.filter((id) => id !== jobIdValue)
        : [...prev, jobIdValue]
    );
  };

  const handleRunMultiRole = async () => {
    if (!selectedCandidate || selectedJobIds.length === 0) {
      setMultiRoleError("Select at least one role to compare.");
      return;
    }

    setIsRunningMultiRole(true);
    setMultiRoleError(null);
    try {
      const results = await runMultiRoleRanking(selectedCandidate.id, selectedJobIds);
      setMultiRoleResults(results);
    } catch (err: any) {
      setMultiRoleError(err?.response?.data?.detail || "Failed to run multi-role ranking.");
      setMultiRoleResults([]);
    } finally {
      setIsRunningMultiRole(false);
    }
  };

  const handleLoadRagEvidence = async () => {
    if (!selectedCandidate) return;
    const baseJobId = selectedCandidate.roles?.[0]?.job_id;
    if (!baseJobId) {
      setRagError("This candidate has no linked role for evidence retrieval.");
      return;
    }

    setIsLoadingRagEvidence(true);
    setRagError(null);
    try {
      const data = await fetchRagEvidence(selectedCandidate.id, baseJobId, 4);
      setRagEvidence(data.chunks || []);
    } catch (err: any) {
      setRagError(err?.response?.data?.detail || "Failed to load evidence snippets.");
      setRagEvidence([]);
    } finally {
      setIsLoadingRagEvidence(false);
    }
  };

  const openCandidateAnalysis = (candidate: any) => {
    setSelectedCandidate(candidate);
    setSelectedJobIds([]);
    setMultiRoleResults([]);
    setMultiRoleError(null);
    setRagEvidence([]);
    setRagError(null);
  };

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
         <div className="relative" ref={filterMenuRef}>
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
                    <button
                      type="button"
                      onClick={() => openCandidateAnalysis(g)}
                      className="w-8 h-8 rounded-full border border-brand-border/50 flex items-center justify-center text-brand-text-muted hover:text-brand-accent hover:border-brand-accent transition-colors"
                      title="View Analysis"
                    >
                      <Eye size={14} />
                    </button>
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

      {selectedCandidate && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm p-4 md:p-6 overflow-y-auto"
          onClick={() => setSelectedCandidate(null)}
        >
          <div
            className="max-w-4xl mx-auto border border-brand-border rounded-2xl bg-brand-bg-raised shadow-[0_20px_80px_rgba(0,0,0,0.5)] animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 md:p-6 border-b border-brand-border/40 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-brand-text-muted mb-2">Global Candidate Analysis</p>
                <h2 className="text-2xl font-display text-brand-text">{selectedCandidate.name}</h2>
                <p className="text-sm text-brand-text-muted mt-1">
                  Best Score: <span className="text-brand-accent font-semibold">{selectedCandidate.best_score || 0}/10</span>
                </p>
              </div>
              <button
                onClick={() => setSelectedCandidate(null)}
                className="p-2 rounded-lg border border-brand-border text-brand-text-muted hover:text-brand-text hover:border-brand-accent transition-colors"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 md:p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="rounded-xl border border-brand-border/50 bg-brand-surface/25 p-4">
                  <p className="text-xs uppercase tracking-wider text-brand-text-muted mb-3">Profile Snapshot</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-brand-text-muted">Candidate</span>
                      <span className="text-brand-text">{selectedCandidate.name}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-brand-text-muted">Top Summary</span>
                      <span className="text-brand-text text-right max-w-[65%] truncate" title={selectedCandidate.best_summary || "N/A"}>
                        {selectedCandidate.best_summary || "N/A"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-brand-text-muted">Roles Applied</span>
                      <span className="text-brand-text">{selectedCandidate.roles?.length || 0}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-brand-border/50 bg-brand-surface/30 p-4">
                  <p className="text-xs uppercase tracking-wider text-brand-text-muted mb-3">Resume Access</p>
                  <button
                    type="button"
                    onClick={() => openResumeFile(selectedCandidate)}
                    className="inline-flex w-full items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-brand-accent/90 text-black text-sm font-semibold hover:bg-brand-accent transition-colors"
                  >
                    <span>Open Original Resume</span>
                    <ExternalLink size={15} />
                  </button>
                </div>

                <div className="rounded-xl border border-brand-border/50 bg-brand-surface/25 p-4">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <FileSearch size={16} className="text-brand-accent" />
                      <p className="text-sm font-semibold text-brand-text">RAG Evidence Snippets</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleLoadRagEvidence}
                      disabled={isLoadingRagEvidence}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-surface border border-brand-border text-brand-text hover:border-brand-accent hover:text-brand-accent disabled:opacity-50 transition-colors"
                    >
                      {isLoadingRagEvidence ? "Loading..." : "Load Evidence"}
                    </button>
                  </div>
                  {ragError && <p className="text-xs text-brand-danger mb-2">{ragError}</p>}
                  {ragEvidence.length === 0 ? (
                    <p className="text-xs text-brand-text-muted">Load to see resume chunks most relevant to this candidate's top role.</p>
                  ) : (
                    <div className="space-y-2">
                      {ragEvidence.map((chunk, idx) => (
                        <div key={`${chunk.chunk_type}-${idx}`} className="rounded-lg border border-brand-border/40 bg-brand-bg/40 p-3">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-[11px] uppercase tracking-wider text-brand-accent">{chunk.chunk_type}</p>
                            <p className="text-[11px] text-brand-text-muted">match {(chunk.similarity * 100).toFixed(1)}%</p>
                          </div>
                          <p className="text-xs text-brand-text-muted line-clamp-4">{chunk.chunk_text}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-xl border border-brand-border/50 bg-brand-surface/25 p-4">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <Layers3 size={16} className="text-brand-accent" />
                      <p className="text-sm font-semibold text-brand-text">Multi-Role Ranking</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleRunMultiRole}
                      disabled={isRunningMultiRole || selectedJobIds.length === 0}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-accent text-black hover:bg-brand-accent-dim disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isRunningMultiRole ? "Running..." : "Compare"}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-2 mb-3 max-h-52 overflow-auto pr-1">
                    {allJobs.length === 0 ? (
                      <p className="text-xs text-brand-text-muted">No jobs available for comparison.</p>
                    ) : (
                      allJobs.map((job) => (
                        <label
                          key={job.id}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-brand-border/50 bg-brand-surface/40 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedJobIds.includes(job.id)}
                            onChange={() => toggleJobSelection(job.id)}
                            className="accent-[#E0B355]"
                          />
                          <span className="text-xs text-brand-text truncate">{job.title}</span>
                        </label>
                      ))
                    )}
                  </div>

                  {multiRoleError && <p className="text-xs text-brand-danger mb-2">{multiRoleError}</p>}

                  {multiRoleResults.length > 0 ? (
                    <div className="space-y-2">
                      {multiRoleResults.map((result) => (
                        <div key={result.job_id} className="rounded-lg border border-brand-border/40 bg-brand-bg/40 p-3">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <p className="text-xs font-semibold text-brand-text truncate">{result.job_title}</p>
                            <span className="text-xs font-bold text-brand-accent">{result.score}/10</span>
                          </div>
                          <p className="text-xs text-brand-text-muted line-clamp-2">{result.summary}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-brand-text-muted">Select one or more roles and click Compare.</p>
                  )}
                </div>

                <div className="rounded-xl border border-brand-border/50 bg-gradient-to-r from-brand-success/10 via-brand-surface/30 to-brand-accent/10 p-4">
                  <p className="text-sm font-semibold text-brand-text mb-2">Applied Roles</p>
                  <div className="flex flex-wrap gap-2">
                    {(selectedCandidate.roles || []).map((role: any, idx: number) => (
                      <span key={`${role.title}-${idx}`} className="px-2.5 py-1 rounded-full text-xs border border-brand-border/50 bg-brand-surface/50 text-brand-text-muted">
                        {role.title}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteResumeId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setDeleteResumeId(null)}
        >
          <div
            className="bg-brand-bg-raised border border-brand-border w-full max-w-md rounded-2xl shadow-2xl p-8 flex flex-col gap-5 text-center items-center"
            onClick={(e) => e.stopPropagation()}
          >
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

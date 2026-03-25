"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, UploadCloud, CheckCircle, AlertCircle, Eye, Search, Filter } from "lucide-react";
import { fetchResumesForJob, uploadResume } from "@/lib/api";

interface Resume {
  id: string;
  candidate_name: string;
  status: string;
  score: number | null;
  match_category: string;
  skills: string[];
  justification: string | null;
  created_at: string;
}

export default function JobDetailView({ params }: { params: { id: string } }) {
  const jobId = params.id;
  const [candidates, setCandidates] = useState<Resume[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadCandidates = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await fetchResumesForJob(jobId);
      // Backend returns either an array of resumes or a single job object with resumes
      // Adjust based on exact backend shape, assuming an array of resumes for now
      setCandidates(Array.isArray(data) ? data : data?.resumes || []);
    } catch (error) {
      console.error("Failed to load candidates", error);
    } finally {
      setIsLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    loadCandidates();
    
    // Optional polling for processing resumes
    const interval = setInterval(() => {
       loadCandidates();
    }, 10000); // refresh every 10s
    return () => clearInterval(interval);
  }, [loadCandidates]);

  const handleFileUpload = async (file: File) => {
    try {
      setIsUploading(true);
      await uploadResume(jobId, file);
      await loadCandidates();
    } catch (error) {
      console.error("Upload failed", error);
      alert("Failed to upload and process resume. Check backend logs.");
    } finally {
      setIsUploading(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };
  
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
            <h1 className="text-3xl font-display text-brand-text mb-2">Requirement: {jobId}</h1>
            <div className="flex items-center gap-3 text-sm text-brand-text-muted">
              <span className="text-brand-success font-medium flex items-center gap-1"><CheckCircle size={14}/> Polling Active</span>
              <span>•</span>
              <span>{candidates.length} Candidates</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout: Split between Upload & List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Col: Upload Zone */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          <div 
            className={`relative border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center transition-all duration-300 ${
              isDragging ? 'border-brand-accent bg-brand-accent/5' : 'border-brand-border hover:border-brand-accent/50 hover:bg-brand-surface/20'
            }`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
          >
            {isUploading && (
              <div className="absolute inset-0 z-10 bg-brand-bg/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-xl">
                 <div className="w-8 h-8 rounded-full border-2 border-brand-accent border-t-transparent animate-spin mb-3"></div>
                 <p className="text-sm text-brand-text font-medium text-brand-accent animate-pulse">Processing via Gemini...</p>
                 <p className="text-xs text-brand-text-muted mt-1">This takes ~5 seconds</p>
              </div>
            )}
            
            <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-0" onChange={onFileInput} accept=".pdf,.doc,.docx" />
            
            <div className="w-12 h-12 rounded-full bg-brand-surface flex items-center justify-center mb-4 text-brand-accent relative z-0 pointer-events-none">
              <UploadCloud size={24} />
            </div>
            <h3 className="text-brand-text font-medium mb-1 relative z-0 pointer-events-none">Drag & Drop Resumes</h3>
            <p className="text-xs text-brand-text-muted mb-4 relative z-0 pointer-events-none">PDF up to 10MB each.</p>
            <button className="px-4 py-2 bg-brand-surface border border-brand-border text-brand-text text-sm rounded-lg hover:border-brand-accent transition-colors relative z-0 pointer-events-none">
              Browse Files
            </button>
          </div>

          <div className="bg-brand-surface/30 border border-brand-border/50 rounded-xl p-5 border-l-2 border-l-brand-success">
            <h4 className="text-xs font-bold uppercase tracking-wider text-brand-text-muted mb-3">Pipeline Health</h4>
            <div className="grid grid-cols-2 gap-4">
               <div>
                 <p className="text-2xl font-light text-brand-text">{candidates.filter(c => (c.score || 0) >= 8).length}</p>
                 <p className="text-xs text-brand-success font-medium">High Match (8+)</p>
               </div>
               <div>
                 <p className="text-2xl font-light text-brand-text">{candidates.length}</p>
                 <p className="text-xs text-brand-text-muted">Total Uploaded</p>
               </div>
            </div>
          </div>
        </div>

        {/* Right Col: Candidate List */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          
          <div className="flex items-center justify-between gap-4">
             <div className="relative flex-1 max-w-sm">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-text-muted" />
                <input type="text" placeholder="Search candidates..." className="w-full pl-9 pr-4 py-2 bg-brand-surface border border-brand-border rounded-lg text-sm text-brand-text focus:border-brand-accent focus:outline-none transition-colors" />
             </div>
             <button className="p-2 border border-brand-border rounded-lg text-brand-text-muted hover:text-brand-text hover:bg-brand-surface transition-colors" title="Filter features coming soon">
               <Filter size={18} />
             </button>
          </div>

          <div className="bg-brand-bg-raised border border-brand-border/50 rounded-xl overflow-hidden min-h-[400px]">
            <div className="grid grid-cols-12 gap-4 px-5 py-3 border-b border-brand-border/50 bg-brand-surface/40 text-xs font-medium text-brand-text-muted tracking-wider uppercase">
              <div className="col-span-4">Candidate</div>
              <div className="col-span-2">Score</div>
              <div className="col-span-4">Analysis</div>
              <div className="col-span-2 text-right">Action</div>
            </div>

            {isLoading && candidates.length === 0 ? (
               <div className="flex justify-center items-center h-48">
                 <div className="w-6 h-6 rounded-full border-2 border-brand-accent border-t-transparent animate-spin"></div>
               </div>
            ) : candidates.length === 0 ? (
               <div className="flex flex-col justify-center items-center h-64 text-center">
                 <p className="text-brand-text-muted mb-2">No candidates processed yet.</p>
                 <p className="text-xs text-brand-text-muted/60">Upload a PDF resume on the left to test the Gemini Extraction pipeline.</p>
               </div>
            ) : (
              <div className="flex flex-col divide-y divide-brand-border/30">
                {candidates.map((c) => (
                  <div key={c.id} className="grid grid-cols-12 gap-4 px-5 py-4 items-center hover:bg-brand-surface/30 transition-colors group">
                    <div className="col-span-4 flex flex-col pr-2">
                      <span className="text-sm font-medium text-brand-text truncate" title={c.candidate_name}>
                        {c.candidate_name || "Unknown"}
                      </span>
                      <span className="text-xs text-brand-text-muted">Status: {c.status}</span>
                    </div>
                    
                    <div className="col-span-2">
                      {c.score !== null ? (
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

                    <div className="col-span-4 flex items-center pr-2">
                      {c.status.toLowerCase() === "processing" ? (
                         <div className="flex items-center gap-2 text-xs text-brand-accent">
                           <div className="w-3 h-3 border-2 border-brand-accent border-t-transparent rounded-full animate-spin"></div>
                           Gemini...
                         </div>
                       ) : c.status.toLowerCase().includes("duplicate") ? (
                         <div className="flex items-center gap-1.5 text-xs text-brand-text-muted">
                           <AlertCircle size={14} className="opacity-50" />
                           Hash Duplicate
                         </div>
                       ) : (
                         <p className="text-xs text-brand-text-muted line-clamp-2" title={c.justification || "No justification provided"}>
                           {c.justification || "Resume scored successfully."}
                         </p>
                       )}
                    </div>

                    <div className="col-span-2 flex justify-end">
                      <button className="p-1.5 text-brand-text-muted hover:text-brand-accent hover:bg-brand-accent/10 rounded transition-colors" title="View Full Analysis (Coming Soon)">
                        <Eye size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

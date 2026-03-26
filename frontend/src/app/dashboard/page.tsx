"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Users, Clock, ArrowRight, Trash2 } from "lucide-react";
import { fetchJobs, createJob, deleteJob } from "@/lib/api";

// Temporarily define interface
interface Job {
  id: string;
  title: string;
  description: string;
  company?: string;
  config_id: string | number;
  created_at?: string;
  resume_count?: number;
  top_score?: number;
}

export default function DashboardHome() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteJobId, setDeleteJobId] = useState<string | null>(null);
  const [deleteJobTitle, setDeleteJobTitle] = useState("");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form State
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [desc, setDesc] = useState("");
  const [configId, setConfigId] = useState("1");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    try {
      setIsLoading(true);
      const data = await fetchJobs();
      setJobs(data || []);
    } catch (error) {
      console.error("Failed to load jobs", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateJob = async () => {
    if (!title) return;
    try {
      setIsSubmitting(true);
      await createJob({ title, description: desc, company, config_id: Number(configId) });
      setIsModalOpen(false);
      setTitle("");
      setCompany("");
      setDesc("");
      loadJobs(); // refresh list
    } catch (error) {
      console.error("Failed to create job", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = (id: string, titleStr: string) => {
    setDeleteJobId(id);
    setDeleteJobTitle(titleStr);
  };

  const handleDeleteJob = async () => {
    if (!deleteJobId) return;
    try {
      setIsSubmitting(true);
      await deleteJob(deleteJobId);
      loadJobs();
    } catch (error) {
      console.error("Failed to delete job", error);
      alert("Error deleting job. Check console.");
    } finally {
      setIsSubmitting(false);
      setDeleteJobId(null);
      setDeleteJobTitle("");
    }
  };

  return (
    <div className="flex flex-col gap-8 animate-fade-in pb-12">
      
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between border-b border-brand-border/30 pb-6 gap-4">
        <div>
          <h1 className="text-3xl font-display text-brand-text mb-1 tracking-wide">Active Requisitions</h1>
          <p className="text-sm text-brand-text-muted">Manage roles and review processed candidate pools.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="px-5 py-2.5 bg-brand-accent text-black font-semibold text-sm rounded-lg hover:bg-brand-accent-dim transition-all duration-200 flex items-center gap-2 active:scale-95 shadow-[0_0_15px_rgba(224,179,85,0.2)] cursor-pointer"
        >
          <Plus size={16} strokeWidth={2.5} />
          <span>New Job Requirement</span>
        </button>
      </header>

      {/* Grid */}
      {isLoading ? (
        <div className="w-full flex justify-center p-12">
           <div className="w-8 h-8 rounded-full border-2 border-brand-accent border-t-transparent animate-spin"></div>
        </div>
      ) : jobs.length === 0 ? (
        <div className="w-full h-64 border border-dashed border-brand-border rounded-xl flex flex-col items-center justify-center text-center p-8 bg-brand-surface/20">
          <p className="text-brand-text-muted mb-2">No active jobs found.</p>
          <button onClick={() => setIsModalOpen(true)} className="text-brand-accent text-sm font-medium hover:underline">Create your first role &rarr;</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {jobs.map((job) => (
            <div key={job.id} className="group relative bg-brand-surface/30 border border-brand-border/50 hover:border-brand-accent/50 rounded-xl p-5 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 overflow-hidden flex flex-col h-full">
              
              <div className="flex items-start justify-between mb-4">
                <div className="inline-flex px-2.5 py-1 rounded text-[10px] font-bold tracking-wider uppercase text-brand-bg bg-brand-accent/90">
                  Active
                </div>
                <button 
                  onClick={() => confirmDelete(job.id, job.title)}
                  className="p-1.5 text-brand-text-muted hover:text-brand-danger hover:bg-brand-danger/10 rounded transition-colors"
                  title="Delete Job"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              <div className="mb-6 flex-1">
                <h2 className="text-lg font-semibold text-brand-text mb-1 group-hover:text-brand-accent transition-colors line-clamp-2">
                  {job.title}
                </h2>
                <div className="text-sm text-brand-text-muted flex items-center gap-1.5 mb-1">
                  <span>{job.company || "HireLens Internal"}</span>
                </div>
                <div className="text-xs text-brand-text-muted flex items-center gap-1.5 mt-3">
                  <Clock size={12} />
                  <span>Created {job.created_at ? new Date(job.created_at).toLocaleDateString() : 'N/A'}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-5 p-3 rounded-lg bg-brand-bg/50 border border-brand-border/20">
                <div>
                  <p className="text-[10px] text-brand-text-muted uppercase tracking-wider mb-1">Screened</p>
                  <div className="flex items-center gap-1.5 text-brand-text font-medium">
                    <Users size={14} className="text-brand-accent opacity-50" />
                    <span>{job.resume_count || 0} Candidates</span>
                  </div>
                </div>
              </div>

              <Link 
                href={`/dashboard/jobs/${job.id}`}
                className="mt-auto w-full py-2.5 px-4 rounded-lg bg-brand-surface border border-brand-border text-sm font-medium text-brand-text hover:bg-brand-accent hover:text-black hover:border-brand-accent transition-all duration-200 flex items-center justify-center gap-2"
              >
                <span>Process Resumes</span>
                <ArrowRight size={16} className="opacity-70 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* Basic Modal for New Job */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-brand-bg-raised border border-brand-border w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-brand-border/30 flex justify-between items-center">
              <h2 className="text-xl font-display text-brand-text">Create New Requirement</h2>
              <button disabled={isSubmitting} onClick={() => setIsModalOpen(false)} className="text-brand-text-muted hover:text-brand-text text-xl">&times;</button>
            </div>
            
            <div className="p-6 flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-brand-text mb-1.5">Job Title</label>
                <input 
                  type="text" 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Senior Data Engineer" 
                  className="w-full bg-brand-surface border border-brand-border rounded-lg px-4 py-2 text-brand-text placeholder:text-brand-text-muted/50 focus:outline-none focus:border-brand-accent transition-colors" 
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-brand-text mb-1.5">Company / Department</label>
                <input 
                  type="text" 
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="e.g. Engineering / Tech Operations" 
                  className="w-full bg-brand-surface border border-brand-border rounded-lg px-4 py-2 text-brand-text placeholder:text-brand-text-muted/50 focus:outline-none focus:border-brand-accent transition-colors" 
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-brand-text mb-1.5">Requirements / JD Context</label>
                <textarea 
                  rows={4} 
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="Paste the core requirements here for Gemini to score against..." 
                  className="w-full bg-brand-surface border border-brand-border rounded-lg px-4 py-2 text-brand-text placeholder:text-brand-text-muted/50 focus:outline-none focus:border-brand-accent transition-colors resize-none"
                ></textarea>
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-text mb-1.5">Extraction Config ID</label>
                <input 
                  type="number" 
                  value={configId}
                  onChange={(e) => setConfigId(e.target.value)}
                  className="w-full bg-brand-surface border border-brand-border rounded-lg px-4 py-2 text-brand-text focus:outline-none focus:border-brand-accent transition-colors" 
                />
              </div>
            </div>

            <div className="p-6 border-t border-brand-border/30 bg-brand-surface/20 flex justify-end gap-3">
              <button disabled={isSubmitting} onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-sm font-medium text-brand-text-muted hover:text-brand-text transition-colors">Cancel</button>
              <button 
                onClick={handleCreateJob} 
                disabled={isSubmitting || !title}
                className="px-5 py-2.5 bg-brand-accent text-black text-sm font-medium rounded-lg hover:bg-brand-accent-dim transition-colors disabled:opacity-50"
              >
                {isSubmitting ? "Saving..." : "Create Role"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteJobId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-brand-bg-raised border border-brand-danger/30 w-full max-w-md rounded-2xl shadow-[0_0_30px_rgba(224,102,102,0.15)] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-brand-border/30 flex justify-between items-center bg-brand-danger/5">
              <h2 className="text-xl font-display text-brand-text flex items-center gap-2">
                <Trash2 size={20} className="text-brand-danger" />
                Delete Requirement
              </h2>
              <button disabled={isSubmitting} onClick={() => setDeleteJobId(null)} className="text-brand-text-muted hover:text-brand-text text-xl">&times;</button>
            </div>
            
            <div className="p-6">
              <p className="text-sm text-brand-text mb-4 leading-relaxed">
                Are you sure you want to permanently delete <strong className="text-brand-text font-bold uppercase">{deleteJobTitle}</strong>?
              </p>
              <div className="text-xs text-brand-danger/90 bg-brand-danger/10 px-4 py-3 rounded-lg border border-brand-danger/20 flex gap-3">
                <div className="mt-0.5"><Users size={14} className="opacity-80"/></div>
                <p><strong>Warning:</strong> This will permanently erase all associated resume screenings and extracted Gemini data. This action cannot be undone.</p>
              </div>
            </div>

            <div className="p-6 border-t border-brand-border/30 bg-brand-surface/20 flex justify-end gap-3">
              <button disabled={isSubmitting} onClick={() => setDeleteJobId(null)} className="px-5 py-2.5 text-sm font-medium text-brand-text-muted hover:text-brand-text transition-colors">Cancel</button>
              <button 
                onClick={handleDeleteJob} 
                disabled={isSubmitting}
                className="px-5 py-2.5 bg-brand-danger text-white text-sm font-bold rounded-lg hover:bg-red-500 shadow-[0_0_15px_rgba(224,102,102,0.3)] transition-all disabled:opacity-50"
              >
                {isSubmitting ? "Deleting..." : "Delete Forever"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

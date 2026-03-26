"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher, uploadResume } from "@/lib/api";
import { UploadCloud, CheckCircle, AlertCircle, Briefcase, FileText, Loader2, X } from "lucide-react";

interface UploadFileState {
  file: File;
  status: "pending" | "uploading" | "success" | "duplicate" | "error";
  message?: string;
}

export default function BatchUploadView() {
  const { data: jobs } = useSWR("/jobs", fetcher);
  const [selectedJob, setSelectedJob] = useState("");
  const [files, setFiles] = useState<UploadFileState[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessingTotal, setIsProcessingTotal] = useState(false);

  const handleFileDrop = (droppedFiles: FileList | null) => {
    if (!droppedFiles) return;
    const newFiles = Array.from(droppedFiles).map(file => ({
      file,
      status: "pending" as const
    }));
    setFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadAll = async () => {
    if (!selectedJob || files.length === 0) return;
    setIsProcessingTotal(true);

    // Filter to only upload files that are pending or errored
    const toUpload = files.map((f, i) => ({ ...f, index: i }))
      .filter(f => f.status === "pending" || f.status === "error");

    // Upload concurrently (Promise.allSettled guarantees we don't crash the loop on one error)
    await Promise.allSettled(toUpload.map(async (f) => {
      // Mark as uploading
      setFiles(prev => prev.map((item, i) => i === f.index ? { ...item, status: "uploading" } : item));
      
      try {
        await uploadResume(selectedJob, f.file);
        setFiles(prev => prev.map((item, i) => i === f.index ? { ...item, status: "success" } : item));
      } catch (error: any) {
        if (error.response?.status === 409) {
          setFiles(prev => prev.map((item, i) => i === f.index ? { ...item, status: "duplicate", message: "Duplicate" } : item));
        } else {
          setFiles(prev => prev.map((item, i) => i === f.index ? { ...item, status: "error", message: "Failed" } : item));
        }
      }
    }));

    setIsProcessingTotal(false);
  };

  return (
    <div className="flex flex-col gap-8 animate-fade-in pb-12 max-w-4xl mx-auto">
      <header className="border-b border-brand-border/30 pb-6">
        <h1 className="text-3xl font-display text-brand-text mb-1 flex items-center gap-3">
          <UploadCloud size={28} className="text-brand-accent" />
          Batch Upload Pipeline
        </h1>
        <p className="text-sm text-brand-text-muted">Drag and drop multiple resumes to instantly extract and score them.</p>
      </header>

      <div className="bg-brand-bg-raised border border-brand-border/50 rounded-xl p-6 shadow-lg">
        <label className="block text-sm font-bold text-brand-text mb-3">Target Requisition</label>
        <select
          value={selectedJob}
          onChange={(e) => setSelectedJob(e.target.value)}
          className="w-full px-4 py-3 bg-brand-surface border border-brand-border rounded-lg text-sm text-brand-text focus:border-brand-accent focus:outline-none transition-all cursor-pointer"
        >
          <option value="" disabled>Select a job role...</option>
          {(jobs || []).map((job: any) => (
            <option key={job.id} value={job.id}>{job.title} — {job.company || "HireLens"}</option>
          ))}
        </select>
      </div>

      <div 
        className={`relative border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center text-center transition-all duration-300 ${isDragging ? 'border-brand-accent bg-brand-accent/5' : 'border-brand-border hover:border-brand-accent/30'} ${!selectedJob ? 'opacity-50 pointer-events-none' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFileDrop(e.dataTransfer.files); }}
      >
        <input 
          type="file" 
          multiple 
          accept=".pdf,.doc,.docx"
          onChange={(e) => handleFileDrop(e.target.files)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
          disabled={!selectedJob}
        />
        <UploadCloud size={32} className={`mb-4 ${isDragging ? 'text-brand-accent' : 'text-brand-text-muted'}`} />
        <h3 className="text-lg font-bold text-brand-text mb-1">Drag & Drop Resumes</h3>
        <p className="text-sm text-brand-text-muted">Upload up to 50 PDF or DOCX files at once</p>
      </div>

      {files.length > 0 && (
        <div className="bg-brand-bg-raised border border-brand-border/50 rounded-xl overflow-hidden shadow-lg animate-fade-in">
          <div className="flex items-center justify-between px-6 py-4 border-b border-brand-border/30 bg-brand-surface/50">
            <h3 className="text-sm font-bold text-brand-text flex items-center gap-2">
              <FileText size={16} className="text-brand-accent" />
              Upload Queue ({files.length})
            </h3>
            <button 
              onClick={uploadAll}
              disabled={isProcessingTotal || !selectedJob}
              className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${isProcessingTotal ? 'bg-brand-surface text-brand-text-muted cursor-not-allowed' : 'bg-brand-accent text-brand-bg hover:brightness-110 shadow-[0_0_10px_rgba(212,234,99,0.3)]'}`}
            >
              {isProcessingTotal && <Loader2 size={16} className="animate-spin" />}
              {isProcessingTotal ? 'Processing via Gemini...' : 'Start Batch Analysis'}
            </button>
          </div>
          <div className="divide-y divide-brand-border/30 max-h-[400px] overflow-y-auto">
            {files.map((f, i) => (
              <div key={i} className="flex items-center justify-between px-6 py-4 hover:bg-brand-surface/20 transition-colors">
                <div className="flex items-center gap-3 overflow-hidden">
                  {f.status === "success" && <CheckCircle size={18} className="text-brand-success shrink-0" />}
                  {f.status === "duplicate" && <AlertCircle size={18} className="text-[#D4EA63] shrink-0" />}
                  {f.status === "error" && <AlertCircle size={18} className="text-brand-danger shrink-0" />}
                  {f.status === "uploading" && <Loader2 size={18} className="text-brand-accent animate-spin shrink-0" />}
                  {f.status === "pending" && <FileText size={18} className="text-brand-text-muted shrink-0" />}
                  
                  <p className="text-sm font-medium text-brand-text truncate">{f.file.name}</p>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  {f.message && <span className={`text-xs font-bold uppercase tracking-wider ${f.status === 'duplicate' ? 'text-[#D4EA63]' : 'text-brand-danger'}`}>{f.message}</span>}
                  
                  {f.status === "pending" || f.status === "error" ? (
                    <button onClick={() => removeFile(i)} className="p-1.5 text-brand-text-muted hover:text-brand-danger rounded-lg hover:bg-brand-danger/10 transition-colors">
                      <X size={16} />
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

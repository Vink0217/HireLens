"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Users, Clock, ArrowRight, MoreVertical } from "lucide-react";

// Mock data until API integration (Phase 11)
const MOCK_JOBS = [
  {
    id: "job-1",
    title: "Senior Backend Engineer",
    department: "Engineering",
    location: "Remote - IND",
    candidatesProcessed: 142,
    topScore: 9.2,
    createdAt: "2 days ago",
    status: "Active"
  },
  {
    id: "job-2",
    title: "Product Designer (UI/UX)",
    department: "Design",
    location: "Bengaluru, KA",
    candidatesProcessed: 89,
    topScore: 8.8,
    createdAt: "5 days ago",
    status: "Active"
  },
  {
    id: "job-3",
    title: "Data Scientist - ML",
    department: "Engineering",
    location: "Remote",
    candidatesProcessed: 34,
    topScore: 7.1,
    createdAt: "1 week ago",
    status: "Reviewing"
  }
];

export default function DashboardHome() {
  const [isModalOpen, setIsModalOpen] = useState(false);

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
          className="px-5 py-2.5 bg-brand-accent text-black font-semibold text-sm rounded-lg hover:bg-brand-accent-dim transition-all duration-200 flex items-center gap-2 active:scale-95 shadow-[0_0_15px_rgba(224,179,85,0.2)]"
        >
          <Plus size={16} strokeWidth={2.5} />
          <span>New Job Requirement</span>
        </button>
      </header>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {MOCK_JOBS.map((job) => (
          <div key={job.id} className="group relative bg-brand-surface/30 border border-brand-border/50 hover:border-brand-accent/50 rounded-xl p-5 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 overflow-hidden flex flex-col h-full">
            
            {/* Top Bar */}
            <div className="flex items-start justify-between mb-4">
              <div className="inline-flex px-2.5 py-1 rounded text-[10px] font-bold tracking-wider uppercase text-brand-bg bg-brand-accent/90">
                {job.status}
              </div>
              <button className="text-brand-text-muted hover:text-brand-text transition-colors">
                <MoreVertical size={16} />
              </button>
            </div>

            {/* Title & Metadata */}
            <div className="mb-6 flex-1">
              <h2 className="text-lg font-semibold text-brand-text mb-1 group-hover:text-brand-accent transition-colors line-clamp-2">
                {job.title}
              </h2>
              <div className="text-sm text-brand-text-muted flex items-center gap-1.5 mb-1">
                <span>{job.department}</span>
                <span className="w-1 h-1 rounded-full bg-brand-text-muted/50"></span>
                <span>{job.location}</span>
              </div>
              <div className="text-xs text-brand-text-muted flex items-center gap-1.5 mt-3">
                <Clock size={12} />
                <span>Opened {job.createdAt}</span>
              </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 gap-3 mb-5 p-3 rounded-lg bg-brand-bg/50 border border-brand-border/20">
              <div>
                <p className="text-[10px] text-brand-text-muted uppercase tracking-wider mb-1">Screened</p>
                <div className="flex items-center gap-1.5 text-brand-text font-medium">
                  <Users size={14} className="text-brand-accent" />
                  <span>{job.candidatesProcessed}</span>
                </div>
              </div>
              <div>
                <p className="text-[10px] text-brand-text-muted uppercase tracking-wider mb-1">Top Score</p>
                <div className="flex items-center gap-1.5 font-medium text-brand-success">
                  <span>{job.topScore} / 10</span>
                </div>
              </div>
            </div>

            {/* Action */}
            <Link 
              href={`/dashboard/jobs/${job.id}`}
              className="mt-auto w-full py-2.5 px-4 rounded-lg bg-brand-surface border border-brand-border text-sm font-medium text-brand-text hover:bg-brand-accent hover:text-black hover:border-brand-accent transition-all duration-200 flex items-center justify-center gap-2"
            >
              <span>View Candidate Pool</span>
              <ArrowRight size={16} className="opacity-70 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </Link>
          </div>
        ))}
      </div>

      {/* Basic Modal for New Job (Hidden by default) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-brand-bg-raised border border-brand-border w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-brand-border/30 flex justify-between items-center">
              <h2 className="text-xl font-display text-brand-text">Create New Requirement</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-brand-text-muted hover:text-brand-text text-xl">&times;</button>
            </div>
            
            <div className="p-6 flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-brand-text mb-1.5">Job Title</label>
                <input type="text" placeholder="e.g. Senior Data Engineer" className="w-full bg-brand-surface border border-brand-border rounded-lg px-4 py-2 text-brand-text placeholder:text-brand-text-muted/50 focus:outline-none focus:border-brand-accent transition-colors" />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-brand-text mb-1.5">Requirements / JD Context</label>
                <textarea rows={4} placeholder="Paste the core requirements here for Gemini to score against..." className="w-full bg-brand-surface border border-brand-border rounded-lg px-4 py-2 text-brand-text placeholder:text-brand-text-muted/50 focus:outline-none focus:border-brand-accent transition-colors resize-none"></textarea>
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-text mb-1.5">Extraction Config</label>
                <select className="w-full bg-brand-surface border border-brand-border rounded-lg px-4 py-2 text-brand-text focus:outline-none focus:border-brand-accent transition-colors appearance-none">
                  <option value="default">Default Engineering Config (Skills, Exp, Ed)</option>
                  <option value="design">Design Config (Portfolio, Tools, Exp)</option>
                </select>
              </div>
            </div>

            <div className="p-6 border-t border-brand-border/30 bg-brand-surface/20 flex justify-end gap-3">
              <button onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-sm font-medium text-brand-text-muted hover:text-brand-text transition-colors">Cancel</button>
              <button onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 bg-brand-accent text-black text-sm font-medium rounded-lg hover:bg-brand-accent-dim transition-colors">Create Shell</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  UploadCloud,
  CheckCircle,
  Eye,
  Search,
  Filter,
  X,
  BarChart3,
  BrainCircuit,
  Sparkles,
  Trophy,
  ExternalLink,
  Layers3,
  FileSearch,
} from "lucide-react";
import useSWR from "swr";
import {
  uploadResume,
  fetcher,
  runMultiRoleRanking,
  fetchRagEvidence,
  MultiRoleResult,
  RagEvidenceChunk,
} from "@/lib/api";

interface BackendResume {
  id: string;
  file_name: string;
  file_type: string;
  file_url: string;
  extracted_data: string | object | null;
  score: number | null;
  summary: string | null;
  created_at: string;
  status?: string;
}

interface ResumeDetail extends BackendResume {
  raw_text?: string;
}

interface JobLite {
  id: string;
  title: string;
  company?: string;
}

interface ParsedResumeData {
  full_name?: string;
  name?: string;
  candidate_name?: string;
  years_of_experience?: number | string;
  primary_skills?: string[];
  skills?: string[];
  last_job_title?: string;
  [key: string]: unknown;
}

export default function JobDetailView() {
  const params = useParams();
  const jobId = params?.id as string;
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCandidate, setSelectedCandidate] = useState<BackendResume | null>(null);
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([]);
  const [multiRoleResults, setMultiRoleResults] = useState<MultiRoleResult[]>([]);
  const [isRunningMultiRole, setIsRunningMultiRole] = useState(false);
  const [multiRoleError, setMultiRoleError] = useState<string | null>(null);
  const [ragEvidence, setRagEvidence] = useState<RagEvidenceChunk[]>([]);
  const [isLoadingRagEvidence, setIsLoadingRagEvidence] = useState(false);
  const [ragError, setRagError] = useState<string | null>(null);

  const { data: candidatesData, error: candidatesError, mutate } = useSWR(`/resumes?job_id=${jobId}`, fetcher);
  const { data: jobData } = useSWR(`/jobs/${jobId}`, fetcher);
  const { data: allJobsData } = useSWR<JobLite[]>("/jobs", fetcher);

  const candidates = (Array.isArray(candidatesData) ? candidatesData : candidatesData?.resumes || []) as BackendResume[];
  const allJobs = Array.isArray(allJobsData) ? allJobsData : [];
  const comparisonJobs = allJobs.filter((j) => j.id !== jobId);
  const jobTitle = jobData?.title || `Requirement: ${jobId.split("-")[0]}...`;
  const isLoading = !candidatesData && !candidatesError && !jobData;
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

  useEffect(() => {
    // Only poll if we have candidates currently in "processing"
    const hasProcessing = candidates.some((c) => c.status?.toLowerCase() === "processing");
    if (!hasProcessing) return;

    const interval = setInterval(() => {
      mutate();
    }, 10000);

    return () => clearInterval(interval);
  }, [candidates, mutate]);

  const handleFileUpload = async (file: File) => {
    try {
      setIsUploading(true);
      await uploadResume(jobId, file);
      mutate();
    } catch (error: any) {
      if (error.response?.status === 409) {
        alert("Duplicate Detcted: This exact resume has already been uploaded and scored for this role!");
      } else if (error.response?.status === 503) {
        alert(error.response?.data?.detail || "AI provider is temporarily busy. Please retry in a few seconds.");
      } else {
        console.error("Upload failed", error);
        alert(error.response?.data?.detail || "Failed to upload and process resume. Check backend logs.");
      }
    } finally {
      setIsUploading(false);
    }
  };

  const buildDownloadName = (candidate: BackendResume) => {
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

  const openResumeFile = async (candidate: BackendResume) => {
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
      // Fallback below
    }

    if (candidate.file_url) {
      try {
        const fallbackResponse = await fetch(candidate.file_url);
        if (fallbackResponse.ok) {
          const fallbackBlob = await fallbackResponse.blob();
          triggerBlobDownload(fallbackBlob, filename);
          return;
        }
      } catch {
        // Last fallback below
      }

      window.open(candidate.file_url, "_blank", "noopener,noreferrer");
      alert("Opened original file link. If extension is missing, restart backend and use this action again for normalized download.");
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
      setMultiRoleError("Select at least one additional role to compare.");
      return;
    }

    setIsRunningMultiRole(true);
    setMultiRoleError(null);
    try {
      const results = await runMultiRoleRanking(selectedCandidate.id, selectedJobIds);
      setMultiRoleResults(results);
    } catch (error: any) {
      setMultiRoleError(error?.response?.data?.detail || "Failed to run multi-role ranking.");
      setMultiRoleResults([]);
    } finally {
      setIsRunningMultiRole(false);
    }
  };

  const handleLoadRagEvidence = async () => {
    if (!selectedCandidate) return;

    setIsLoadingRagEvidence(true);
    setRagError(null);
    try {
      const data = await fetchRagEvidence(selectedCandidate.id, jobId, 4);
      setRagEvidence(data.chunks || []);
    } catch (error: any) {
      setRagError(error?.response?.data?.detail || "Failed to load evidence snippets.");
      setRagEvidence([]);
    } finally {
      setIsLoadingRagEvidence(false);
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

  const getParsedData = (c: BackendResume): ParsedResumeData => {
    if (!c.extracted_data) return {};

    try {
      return (typeof c.extracted_data === "string" ? JSON.parse(c.extracted_data) : c.extracted_data) as ParsedResumeData;
    } catch {
      return {};
    }
  };

  // Helper to safely parse the name from extracted Gemini data
  const getCandidateName = (c: BackendResume) => {
    if (!c.extracted_data) return c.file_name || "Unknown Candidate";
    try {
      // Backend might return JSON string mapped from postgres, or dict
      const parsed = typeof c.extracted_data === "string" ? JSON.parse(c.extracted_data) : c.extracted_data;
      return parsed.full_name || parsed.name || parsed.candidate_name || c.file_name;
    } catch {
      return c.file_name || "Unknown Candidate";
    }
  };

  const getAnalysisModel = (c: BackendResume) => {
    const parsed = getParsedData(c);
    const overallScore = c.score ?? 0;

    const scoreList = candidates
      .map((item) => item.score)
      .filter((item): item is number => item !== null)
      .sort((a, b) => b - a);

    const rank = c.score === null ? null : scoreList.findIndex((s) => s === c.score) + 1;
    const percentile = rank && scoreList.length > 0 ? Math.round(((scoreList.length - rank + 1) / scoreList.length) * 100) : null;

    const rawSkills = Array.isArray(parsed.primary_skills)
      ? parsed.primary_skills
      : Array.isArray(parsed.skills)
        ? parsed.skills
        : [];

    const skills = rawSkills.filter((s): s is string => typeof s === "string" && s.trim().length > 0);

    const yearsRaw = parsed.years_of_experience;
    const yearsNum =
      typeof yearsRaw === "number" ? yearsRaw : typeof yearsRaw === "string" ? Number(yearsRaw) : Number.NaN;
    const years = Number.isFinite(yearsNum) ? yearsNum : null;

    const expectedKeys = ["name", "full_name", "email", "years_of_experience", "primary_skills", "last_job_title"];
    const populatedCount = expectedKeys.filter((key) => {
      const value = parsed[key];
      if (value === null || value === undefined) return false;
      if (typeof value === "string") return value.trim().length > 0;
      if (Array.isArray(value)) return value.length > 0;
      return true;
    }).length;

    const dataCompleteness = Math.min(100, Math.round((populatedCount / expectedKeys.length) * 100));
    const roleFit = Math.min(100, Math.max(0, overallScore * 10));
    const skillDepth = Math.min(100, Math.round((skills.length / 8) * 100) + Math.round(overallScore * 3));
    const experienceFit = years === null ? Math.min(100, Math.round(overallScore * 9)) : Math.min(100, Math.round((Math.min(years, 12) / 12) * 100));
    const rationaleStrength = Math.min(100, Math.max(30, Math.round((c.summary?.length || 0) * 0.8)));

    return {
      parsed,
      skills,
      years,
      rank,
      percentile,
      overallScore,
      dimensions: [
        { label: "Role Fit", value: roleFit },
        { label: "Skill Depth", value: skillDepth },
        { label: "Experience", value: experienceFit },
        { label: "Data Completeness", value: dataCompleteness },
        { label: "Justification Quality", value: rationaleStrength },
      ],
    };
  };

  // Filter candidates by name search
  const filteredCandidates = candidates.filter((c) => getCandidateName(c).toLowerCase().includes(searchQuery.toLowerCase()));

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
            <h1 className="text-3xl font-display text-brand-text mb-2 animate-fade-in">{jobTitle}</h1>
            <div className="flex items-center gap-3 text-sm text-brand-text-muted">
              <span className="text-brand-success font-medium flex items-center gap-1">
                <CheckCircle size={14} /> Polling Active
              </span>
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
              isDragging ? "border-brand-accent bg-brand-accent/5" : "border-brand-border hover:border-brand-accent/50 hover:bg-brand-surface/20"
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
          >
            {isUploading && (
              <div className="absolute inset-0 z-10 bg-brand-bg/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-xl">
                <div className="w-8 h-8 rounded-full border-2 border-brand-accent border-t-transparent animate-spin mb-3" />
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
            <h4 className="text-xs font-bold uppercase tracking-wider text-brand-text-muted mb-3">Resume Overview</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-2xl font-light text-brand-text">{candidates.filter((c) => (c.score || 0) >= 8).length}</p>
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
              <input
                type="text"
                placeholder="Search candidates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-brand-surface border border-brand-border rounded-lg text-sm text-brand-text focus:border-brand-accent focus:outline-none transition-colors"
              />
            </div>
            <button onClick={() => alert("Complex filtering coming in next release!")} className="p-2 border border-brand-border rounded-lg text-brand-text-muted hover:text-brand-text hover:bg-brand-surface transition-colors" title="Filter features coming soon">
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
                <div className="w-6 h-6 rounded-full border-2 border-brand-accent border-t-transparent animate-spin" />
              </div>
            ) : filteredCandidates.length === 0 ? (
              <div className="flex flex-col justify-center items-center h-64 text-center">
                <p className="text-brand-text-muted mb-2">
                  {candidates.length > 0 ? "No candidates found for search query." : "No candidates processed yet."}
                </p>
                {candidates.length === 0 && (
                  <p className="text-xs text-brand-text-muted/60">Upload a PDF resume on the left to test the Gemini Extraction pipeline.</p>
                )}
              </div>
            ) : (
              <div className="flex flex-col divide-y divide-brand-border/30">
                {filteredCandidates.map((c) => {
                  const name = getCandidateName(c);

                  return (
                    <div key={c.id} className="grid grid-cols-12 gap-4 px-5 py-4 items-center hover:bg-brand-surface/30 transition-colors group">
                      <div className="col-span-4 flex flex-col pr-2">
                        <span className="text-sm font-medium text-brand-text truncate" title={name}>
                          {name}
                        </span>
                        <span className="text-xs text-brand-text-muted">Processed</span>
                      </div>

                      <div className="col-span-2">
                        {c.score !== null ? (
                          <span
                            className={`inline-flex items-center justify-center w-8 h-8 rounded-full border text-xs font-bold ${
                              c.score >= 8
                                ? "border-brand-success text-brand-success bg-brand-success/10"
                                : c.score >= 5
                                  ? "border-brand-accent text-brand-accent bg-brand-accent/10"
                                  : "border-brand-danger text-brand-danger bg-brand-danger/10"
                            }`}
                          >
                            {c.score}
                          </span>
                        ) : (
                          <span className="text-xs text-brand-text-muted font-mono">-</span>
                        )}
                      </div>

                      <div className="col-span-4 flex items-center pr-2">
                        <p className="text-xs text-brand-text-muted line-clamp-2" title={c.summary || "No justification provided"}>
                          {c.summary || "Resume scored successfully."}
                        </p>
                      </div>

                      <div className="col-span-2 flex justify-end">
                        <button
                          onClick={() => {
                            setSelectedCandidate(c);
                            setSelectedJobIds([]);
                            setMultiRoleResults([]);
                            setMultiRoleError(null);
                            setRagEvidence([]);
                            setRagError(null);
                          }}
                          className="inline-flex items-center gap-2 px-2.5 py-1.5 text-xs text-brand-text-muted hover:text-brand-accent hover:bg-brand-accent/10 rounded-lg transition-colors"
                          title="View Full Analysis"
                        >
                          <Eye size={16} />
                          <span className="hidden xl:inline">Full Analysis</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedCandidate && (() => {
        const analysis = getAnalysisModel(selectedCandidate);
        const name = getCandidateName(selectedCandidate);
        const scoreColor =
          analysis.overallScore >= 8 ? "text-brand-success" : analysis.overallScore >= 5 ? "text-brand-accent" : "text-brand-danger";

        return (
          <div
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm p-4 md:p-6 overflow-y-auto"
            onClick={() => {
              setSelectedCandidate(null);
              setSelectedJobIds([]);
              setMultiRoleResults([]);
              setMultiRoleError(null);
              setRagEvidence([]);
              setRagError(null);
            }}
          >
            <div
              className="max-w-5xl mx-auto border border-brand-border rounded-2xl bg-brand-bg-raised shadow-[0_20px_80px_rgba(0,0,0,0.5)] animate-fade-in"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-5 md:p-6 border-b border-brand-border/40 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-brand-text-muted mb-2">Candidate Intelligence Panel</p>
                  <h2 className="text-2xl font-display text-brand-text">{name}</h2>
                  <p className="text-sm text-brand-text-muted mt-1">Role: {jobTitle}</p>
                </div>
                <button
                  onClick={() => {
                    setSelectedCandidate(null);
                    setSelectedJobIds([]);
                    setMultiRoleResults([]);
                    setMultiRoleError(null);
                    setRagEvidence([]);
                    setRagError(null);
                  }}
                  className="p-2 rounded-lg border border-brand-border text-brand-text-muted hover:text-brand-text hover:border-brand-accent transition-colors"
                  title="Close"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-5 md:p-6 grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-1 space-y-4">
                  <div className="rounded-xl border border-brand-border/50 bg-gradient-to-b from-brand-surface/60 to-brand-bg p-5">
                    <p className="text-xs uppercase tracking-wider text-brand-text-muted mb-3">Overall Match</p>
                    <div className="relative w-36 h-36 mx-auto mb-3">
                      <div
                        className="absolute inset-0 rounded-full"
                        style={{
                          background: `conic-gradient(rgba(212,234,99,0.95) ${analysis.overallScore * 10}%, rgba(255,255,255,0.08) ${analysis.overallScore * 10}% 100%)`,
                        }}
                      />
                      <div className="absolute inset-3 rounded-full bg-brand-bg-raised flex flex-col items-center justify-center border border-brand-border/40">
                        <span className={`text-4xl font-semibold ${scoreColor}`}>{analysis.overallScore || "-"}</span>
                        <span className="text-xs text-brand-text-muted">out of 10</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-center mt-2">
                      <div className="rounded-lg bg-brand-surface/50 border border-brand-border/30 py-2">
                        <p className="text-[11px] text-brand-text-muted uppercase">Rank</p>
                        <p className="text-lg font-semibold text-brand-text">{analysis.rank ? `#${analysis.rank}` : "-"}</p>
                      </div>
                      <div className="rounded-lg bg-brand-surface/50 border border-brand-border/30 py-2">
                        <p className="text-[11px] text-brand-text-muted uppercase">Percentile</p>
                        <p className="text-lg font-semibold text-brand-text">{analysis.percentile !== null ? `${analysis.percentile}%` : "-"}</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-brand-border/50 bg-brand-surface/30 p-4">
                    <p className="text-xs uppercase tracking-wider text-brand-text-muted mb-3">Snapshot</p>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-brand-text-muted">Last Role</span>
                        <span className="text-brand-text text-right">{(analysis.parsed.last_job_title as string) || "Not captured"}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-brand-text-muted">Experience</span>
                        <span className="text-brand-text">{analysis.years !== null ? `${analysis.years} years` : "Not specified"}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-brand-text-muted">Processed On</span>
                        <span className="text-brand-text">{new Date(selectedCandidate.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-brand-border/50 bg-brand-surface/30 p-4">
                    <p className="text-xs uppercase tracking-wider text-brand-text-muted mb-3">Resume Access</p>
                    {selectedCandidate.id ? (
                      <button
                        type="button"
                        onClick={() => openResumeFile(selectedCandidate)}
                        className="inline-flex w-full items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-brand-accent/90 text-black text-sm font-semibold hover:bg-brand-accent transition-colors"
                      >
                        <span>Open Original Resume</span>
                        <ExternalLink size={15} />
                      </button>
                    ) : (
                      <p className="text-sm text-brand-text-muted">Resume file link is currently unavailable for this candidate.</p>
                    )}
                    <p className="text-xs text-brand-text-muted mt-2">
                      Recommended: review the original CV before final shortlist decisions.
                    </p>
                  </div>

                </div>

                <div className="xl:col-span-2 space-y-4">
                  <div className="rounded-xl border border-brand-border/50 bg-brand-surface/25 p-4 md:p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <BarChart3 size={16} className="text-brand-accent" />
                      <p className="text-sm font-semibold text-brand-text">Fit Dimensions</p>
                    </div>
                    <div className="space-y-3">
                      {analysis.dimensions.map((metric) => (
                        <div key={metric.label}>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-brand-text-muted uppercase tracking-wider">{metric.label}</span>
                            <span className="text-brand-text font-medium">{metric.value}%</span>
                          </div>
                          <div className="h-2 rounded-full bg-brand-bg/70 border border-brand-border/30 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-brand-accent/80 via-brand-accent to-brand-success transition-all duration-500"
                              style={{ width: `${metric.value}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-xl border border-brand-border/50 bg-brand-surface/25 p-4 md:p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles size={16} className="text-brand-accent" />
                      <p className="text-sm font-semibold text-brand-text">Skill Evidence</p>
                    </div>
                    {analysis.skills.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {analysis.skills.slice(0, 12).map((skill) => (
                          <span key={skill} className="px-3 py-1.5 rounded-full text-xs border border-brand-accent/30 bg-brand-accent/10 text-brand-accent">
                            {skill}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-brand-text-muted">No explicit skill list found in extracted data for this candidate.</p>
                    )}
                  </div>

                  <div className="rounded-xl border border-brand-border/50 bg-brand-surface/25 p-4 md:p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <BrainCircuit size={16} className="text-brand-accent" />
                      <p className="text-sm font-semibold text-brand-text">AI Rationale</p>
                    </div>
                    <p className="text-sm leading-relaxed text-brand-text-muted">
                      {selectedCandidate.summary || "Gemini processed this resume successfully, but no detailed summary was returned for this entry."}
                    </p>
                  </div>

                  <div className="rounded-xl border border-brand-border/50 bg-gradient-to-r from-brand-success/10 via-brand-surface/30 to-brand-accent/10 p-4 md:p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <Trophy size={16} className="text-brand-accent" />
                      <p className="text-sm font-semibold text-brand-text">HR Decision Assist</p>
                    </div>
                    <p className="text-sm text-brand-text-muted leading-relaxed">
                      {analysis.overallScore >= 8
                        ? "Strong shortlist candidate. Recommend advancing to a technical interview round with role-specific scenario questions."
                        : analysis.overallScore >= 5
                          ? "Moderate fit. Consider screening call to validate depth in key skills before moving to interview panel."
                          : "Low current alignment with this role. Keep in talent pool for alternative openings with closer skill overlap."}
                    </p>
                  </div>

                  <div className="rounded-xl border border-brand-border/50 bg-brand-surface/25 p-4 md:p-5">
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
                      {comparisonJobs.length === 0 ? (
                        <p className="text-xs text-brand-text-muted">Add more jobs to enable cross-role ranking.</p>
                      ) : (
                        comparisonJobs.map((job) => (
                          <label
                            key={job.id}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-brand-border/50 bg-brand-surface/40 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={selectedJobIds.includes(job.id)}
                              onChange={() => toggleJobSelection(job.id)}
                              className="accent-[#D4EA63]"
                            />
                            <span className="text-xs text-brand-text truncate">{job.title}</span>
                          </label>
                        ))
                      )}
                    </div>

                    {multiRoleError && <p className="text-xs text-brand-danger mb-2">{multiRoleError}</p>}

                    {multiRoleResults.length > 0 && (
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
                    )}
                  </div>

                  <div className="rounded-xl border border-brand-border/50 bg-brand-surface/25 p-4 md:p-5">
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
                      <p className="text-xs text-brand-text-muted">Load to see resume chunks most relevant to this JD.</p>
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
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

import axios from "axios";

// Assuming FastAPI backend is running locally on port 8000
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true",
  },
});

export const checkHealth = async () => {
  // Pings the backend health router: /api/health
  const { data } = await api.get("/health");
  return data;
};

// Generic fetcher for SWR
export const fetcher = (url: string) => api.get(url).then(res => res.data);

// Job API endpoints
export const fetchJobs = async () => {
  const { data } = await api.get("/jobs");
  return data;
};

export const createJob = async (jobData: { title: string; description: string; company?: string; config_id: number }) => {
  const { data } = await api.post("/jobs", jobData);
  return data;
};

export const fetchJob = async (jobId: string) => {
  const { data } = await api.get(`/jobs/${jobId}`);
  return data;
};

export const deleteJob = async (jobId: string) => {
  const { data } = await api.delete(`/jobs/${jobId}`);
  return data;
};

// Resume API endpoints
export const uploadResume = async (jobId: string, file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("job_id", jobId);
  
  const { data } = await api.post("/resumes/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return data;
};

export const fetchResumesForJob = async (jobId: string) => {
  const { data } = await api.get(`/resumes?job_id=${jobId}`);
  return data;
};

export const fetchAllResumes = async () => {
  const { data } = await api.get(`/resumes`);
  return data;
};

export const fetchConfigs = async () => {
  const { data } = await api.get("/configs");
  return data;
};

export const updateConfig = async (configId: string, name: string, fields: any[]) => {
  const { data } = await api.put(`/configs/${configId}`, { name, fields });
  return data;
};

export const rescanConfig = async (configId: string) => {
  const { data } = await api.post(`/configs/${configId}/rescan`);
  return data;
};

export const deleteResume = async (resumeId: string) => {
  const { data } = await api.delete(`/resumes/${resumeId}`);
  return data;
};

export interface MultiRoleResult {
  job_id: string;
  job_title: string;
  score: number;
  summary: string;
  strengths: string[];
  gaps: string[];
  confidence?: string;
  confidence_reason?: string;
}

export interface RagEvidenceChunk {
  chunk_type: string;
  chunk_text: string;
  similarity: number;
}

export const runMultiRoleRanking = async (resumeId: string, jobIds: string[]) => {
  const { data } = await api.post<MultiRoleResult[]>("/resumes/multi-role", {
    resume_id: resumeId,
    job_ids: jobIds,
  });
  return data;
};

export const fetchRagEvidence = async (resumeId: string, jobId: string, topK = 5) => {
  const { data } = await api.get<{ resume_id: string; job_id: string; chunks: RagEvidenceChunk[] }>(
    `/resumes/${resumeId}/rag-evidence`,
    { params: { job_id: jobId, top_k: topK } }
  );
  return data;
};

import axios from "axios";

// Assuming FastAPI backend is running locally on port 8000
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export const checkHealth = async () => {
  // Pings the backend health router: /api/health
  const { data } = await api.get("/health");
  return data;
};

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
    // Optional: fetch available extraction configs if we implemented that
    return [{ id: 1, name: "Default Config" }]; 
};

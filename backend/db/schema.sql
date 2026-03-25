-- ─────────────────────────────────────────────────
-- HireLens Database Schema
-- Run against Neon PostgreSQL with pgvector enabled
-- ─────────────────────────────────────────────────

-- EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "vector";     -- pgvector for RAG embeddings

-- ─────────────────────────────────────────────────
-- TABLE: extraction_configs
-- ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS extraction_configs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  fields      JSONB       NOT NULL,
  is_default  BOOLEAN     NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────
-- TABLE: jobs
-- ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS jobs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT        NOT NULL,
  company     TEXT,
  description TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────
-- TABLE: resumes
-- ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS resumes (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name       TEXT        NOT NULL,
  file_url        TEXT        NOT NULL,
  file_size       INTEGER     NOT NULL,
  file_type       TEXT        NOT NULL CHECK (file_type IN ('pdf', 'docx')),
  raw_text        TEXT        NOT NULL,
  content_hash    TEXT        NOT NULL,
  extracted_data  JSONB,
  config_id       UUID        REFERENCES extraction_configs(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_resumes_content_hash ON resumes (content_hash);
CREATE INDEX IF NOT EXISTS idx_resumes_config_id    ON resumes (config_id);

-- ─────────────────────────────────────────────────
-- TABLE: screenings
-- ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS screenings (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  resume_id         UUID        NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
  job_id            UUID        NOT NULL REFERENCES jobs(id)    ON DELETE CASCADE,
  score             INTEGER     NOT NULL CHECK (score BETWEEN 1 AND 10),
  summary           TEXT        NOT NULL,
  strengths         TEXT[]      NOT NULL DEFAULT '{}',
  gaps              TEXT[]      NOT NULL DEFAULT '{}',
  confidence        TEXT        NOT NULL CHECK (confidence IN ('high', 'medium', 'low')),
  confidence_reason TEXT        NOT NULL,
  raw_llm_response  JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_screening_resume_job UNIQUE (resume_id, job_id)
);

CREATE INDEX IF NOT EXISTS idx_screenings_job_id    ON screenings (job_id);
CREATE INDEX IF NOT EXISTS idx_screenings_resume_id ON screenings (resume_id);
CREATE INDEX IF NOT EXISTS idx_screenings_score     ON screenings (score DESC);

-- ─────────────────────────────────────────────────
-- TABLE: resume_chunks (RAG — Good-to-Have)
-- ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS resume_chunks (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  resume_id   UUID        NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
  chunk_text  TEXT        NOT NULL,
  chunk_type  TEXT        NOT NULL CHECK (chunk_type IN ('experience','education','skills','projects','summary','other')),
  embedding   vector(768),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chunks_resume_id ON resume_chunks (resume_id);

-- ─────────────────────────────────────────────────
-- Seed default extraction config
-- ─────────────────────────────────────────────────
INSERT INTO extraction_configs (name, fields, is_default) VALUES (
  'Default Config',
  '[
    {"key": "name", "label": "Full Name", "required": true, "type": "string"},
    {"key": "email", "label": "Email Address", "required": true, "type": "string"},
    {"key": "phone", "label": "Phone Number", "required": false, "type": "string"},
    {"key": "years_of_experience", "label": "Years of Experience", "type": "integer", "required": true},
    {"key": "primary_skills", "label": "Primary Skills", "type": "array", "required": true},
    {"key": "last_job_title", "label": "Last Job Title", "required": true, "type": "string"},
    {"key": "last_company", "label": "Last Company", "required": false, "type": "string"},
    {"key": "education", "label": "Highest Education", "required": false, "type": "string"},
    {"key": "location", "label": "Current Location", "required": false, "type": "string"}
  ]'::jsonb,
  true
) ON CONFLICT DO NOTHING;

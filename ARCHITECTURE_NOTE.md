# HireLens Architecture Note

## Overview
HireLens is a two-tier application with a Next.js frontend and a FastAPI backend. The frontend handles recruiter workflows such as job creation, resume upload, candidate analysis, extraction schema edits, and evidence review. The backend handles parsing, extraction, scoring, deduplication, and persistence.

## LLM Choice and Rationale
The system uses Gemini Flash Lite through the `google-genai` SDK. The model choice was driven by structured output support, low latency for iterative screening workflows, and cost profile suitable for assignment-scale usage. A single client wrapper is used to enforce JSON response mode and centralized error handling.

## Prompting Strategy
The implementation uses two prompt families:

1. Extraction prompt
- Built dynamically from the active extraction schema.
- Forces strict JSON output and explicit nulls for missing values.
- Disallows extra keys and discourages inference beyond resume evidence.

2. Scoring prompt
- Inputs JD text, extracted profile, and full resume text.
- Enforces a 1-10 rubric with dealbreaker handling.
- Requires structured evidence: summary, strengths, gaps, confidence, and confidence reason.

This split keeps extraction deterministic while allowing scoring to remain evidence-based and role-specific.

## File Parsing Approach
Resume parsing uses a fallback strategy per format:
- PDF: `pdfplumber` first, then PyMuPDF fallback.
- DOCX: `python-docx` first, then Mammoth fallback.

If parsing still fails or yields insufficient text, the API returns a clear parse error instead of continuing with low-quality input. This avoids hidden failures in downstream LLM calls.

## Duplicate Detection
The backend computes a deterministic content hash from normalized resume identity and combines it with `job_id`. This means a duplicate is blocked only for the same role while still allowing cross-role applications. A database uniqueness constraint and API conflict response are used to handle concurrency safely.

## RAG and Evidence Retrieval
For evidence retrieval, resume text is chunked by semantic sections. Chunks are embedded and ranked against the JD embedding by cosine similarity. If embedding retrieval fails, lexical overlap fallback is used to keep evidence generation available. The UI surfaces top-ranked snippets as JD-relevant evidence.

## Build and Delivery Approach
Development prioritized a working vertical slice early, then iterative hardening:
- First: upload, parse, extract, score, and list candidates.
- Then: config edits with reparse, duplicate handling, and analysis UX.
- Finally: multi-role ranking and RAG evidence in recruiter-facing views.

This approach kept the system deployable while adding higher-value capabilities in controlled increments.

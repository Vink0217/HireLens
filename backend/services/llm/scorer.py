"""
Scoring module — compares a resume against a job description
and returns a score (1-10) with specific, evidence-based justification.
"""

import json
import logging

from services.llm.client import call_gemini

logger = logging.getLogger(__name__)


def build_scoring_prompt(
    resume_text: str, jd_text: str, extracted: dict
) -> str:
    """
    Build a scoring prompt that forces specific, evidence-based justification.

    Anti-pattern avoided: generic phrases like "candidate has relevant skills".
    Instead: "3 years at Razorpay as backend engineer, directly relevant to fintech JD".
    """
    return f"""You are a senior technical recruiter. Score a candidate's fit against a job description using only evidence found in the resume. Do not award credit for skills or experience that are not explicitly present.

JOB DESCRIPTION:
{jd_text}

CANDIDATE PROFILE (extracted fields):
{json.dumps(extracted, indent=2)}

FULL RESUME TEXT:
{resume_text}

SCORING INSTRUCTIONS:

Step 1 — Dealbreaker check. Before scoring, identify any requirements in the JD marked as mandatory (e.g., "must have", "required", "minimum X years"). If the candidate clearly fails a dealbreaker requirement, the score must be 3 or below, regardless of other strengths. Document each failed dealbreaker in "gaps".

Step 2 — Score 1–10 using this rubric:
  1–3 = Fails one or more dealbreaker requirements
  4–5 = Meets some requirements; significant gaps in core skills or experience level
  6–7 = Meets most requirements with minor gaps; could ramp up quickly
  8–9 = Meets all requirements; demonstrably has done similar work before
  10  = Reserved for candidates who exceed all requirements with directly transferable achievements

Step 3 — Write evidence-based justifications. Every strength and gap MUST name specific, verifiable details:
  - BAD: "Candidate has relevant backend experience."
  - GOOD: "2.5 years as backend engineer at Razorpay (2021–2023) building payment APIs — directly mirrors the fintech API work in the JD."
  - BAD: "Candidate lacks cloud experience."
  - GOOD: "JD requires AWS (EC2, RDS, Lambda); resume lists no cloud platforms of any kind."

Step 4 — Set confidence based on resume completeness:
  - "high": dates, titles, and responsibilities are all present and unambiguous
  - "medium": some dates or responsibilities are missing; experience had to be partially inferred
  - "low": resume is sparse, undated, or uses vague language that makes accurate scoring difficult

Return ONLY a valid JSON object in this exact format — no markdown, no commentary:
{{
  "score": <integer 1–10>,
  "summary": "<2–3 sentences: overall verdict with candidate name/role/years if available, specific to THIS JD>",
  "strengths": [
    "<[Company, role, duration] → specific relevance to JD requirement>",
    "<specific skill/achievement → maps to which JD requirement>"
  ],
  "gaps": [
    "<missing JD requirement → what the resume shows instead, or 'not mentioned'>",
    "<dealbreaker failures, if any, clearly labelled>"
  ],
  "confidence": "<high|medium|low>",
  "confidence_reason": "<specific reason: what data is present or missing that affects confidence>"
}}"""


async def score_resume(
    resume_text: str, jd_text: str, extracted: dict
) -> dict:
    """
    Score a resume against a job description using Gemini.

    Args:
        resume_text: Cleaned resume text.
        jd_text: Full job description text.
        extracted: Previously extracted profile fields.

    Returns:
        Scoring result dict with: score, summary, strengths, gaps,
        confidence, confidence_reason.
    """
    prompt = build_scoring_prompt(resume_text, jd_text, extracted)
    result = await call_gemini(prompt, max_tokens=2000)

    # Validate required fields in the response
    required_keys = [
        "score", "summary", "strengths", "gaps",
        "confidence", "confidence_reason",
    ]
    for key in required_keys:
        if key not in result:
            logger.warning("Scoring response missing key: '%s'", key)
            if key == "score":
                result[key] = 5  # default mid-score
            elif key in ("strengths", "gaps"):
                result[key] = []
            elif key == "confidence":
                result[key] = "low"
            else:
                result[key] = "Not provided by model."

    # Clamp score to valid range
    result["score"] = max(1, min(10, int(result["score"])))

    return result

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
    return f"""You are a senior technical recruiter evaluating candidate fit. You will score a candidate against a job description.

JOB DESCRIPTION:
{jd_text}

CANDIDATE PROFILE (extracted):
{json.dumps(extracted, indent=2)}

FULL RESUME TEXT:
{resume_text}

SCORING INSTRUCTIONS:
- Score from 1 to 10 where:
  1-3 = Poor fit (missing core requirements)
  4-6 = Partial fit (has some requirements, notable gaps)
  7-8 = Strong fit (meets most requirements, minor gaps)
  9-10 = Exceptional fit (exceeds requirements)

- Be specific. Reference actual content from the resume (project names, company names, specific skills, years).
- Do NOT say things like "candidate has relevant experience." Say WHICH experience and WHY it is relevant.
- Identify the top 2-3 strengths and top 1-2 gaps.

Return ONLY a valid JSON object in this exact format:
{{
  "score": <integer 1-10>,
  "summary": "<2-3 sentence overall assessment, specific to this candidate>",
  "strengths": ["<specific strength 1>", "<specific strength 2>"],
  "gaps": ["<specific gap 1>"],
  "confidence": "<high|medium|low>",
  "confidence_reason": "<why you are confident or not in this score>"
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

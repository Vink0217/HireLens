"""
Extraction module — dynamically builds prompts from user-configured fields
and calls Gemini to extract structured data from resume text.
"""

import logging

from services.llm.client import call_gemini

logger = logging.getLogger(__name__)


def build_extraction_prompt(raw_text: str, fields: list[dict]) -> str:
    """
    Build a dynamic extraction prompt from the configured field list.

    Each field dict has: key, label, required (bool), type (string|integer|array).
    The prompt instructs Gemini to return a JSON object with exactly these keys.
    """
    field_spec = "\n".join(
        f'- "{f["key"]}": {f["label"]} ({f.get("description", f.get("type", "string"))})'
        for f in fields
    )

    return f"""You are a resume parser. Your only job is to extract data from resume text into a strict JSON schema. You do not infer, embellish, or guess.

FIELDS TO EXTRACT:
{field_spec}

EXTRACTION RULES — follow exactly, no exceptions:
1. Return ONLY a valid JSON object. No explanation, no markdown, no commentary, no trailing text.
2. If a field cannot be determined verbatim from the resume text, return null. Do NOT return "N/A", "unknown", "not specified", or empty string "". Only null.
3. For "years_of_experience":
   a. If explicit date ranges exist, calculate total months across all roles (excluding overlaps) and convert to a rounded integer of years.
   b. If dates are partial (e.g., "2019–present"), treat "present" as the current date.
   c. If no dates exist anywhere in the resume, return null. Do NOT estimate from seniority titles.
   d. Internships and part-time roles: include if durations are explicitly stated.
4. For array fields (e.g., skills): return a JSON array of strings. Never return a comma-separated string. Deduplicate entries. Preserve exact casing as written in the resume.
5. For string fields: extract verbatim. Do not paraphrase, normalise, or standardise (e.g., do not map "Sr. SWE" to "Senior Software Engineer").
6. Do not add keys that are not in the FIELDS list above. Do not omit any key from the FIELDS list — all keys must appear even if their value is null.
7. If the input text is not a resume (e.g., gibberish, a job description, an image placeholder), return a JSON object with all keys set to null and include a single extra key: {{"_parse_error": "not a resume"}}.

RESUME TEXT:
{raw_text}

JSON OUTPUT:"""


async def extract_fields(raw_text: str, fields: list[dict]) -> dict:
    """
    Extract structured fields from resume text using Gemini.

    Args:
        raw_text: Cleaned resume text from parser.
        fields: List of field descriptors from extraction config.

    Returns:
        Dictionary of extracted field values.
    """
    prompt = build_extraction_prompt(raw_text, fields)
    result = await call_gemini(prompt, max_tokens=1500)

    # Validate: fill in None for any missing required fields
    for field in fields:
        if field["key"] not in result:
            result[field["key"]] = None
            if field.get("required"):
                logger.warning(
                    "Required field '%s' was not extracted by Gemini.",
                    field["key"],
                )

    return result

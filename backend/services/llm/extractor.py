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

    return f"""You are a precise resume data extractor. Extract the following fields from the resume text below.

FIELDS TO EXTRACT:
{field_spec}

RULES:
1. Return ONLY a valid JSON object. No explanation, no markdown.
2. If a field cannot be determined from the resume, use null (not "N/A" or "unknown").
3. For "years_of_experience": calculate from work history dates. If no dates, estimate from context. Return an integer.
4. For skills: return an array of strings, not a comma-separated string.
5. Be precise. Extract what is written, do not infer or embellish.

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

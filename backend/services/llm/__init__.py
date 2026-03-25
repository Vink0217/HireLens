"""AI package — all LLM interaction goes through here."""

from services.llm.client import call_gemini
from services.llm.extractor import extract_fields, build_extraction_prompt
from services.llm.scorer import score_resume, build_scoring_prompt

__all__ = [
    "call_gemini",
    "extract_fields",
    "build_extraction_prompt",
    "score_resume",
    "build_scoring_prompt",
]

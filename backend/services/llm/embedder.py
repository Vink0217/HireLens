"""
Embedder module — generates vector embeddings for RAG.

Good-to-Have #3 from the assignment spec.
Uses Gemini's text-embedding-004 model (768 dimensions).
"""

import logging
import re

from google import genai
from google.genai import types

from core.config import settings

logger = logging.getLogger(__name__)

if settings.GEMINI_API_KEY:
    client = genai.Client(api_key=settings.GEMINI_API_KEY)
else:
    client = None

async def embed_text(text: str) -> list[float]:
    """
    Generate a 768-dimensional embedding for a text string.

    Uses Gemini's text-embedding-004 model via the new SDK.
    """
    if not client:
        raise RuntimeError("Gemini client not initialized (missing API key).")
        
    result = await client.aio.models.embed_content(
        model=settings.GEMINI_EMBEDDING_MODEL,
        contents=text,
        config=types.EmbedContentConfig(task_type="RETRIEVAL_DOCUMENT"),
    )
    return result.embeddings[0].values


def detect_sections(text: str) -> dict[str, str]:
    """
    Split resume text into semantic sections using common headers.

    Returns a dict like {"experience": "...", "education": "...", ...}
    """
    section_patterns = {
        "experience": r"(?i)(experience|work\s*history|employment)",
        "education": r"(?i)(education|academic|degree|university)",
        "skills": r"(?i)(skills|technologies|tools|competencies|tech\s*stack)",
        "projects": r"(?i)(projects|portfolio|side\s*projects)",
        "summary": r"(?i)(summary|objective|profile|about\s*me)",
    }

    # Find all section header positions
    markers: list[tuple[int, str]] = []
    for section_name, pattern in section_patterns.items():
        for match in re.finditer(pattern, text):
            markers.append((match.start(), section_name))

    # Sort by position in the text
    markers.sort(key=lambda x: x[0])

    if not markers:
        return {"other": text}

    sections: dict[str, str] = {}
    for i, (pos, name) in enumerate(markers):
        end = markers[i + 1][0] if i + 1 < len(markers) else len(text)
        content = text[pos:end].strip()
        if content:
            sections[name] = content

    return sections


def chunk_resume(raw_text: str, resume_id: str) -> list[dict]:
    """
    Split a resume into semantic chunks for embedding.

    Each chunk is roughly 300 tokens with 50 token overlap.
    """
    sections = detect_sections(raw_text)
    chunks = []

    for section_name, section_text in sections.items():
        sub_chunks = _split_into_windows(section_text, max_chars=1200, overlap_chars=200)
        for chunk in sub_chunks:
            chunks.append({
                "resume_id": resume_id,
                "chunk_text": chunk,
                "chunk_type": section_name,
            })

    return chunks


def _split_into_windows(
    text: str, max_chars: int = 1200, overlap_chars: int = 200
) -> list[str]:
    """Split text into overlapping windows (~300 tokens ≈ 1200 chars)."""
    if len(text) <= max_chars:
        return [text]

    windows = []
    start = 0
    while start < len(text):
        end = start + max_chars
        windows.append(text[start:end])
        start += max_chars - overlap_chars

    return windows

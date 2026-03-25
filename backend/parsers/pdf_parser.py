"""
PDF Parser — two-layer approach for robust text extraction.

Layer 1: pdfplumber (best for text-heavy, well-formatted PDFs)
Layer 2: pymupdf / fitz (fallback for encrypted, compressed, or corrupted PDFs)
"""

import io
import logging

import fitz  # pymupdf
import pdfplumber

from parsers.text_cleaner import clean_text

logger = logging.getLogger(__name__)


def parse_pdf(file_bytes: bytes) -> str:
    """
    Extract text from a PDF file using a two-layer parsing strategy.

    Args:
        file_bytes: Raw bytes of the PDF file.

    Returns:
        Cleaned text content of the PDF.

    Raises:
        ValueError: If the PDF cannot be parsed or is image-only.
    """
    text = ""

    # ── Layer 1: pdfplumber (primary) ──────────────────────────
    try:
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            pages = [page.extract_text() or "" for page in pdf.pages]
            text = "\n".join(pages).strip()
    except Exception as e:
        logger.warning("pdfplumber failed: %s — falling back to pymupdf", e)

    # ── Layer 2: pymupdf fallback ──────────────────────────────
    # If pdfplumber extracted suspiciously little text, try pymupdf
    if len(text) < 100:
        try:
            doc = fitz.open(stream=file_bytes, filetype="pdf")
            text = "\n".join([page.get_text() for page in doc])
            doc.close()
        except Exception as e:
            logger.error("pymupdf also failed: %s", e)
            raise ValueError(
                "Could not parse PDF — file may be corrupted or image-only"
            ) from e

    # ── Edge case: image-only PDF (scanned resume) ─────────────
    if len(text.strip()) < 50:
        raise ValueError(
            "PDF appears to be image-only (scanned). "
            "OCR is not supported in this version."
        )

    return clean_text(text)

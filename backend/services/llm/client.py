"""
Gemini API client wrapper for HireLens.

Provides a single async function to call Gemini
with enforced JSON output mode.
"""

import json
import logging
import asyncio

from google import genai
from google.genai import types

from core.config import settings

logger = logging.getLogger(__name__)

# Initialize the SDK once on import
if settings.GEMINI_API_KEY:
    client = genai.Client(api_key=settings.GEMINI_API_KEY)
else:
    logger.warning("GEMINI_API_KEY not set — AI functions will fail.")
    client = None


async def call_gemini(prompt: str, max_tokens: int = 1500) -> dict:
    """
    Call Gemini and return parsed JSON.

    Args:
        prompt: Full prompt string (must request JSON output).
        max_tokens: Maximum output tokens.

    Returns:
        Parsed JSON dictionary from the model response.

    Raises:
        ValueError: If Gemini returns non-JSON output.
        RuntimeError: If the API call itself fails.
    """
    if not client:
        raise RuntimeError("Gemini client not initialized (missing API key).")

    text = ""
    last_error: Exception | None = None
    for attempt in range(1, 4):
        try:
            response = await client.aio.models.generate_content(
                model="gemini-3.1-flash-lite-preview",
                contents=prompt,
                config=types.GenerateContentConfig(
                    max_output_tokens=max_tokens,
                    temperature=0.2,  # low temp for structured extraction/scoring
                    response_mime_type="application/json",  # enforce JSON natively
                ),
            )

            text = response.text.strip()

            # Safety fallback: strip markdown code fences if model wraps output
            if text.startswith("```"):
                parts = text.split("```")
                if len(parts) >= 3:
                    text = parts[1]
                    if text.startswith("json\n"):
                        text = text[5:]
                    elif text.startswith("json"):
                        text = text[4:]

            return json.loads(text.strip())

        except json.JSONDecodeError as e:
            raise ValueError(
                f"Gemini returned non-JSON response: {text[:200]}..."
            ) from e
        except Exception as e:
            last_error = e
            message = str(e)
            is_transient = (
                "503" in message
                or "UNAVAILABLE" in message.upper()
                or "high demand" in message.lower()
                or "deadline exceeded" in message.lower()
            )

            if is_transient and attempt < 3:
                backoff_seconds = 1.5 * attempt
                logger.warning(
                    "Gemini transient error on attempt %d/3. Retrying in %.1fs: %s",
                    attempt,
                    backoff_seconds,
                    message,
                )
                await asyncio.sleep(backoff_seconds)
                continue

            raise RuntimeError(f"Gemini API error: {e}") from e

    raise RuntimeError(f"Gemini API error: {last_error}") from last_error

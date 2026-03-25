"""
Text cleaner — normalizes extracted resume text.

Removes control characters, normalizes whitespace, and ensures
consistent line endings for downstream processing.
"""

import re


def clean_text(text: str) -> str:
    """
    Normalize whitespace and remove control characters from parsed text.

    Steps:
    1. Remove null bytes
    2. Normalize line endings to \\n
    3. Collapse 3+ blank lines to 2
    4. Collapse horizontal whitespace (tabs, multiple spaces)
    5. Strip leading/trailing whitespace
    """
    text = re.sub(r"\x00", "", text)  # null bytes
    text = re.sub(r"\r\n|\r", "\n", text)  # normalize line endings
    text = re.sub(r"\n{3,}", "\n\n", text)  # collapse multiple blank lines
    text = re.sub(r"[ \t]{2,}", " ", text)  # collapse horizontal whitespace
    return text.strip()

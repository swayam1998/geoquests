"""Gemini Vision verification service for quest photo submissions."""
import json
import logging
import time
from typing import Any, Dict, Optional

from app.config import settings

logger = logging.getLogger(__name__)

# JSON schema for structured Gemini output (flat dict, no nested models)
# Used with response_mime_type="application/json" for reliable parsing.
# Note: Do not include "additionalProperties"; the google-genai SDK's Schema model
# does not accept it and raises ValidationError (extra_forbidden).
GEMINI_RESPONSE_JSON_SCHEMA = {
    "type": "object",
    "properties": {
        "content_match_score": {"type": "integer", "description": "0-100 how well photo matches quest"},
        "is_authentic_photo": {"type": "boolean", "description": "True if real photo at real place"},
        "is_screenshot_or_screen_photo": {"type": "boolean", "description": "True if screenshot or photo of screen"},
        "is_ai_generated": {"type": "boolean", "description": "True if AI-generated or synthetic"},
        "scene_description": {"type": "string", "description": "Brief description of the image"},
        "grade": {"type": "string", "enum": ["A", "B", "C", "D", "F"], "description": "A=matches and authentic, F=wrong or inauthentic"},
        "reasoning": {"type": "string", "description": "Short explanation"},
        "flags": {"type": "array", "items": {"type": "string"}, "description": "e.g. possible screen photo, unclear subject"},
    },
    "required": [
        "content_match_score", "is_authentic_photo", "is_screenshot_or_screen_photo",
        "is_ai_generated", "scene_description", "grade", "reasoning", "flags",
    ],
}

# Default result when Gemini is skipped or fails
DEFAULT_NULL_RESULT: Optional[Dict[str, Any]] = None

# Retry on rate limit (429) and server errors: attempts, initial delay (s), max delay (s)
GEMINI_RETRY_ATTEMPTS = 5
GEMINI_RETRY_INITIAL_DELAY = 1.0
GEMINI_RETRY_MAX_DELAY = 60.0


def _is_rate_limit_error(e: BaseException) -> bool:
    """True if the exception indicates quota/rate limit (429 or ResourceExhausted)."""
    name = type(e).__name__
    msg = str(e).lower()
    return (
        "ResourceExhausted" in name
        or "429" in str(e)
        or "quota" in msg
        or "rate limit" in msg
        or "resource has been exhausted" in msg
    )


def _parse_gemini_json(text: str) -> Optional[Dict[str, Any]]:
    """Parse JSON from Gemini response with fallback for malformed/truncated output."""
    if not text or not text.strip():
        return None
    text = text.strip()
    # Extract JSON from markdown code block if present
    if "```json" in text:
        start = text.find("```json") + 7
        end = text.find("```", start)
        text = text[start:end].strip() if end != -1 else text[start:].strip()
    elif "```" in text:
        start = text.find("```") + 3
        end = text.find("```", start)
        text = text[start:end].strip() if end != -1 else text[start:].strip()
    # Try parse, then try repairing truncated JSON (missing closing braces)
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        repaired = _repair_truncated_json(text)
        if repaired:
            try:
                return json.loads(repaired)
            except json.JSONDecodeError:
                pass
        logger.warning(
            "Gemini response was not valid JSON (see 'Gemini raw response body' above for full output): %.200s",
            text,
        )
        return None


def _repair_truncated_json(text: str) -> Optional[str]:
    """Attempt to close truncated JSON by appending missing } or ]."""
    if not text or not text.strip():
        return None
    open_braces = text.count("{") - text.count("}")
    open_brackets = text.count("[") - text.count("]")
    if open_braces <= 0 and open_brackets <= 0:
        return None
    return text + "]" * open_brackets + "}" * open_braces


def _log_gemini_raw_response(response_text: str) -> None:
    """Log the full raw response from Gemini for debugging."""
    if not response_text:
        return
    n = len(response_text)
    logger.info("Gemini raw response length=%s", n)
    # Log full body so we can see truncation or malformed JSON; cap at 4k to avoid huge logs
    to_log = response_text if n <= 4096 else response_text[:4096] + "\n... (truncated, total %s chars)" % n
    logger.info("Gemini raw response body: %s", to_log)


def verify_with_gemini(
    image_bytes: bytes,
    quest_title: str,
    quest_description: str,
    exif_has_no_gps: bool = False,
) -> Optional[Dict[str, Any]]:
    """
    Verify photo with Gemini (2.5 Flash / 3 Flash): authenticity, content match, screenshots/AI.

    Returns dict with:
        content_match_score (0-100),
        is_authentic_photo (bool),
        is_screenshot_or_screen_photo (bool),
        is_ai_generated (bool),
        scene_description (str),
        grade ("A"|"B"|"C"|"D"|"F"),
        reasoning (str),
        flags (list of str)
    or None on API failure (graceful degradation).
    """
    if not settings.GEMINI_API_KEY:
        logger.warning("GEMINI_API_KEY not set; skipping Gemini verification")
        return DEFAULT_NULL_RESULT

    try:
        from google import genai
        from google.genai import types

        # Optional: use HTTP retry for 429/5xx (google-genai 1.x may support HttpOptions)
        http_options = None
        try:
            from google.genai.types import HttpOptions, HttpRetryOptions

            http_options = HttpOptions(
                timeout=120_000,  # ms
                retry_options=HttpRetryOptions(
                    attempts=GEMINI_RETRY_ATTEMPTS,
                    initial_delay=GEMINI_RETRY_INITIAL_DELAY,
                    max_delay=GEMINI_RETRY_MAX_DELAY,
                    exp_base=2.0,
                    jitter=0.2,
                    http_status_codes=[408, 429, 500, 502, 503, 504],
                ),
            )
        except (ImportError, AttributeError):
            pass

        client = genai.Client(
            api_key=settings.GEMINI_API_KEY,
            http_options=http_options,
        )

        prompt = f"""You are a photo verification system for a location-based quest app. The user submitted a photo for a quest.

Quest title: {quest_title}
Quest description: {quest_description}
"""
        if exif_has_no_gps:
            prompt += "\nNote: This photo has no GPS data embedded in EXIF (uploaded photo). Consider this when grading authenticity.\n"

        prompt += """
Analyze the image and respond with a single JSON object (no markdown, no extra text) with exactly these keys:
- "content_match_score": number 0-100 (how well the photo content matches the quest subject/location)
- "is_authentic_photo": boolean (true if this looks like a real photo taken at a real place, not a screenshot, not a photo of a screen, not AI-generated)
- "is_screenshot_or_screen_photo": boolean (true if the image appears to be a screenshot or a photo of a screen/display)
- "is_ai_generated": boolean (true if the image appears to be AI-generated or synthetic)
- "scene_description": string (brief description of what you see in the image)
- "grade": string, one of "A", "B", "C", "D", "F" (A = clearly matches quest and authentic, F = wrong or inauthentic)
- "reasoning": string (short explanation)
- "flags": array of strings (e.g. "possible screen photo", "unclear subject", or empty [])
"""

        contents = [
            types.Content(
                role="user",
                parts=[
                    types.Part.from_text(text=prompt),
                    types.Part(inline_data=types.Blob(mime_type="image/jpeg", data=image_bytes)),
                ],
            )
        ]

        model_name = (settings.GEMINI_MODEL or "gemini-2.5-flash").strip() or "gemini-2.5-flash"
        # Structured JSON output: response_mime_type forces valid JSON and reduces truncation
        config_kw: Dict[str, Any] = {
            "temperature": 0.2,
            "max_output_tokens": 2048,
            "response_mime_type": "application/json",
        }
        # Attach JSON schema if this SDK version supports it (ensures valid structure)
        for schema_key in ("response_json_schema", "response_schema"):
            try:
                config_kw[schema_key] = GEMINI_RESPONSE_JSON_SCHEMA
                types.GenerateContentConfig(**config_kw)
                logger.debug("Using Gemini structured output with key=%s", schema_key)
                break
            except (TypeError, ValueError, AttributeError):
                config_kw.pop(schema_key, None)
                continue
        thinking_level = (settings.GEMINI_THINKING_LEVEL or "").strip().upper()
        if model_name.startswith("gemini-3-") and thinking_level in ("LOW", "MEDIUM", "HIGH"):
            try:
                config_kw["thinking_config"] = types.ThinkingConfig(
                    thinking_level=thinking_level,
                )
            except (AttributeError, TypeError):
                pass  # SDK may not expose ThinkingConfig yet
        config = types.GenerateContentConfig(**config_kw)
        last_error: Optional[BaseException] = None
        for attempt in range(GEMINI_RETRY_ATTEMPTS):
            try:
                response = client.models.generate_content(
                    model=model_name,
                    contents=contents,
                    config=config,
                )
                last_error = None
                break
            except Exception as e:
                last_error = e
                if not _is_rate_limit_error(e) or attempt >= GEMINI_RETRY_ATTEMPTS - 1:
                    raise
                delay = min(
                    GEMINI_RETRY_MAX_DELAY,
                    GEMINI_RETRY_INITIAL_DELAY * (2**attempt),
                )
                logger.info(
                    "Gemini rate limited (attempt %s/%s), retrying in %.1fs: %s",
                    attempt + 1,
                    GEMINI_RETRY_ATTEMPTS,
                    delay,
                    str(e)[:150],
                )
                time.sleep(delay)

        if last_error is not None:
            raise last_error

        response_text = response.text if response and hasattr(response, "text") else None
        if not response_text:
            logger.warning("Gemini returned empty response")
            return DEFAULT_NULL_RESULT

        # Log full raw response for debugging (what Gemini actually sent back)
        _log_gemini_raw_response(response_text)

        data = _parse_gemini_json(response_text)
        if not data:
            logger.warning("Gemini response could not be parsed as JSON; skipping AI verification")
            return DEFAULT_NULL_RESULT

        # Normalize types
        result: Dict[str, Any] = {
            "content_match_score": int(data.get("content_match_score", 0)) if data.get("content_match_score") is not None else 0,
            "is_authentic_photo": bool(data.get("is_authentic_photo", True)),
            "is_screenshot_or_screen_photo": bool(data.get("is_screenshot_or_screen_photo", False)),
            "is_ai_generated": bool(data.get("is_ai_generated", False)),
            "scene_description": str(data.get("scene_description", "")),
            "grade": str(data.get("grade", "C")).strip().upper() if data.get("grade") else "C",
            "reasoning": str(data.get("reasoning", "")),
            "flags": list(data["flags"]) if isinstance(data.get("flags"), list) else [],
        }
        if result["grade"] not in ("A", "B", "C", "D", "F"):
            result["grade"] = "C"
        result["content_match_score"] = max(0, min(100, result["content_match_score"]))

        # Log Gemini result for debugging and auditing
        logger.info(
            "Gemini verification result: grade=%s content_match_score=%s is_authentic=%s "
            "is_screenshot_or_ai=%s scene=%s reasoning=%s flags=%s",
            result["grade"],
            result["content_match_score"],
            result["is_authentic_photo"],
            result["is_screenshot_or_screen_photo"] or result["is_ai_generated"],
            (result.get("scene_description") or "")[:80],
            (result.get("reasoning") or "")[:120],
            result.get("flags", []),
        )
        return result

    except Exception as e:
        err_msg = str(e)
        if _is_rate_limit_error(e):
            logger.warning(
                "Gemini quota exceeded or rate limited after retries; skipping AI verification. Submission will still be allowed. %s",
                err_msg[:200],
            )
        else:
            logger.error("Gemini verification failed: %s", e, exc_info=True)
        return DEFAULT_NULL_RESULT

"""Quest cover image generation using Gemini API (Nano Banana / gemini-3-pro-image-preview)."""
import io
import logging
from typing import Optional

from app.config import settings

logger = logging.getLogger(__name__)


def _png_to_jpeg_bytes(png_bytes: bytes) -> bytes:
    """Convert PNG bytes to JPEG bytes for consistent cover.jpg storage."""
    try:
        from PIL import Image
        img = Image.open(io.BytesIO(png_bytes))
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")
        out = io.BytesIO()
        img.save(out, format="JPEG", quality=90)
        return out.getvalue()
    except Exception as e:
        logger.warning("PNG to JPEG conversion failed, using raw bytes: %s", e)
        return png_bytes


def generate_quest_cover(title: str, description: str) -> Optional[bytes]:
    """
    Generate a watercolor-style cover image for a quest using Gemini API (Nano Banana).

    Uses generate_content_stream with gemini-3-pro-image-preview; collects first image
    chunk from inline_data.data. Converts PNG to JPEG if needed for cover.jpg storage.

    Args:
        title: Quest title
        description: Quest description

    Returns:
        JPEG image bytes, or None if disabled, no API key, or generation fails.
    """
    if not getattr(settings, "GEMINI_QUEST_COVER_ENABLED", True):
        return None
    if not (getattr(settings, "GEMINI_API_KEY", "") or "").strip():
        logger.debug("Quest cover skipped: GEMINI_API_KEY not set")
        return None

    description_snippet = (description or "").strip()[:150]
    if len((description or "").strip()) > 150:
        description_snippet = description_snippet.rstrip() + "…"

    prompt = (
        "Watercolor painting, soft washes, visible paper texture, gentle color blending. "
        f'A scenic, inviting illustration for a location-based photo quest: "{title}". '
        f"{description_snippet}. No text or text overlays in the image."
    )

    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=settings.GEMINI_API_KEY)

        contents = [
            types.Content(
                role="user",
                parts=[types.Part.from_text(text=prompt)],
            ),
        ]

        image_config = types.ImageConfig(
            image_size="1K",
        )
        generate_content_config = types.GenerateContentConfig(
            image_config=image_config,
            response_modalities=["IMAGE", "TEXT"],
        )

        for chunk in client.models.generate_content_stream(
            model="gemini-3-pro-image-preview",
            contents=contents,
            config=generate_content_config,
        ):
            if chunk.parts is None or len(chunk.parts) == 0:
                continue
            part = chunk.parts[0]
            if part.inline_data and part.inline_data.data:
                inline_data = part.inline_data
                data_buffer = inline_data.data
                if isinstance(data_buffer, str):
                    import base64
                    data_buffer = base64.b64decode(data_buffer)
                mime = (getattr(inline_data, "mime_type", None) or "").lower()
                if "png" in mime:
                    data_buffer = _png_to_jpeg_bytes(data_buffer)
                return data_buffer
            if getattr(chunk, "text", None):
                logger.debug("Gemini cover stream text: %s", chunk.text[:200] if chunk.text else "")

        logger.warning("Gemini cover stream produced no image parts")
        return None

    except Exception as e:
        logger.warning("Quest cover generation failed: %s", e, exc_info=True)
        return None

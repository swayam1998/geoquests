"""Image storage utilities for quest submissions."""
import os
from pathlib import Path
from uuid import UUID
from app.config import settings


def ensure_upload_directory(base_dir: str = None) -> Path:
    """
    Ensure upload directory exists.
    
    Args:
        base_dir: Base directory for uploads (defaults to settings.UPLOAD_DIR)
    
    Returns:
        Path to upload directory
    """
    if base_dir is None:
        base_dir = getattr(settings, 'UPLOAD_DIR', 'uploads')
    
    upload_path = Path(base_dir)
    upload_path.mkdir(parents=True, exist_ok=True)
    return upload_path


def save_image(
    image_bytes: bytes,
    quest_id: UUID,
    submission_id: UUID,
    base_dir: str = None
) -> str:
    """
    Save image to local filesystem.
    
    Args:
        image_bytes: Image file bytes
        quest_id: Quest UUID
        submission_id: Submission UUID
        base_dir: Base directory for uploads
    
    Returns:
        Relative path to saved image (e.g., "quests/{quest_id}/submissions/{submission_id}.jpg")
    """
    # Ensure base upload directory exists
    upload_base = ensure_upload_directory(base_dir)
    
    # Create quest-specific directory
    quest_dir = upload_base / "quests" / str(quest_id) / "submissions"
    quest_dir.mkdir(parents=True, exist_ok=True)
    
    # Save image
    image_path = quest_dir / f"{submission_id}.jpg"
    image_path.write_bytes(image_bytes)
    
    # Return relative path
    relative_path = f"quests/{quest_id}/submissions/{submission_id}.jpg"
    return relative_path


def get_image_url(relative_path: str, base_url: str = None) -> str:
    """
    Get full URL for serving an image.
    
    Args:
        relative_path: Relative path to image (from save_image)
        base_url: Base URL for static files (defaults to settings.API_URL/static)
    
    Returns:
        Full URL to image
    """
    if base_url is None:
        # Default to localhost for MVP
        api_url = getattr(settings, 'API_URL', 'http://localhost:8000')
        base_url = f"{api_url}/static"
    
    # Remove leading slash if present
    relative_path = relative_path.lstrip('/')
    
    return f"{base_url}/{relative_path}"


def delete_image(relative_path: str, base_dir: str = None) -> bool:
    """
    Delete an image file.
    
    Args:
        relative_path: Relative path to image
        base_dir: Base directory for uploads
    
    Returns:
        True if deleted, False if not found
    """
    if base_dir is None:
        base_dir = getattr(settings, 'UPLOAD_DIR', 'uploads')
    
    full_path = Path(base_dir) / relative_path
    
    if full_path.exists():
        full_path.unlink()
        return True
    
    return False

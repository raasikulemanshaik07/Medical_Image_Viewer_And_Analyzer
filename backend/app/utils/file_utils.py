"""
utils/file_utils.py
-------------------
Helpers for safe file handling.

Security principles applied here:
  1. We never trust the user-supplied filename.
  2. We generate a UUID-based stored name to prevent collisions and path traversal.
  3. We validate file *content* (via Pillow) rather than just the extension.
  4. We enforce a hard size cap before writing anything to disk.
"""
from __future__ import annotations

import io
import uuid
import logging
from pathlib import Path

from PIL import Image, UnidentifiedImageError
from fastapi import UploadFile, HTTPException, status

from app.config import settings

logger = logging.getLogger(__name__)


def generate_image_id() -> str:
    """Return a short, unique image identifier like 'img_3f2a1b8c'."""
    return f"img_{uuid.uuid4().hex[:8]}"


def safe_stored_filename(original_filename: str, image_format: str) -> str:
    """
    Generate a collision-free, path-traversal-safe filename for disk storage.

    We deliberately IGNORE the original filename for the stored name and
    use a UUID instead. The original name is kept only in the database.

    Example: 'img_3f2a1b8c.png'
    """
    ext = image_format.lower()
    if ext == "jpeg":
        ext = "jpg"
    return f"{uuid.uuid4().hex}.{ext}"


def get_upload_path(stored_filename: str) -> Path:
    """Return the absolute Path for a stored original image."""
    return settings.upload_dir / stored_filename


def get_processed_path(stored_filename: str) -> Path:
    """Return the absolute Path for a processed image variant."""
    return settings.processed_dir / stored_filename


async def validate_and_read_upload(file: UploadFile) -> tuple[bytes, str, int, int, int]:
    """
    Read, validate, and return upload file contents.

    Steps:
      1. Check the file extension is in the allowed list.
      2. Read the entire file into memory (enforcing the size limit).
      3. Use Pillow to verify it is actually a valid image (content validation).
      4. Confirm the format is supported.

    Returns:
        (file_bytes, pil_format, width, height, channels)

    Raises:
        HTTPException 400 — if any validation fails.
        HTTPException 413 — if the file exceeds the size limit.
    """
    # ── 1. Extension check ────────────────────────────────────────────────────
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No filename provided.",
        )

    suffix = Path(file.filename).suffix.lstrip(".").lower()
    if suffix not in settings.allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"File extension '.{suffix}' is not supported. "
                f"Allowed: {sorted(settings.allowed_extensions)}"
            ),
        )

    # ── 2. Read with size guard ───────────────────────────────────────────────
    # We read in chunks so we can abort early if the file is too large.
    chunks: list[bytes] = []
    total_size = 0
    chunk_size = 64 * 1024  # 64 KB

    while True:
        chunk = await file.read(chunk_size)
        if not chunk:
            break
        total_size += len(chunk)
        if total_size > settings.max_upload_size_bytes:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=(
                    f"File exceeds the maximum allowed size of "
                    f"{settings.max_upload_size_bytes // (1024 * 1024)} MB."
                ),
            )
        chunks.append(chunk)

    file_bytes = b"".join(chunks)

    if len(file_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded file is empty.",
        )

    # ── 3. Content validation via Pillow ──────────────────────────────────────
    try:
        with Image.open(io.BytesIO(file_bytes)) as img:
            pil_format = img.format  # "PNG", "JPEG", "TIFF", etc.
            width, height = img.size
            mode = img.mode           # "L", "RGB", "RGBA", etc.
            # Capture bands INSIDE the context while img is still open
            channels = _mode_to_channels(mode)
    except UnidentifiedImageError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File content could not be identified as a valid image. It may be corrupted.",
        )
    except Exception as exc:
        logger.error("Unexpected error validating image: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unable to read the uploaded file.",
        )

    # ── 4. Format check ───────────────────────────────────────────────────────
    if pil_format not in settings.allowed_formats:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Image format '{pil_format}' is not supported. "
                f"Supported formats: {sorted(settings.allowed_formats)}"
            ),
        )

    return file_bytes, pil_format, width, height, channels


def _mode_to_channels(mode: str) -> int:
    """Map a Pillow image mode string to a channel count."""
    mapping = {
        "1": 1, "L": 1, "P": 1,
        "RGB": 3, "BGR": 3,
        "RGBA": 4, "CMYK": 4, "YCbCr": 3,
        "LAB": 3, "HSV": 3,
        "I": 1, "F": 1,
    }
    return mapping.get(mode, 3)


def save_file_to_disk(file_bytes: bytes, dest_path: Path) -> None:
    """Write raw bytes to `dest_path`, creating parent dirs if needed."""
    dest_path.parent.mkdir(parents=True, exist_ok=True)
    dest_path.write_bytes(file_bytes)
    logger.info("Saved file to %s (%d bytes)", dest_path, len(file_bytes))


def human_readable_size(size_bytes: int) -> str:
    """Convert a byte count to a human-readable string like '2.34 MB'."""
    for unit in ("B", "KB", "MB", "GB"):
        if size_bytes < 1024:
            return f"{size_bytes:.2f} {unit}"
        size_bytes /= 1024
    return f"{size_bytes:.2f} TB"

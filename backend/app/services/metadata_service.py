"""
services/metadata_service.py
-----------------------------
Extract technical metadata from stored image files.
"""
from __future__ import annotations

from pathlib import Path
from PIL import Image

from app.utils.file_utils import human_readable_size


def extract_metadata(
    image_path: Path,
    image_id: str,
    filename: str,
) -> dict:
    """
    Return a dict of technical image metadata.

    Uses Pillow for format and mode information; file size comes from the OS.
    No patient-identifying information is read or returned.
    """
    stat = image_path.stat()
    file_size = stat.st_size

    with Image.open(image_path) as img:
        width, height = img.size
        fmt = img.format or "UNKNOWN"
        mode = img.mode                      # "RGB", "L", "RGBA", etc.
        channels = len(img.getbands())

    return {
        "image_id": image_id,
        "filename": filename,
        "file_format": fmt,
        "width": width,
        "height": height,
        "channels": channels,
        "color_mode": mode,
        "file_size": file_size,
        "file_size_human": human_readable_size(file_size),
    }

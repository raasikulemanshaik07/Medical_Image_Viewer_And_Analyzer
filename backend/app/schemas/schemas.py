"""
schemas/schemas.py
------------------
Pydantic models used for:
  - Validating incoming request bodies.
  - Shaping outgoing API responses.
  - Auto-generating FastAPI's OpenAPI documentation.

Pydantic v2 syntax is used throughout (model_config, field_validator, etc.).
"""
from __future__ import annotations

import json
from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field, field_validator


# ═══════════════════════════════════════════════════════════════════════════════
# Image schemas
# ═══════════════════════════════════════════════════════════════════════════════

class ImageResponse(BaseModel):
    """Returned after a successful upload or when querying a single image."""
    image_id: str
    filename: str
    file_format: str
    width: int
    height: int
    channels: int
    file_size: int
    created_at: datetime
    status: str = "uploaded"

    model_config = {"from_attributes": True}


class ImageListItem(BaseModel):
    """Compact representation used in list responses."""
    image_id: str
    filename: str
    file_format: str
    width: int
    height: int
    file_size: int
    created_at: datetime

    model_config = {"from_attributes": True}


class ImageListResponse(BaseModel):
    images: list[ImageListItem]
    total: int


# ═══════════════════════════════════════════════════════════════════════════════
# Metadata schemas
# ═══════════════════════════════════════════════════════════════════════════════

class MetadataResponse(BaseModel):
    image_id: str
    filename: str
    file_format: str
    width: int
    height: int
    channels: int
    color_mode: str          # e.g. "RGB", "L" (grayscale), "RGBA"
    file_size: int
    file_size_human: str     # e.g. "1.23 MB"
    created_at: datetime


# ═══════════════════════════════════════════════════════════════════════════════
# Processing schemas
# ═══════════════════════════════════════════════════════════════════════════════

VALID_OPERATIONS = {
    "grayscale",
    "gaussian_blur",
    "median_blur",
    "histogram_equalization",
    "canny_edge",
    "threshold",
    "erode",
    "dilate",
    "morph_open",
    "morph_close",
    "brightness_contrast",
    "invert",
}


class ProcessRequest(BaseModel):
    """
    Request body for POST /api/images/{image_id}/process.

    `operation` must be one of the supported OpenCV operations.
    `parameters` is a free-form dict; each operation validates its own params
    inside the service layer.
    """
    operation: str
    parameters: dict[str, Any] = Field(default_factory=dict)

    @field_validator("operation")
    @classmethod
    def validate_operation(cls, v: str) -> str:
        if v not in VALID_OPERATIONS:
            raise ValueError(
                f"Unsupported operation '{v}'. "
                f"Valid operations: {sorted(VALID_OPERATIONS)}"
            )
        return v


class ProcessResponse(BaseModel):
    image_id: str
    operation: str
    parameters: dict[str, Any]
    processed_image_url: str     # relative URL to fetch the processed image
    message: str = "Processing complete"

    # IMPORTANT: Results are experimental image processing metrics only.
    # They are NOT clinical diagnoses and must not be interpreted as such.
    disclaimer: str = (
        "This result is produced by experimental image-processing algorithms. "
        "It has no clinical validity and must not be used for medical diagnosis."
    )


# ═══════════════════════════════════════════════════════════════════════════════
# Analysis schemas
# ═══════════════════════════════════════════════════════════════════════════════

class ImageStatistics(BaseModel):
    """
    Basic quantitative metrics for the full image.
    These are standard photometric measurements — NOT clinical indicators.
    """
    image_id: str
    width: int
    height: int
    channels: int
    min_intensity: float
    max_intensity: float
    mean_intensity: float
    median_intensity: float
    standard_deviation: float
    disclaimer: str = (
        "These statistics describe pixel intensity distributions only. "
        "They carry no clinical meaning and must not be used for diagnosis."
    )


class ROIRequest(BaseModel):
    """Coordinates and dimensions of a rectangular region of interest."""
    x: int = Field(..., ge=0, description="Left edge of ROI in image pixels")
    y: int = Field(..., ge=0, description="Top edge of ROI in image pixels")
    width: int = Field(..., gt=0, description="Width of ROI in image pixels")
    height: int = Field(..., gt=0, description="Height of ROI in image pixels")


class ROIStatistics(BaseModel):
    image_id: str
    x: int
    y: int
    width: int
    height: int
    pixel_count: int
    min_intensity: float
    max_intensity: float
    mean_intensity: float
    standard_deviation: float
    disclaimer: str = (
        "ROI statistics are experimental image-processing metrics only. "
        "They carry no clinical meaning."
    )


class HistogramData(BaseModel):
    """
    Intensity histogram for a grayscale image or ROI.
    `bins`   — list of 256 intensity levels (0–255).
    `counts` — pixel count at each intensity level.
    """
    image_id: str
    source: str           # "full_image" or "roi"
    bins: list[int]       # always [0, 1, …, 255]
    counts: list[int]     # length 256


class EdgeMetrics(BaseModel):
    image_id: str
    threshold1: int
    threshold2: int
    total_pixels: int
    edge_pixels: int
    edge_pixel_percentage: float
    disclaimer: str = (
        "Edge pixel count is a basic image-processing metric. "
        "Detected edges do not represent anatomical boundaries "
        "and have no clinical significance."
    )


# ═══════════════════════════════════════════════════════════════════════════════
# History schemas
# ═══════════════════════════════════════════════════════════════════════════════

class HistoryEntry(BaseModel):
    id: int
    image_id: str
    operation_name: str
    parameters: Optional[dict[str, Any]] = None
    created_at: datetime

    model_config = {"from_attributes": True}

    @field_validator("parameters", mode="before")
    @classmethod
    def parse_parameters(cls, v):
        """Parameters are stored as a JSON string in the DB; parse them."""
        if isinstance(v, str):
            try:
                return json.loads(v)
            except (json.JSONDecodeError, TypeError):
                return {}
        return v


class HistoryResponse(BaseModel):
    image_id: str
    entries: list[HistoryEntry]
    total: int


# ═══════════════════════════════════════════════════════════════════════════════
# Generic error schema
# ═══════════════════════════════════════════════════════════════════════════════

class ErrorResponse(BaseModel):
    detail: str
    code: Optional[str] = None

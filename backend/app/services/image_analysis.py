"""
services/image_analysis.py
---------------------------
Quantitative image analysis functions.

All metrics produced here describe pixel intensity distributions.
They are NOT clinical measurements and must not be interpreted as
indicators of disease or used for medical diagnosis.
"""
from __future__ import annotations

import logging
import numpy as np
import cv2

logger = logging.getLogger(__name__)


def compute_statistics(image: np.ndarray, image_id: str) -> dict:
    """
    Compute basic photometric statistics for the full image.

    Converts colour images to grayscale first so that all metrics
    refer to a single intensity channel.

    Metrics:
      - min/max intensity: darkest and brightest pixel values (0-255 for uint8)
      - mean:              average intensity — overall brightness
      - median:            robust central tendency — less affected by outliers
      - std_dev:           spread of intensities — higher → more contrast
    """
    gray = _to_gray(image)

    height, width = gray.shape
    channels = 1 if len(image.shape) == 2 else image.shape[2]

    return {
        "image_id": image_id,
        "width": width,
        "height": height,
        "channels": channels,
        "min_intensity": float(gray.min()),
        "max_intensity": float(gray.max()),
        "mean_intensity": float(np.mean(gray)),
        "median_intensity": float(np.median(gray)),
        "standard_deviation": float(np.std(gray)),
        "disclaimer": (
            "These statistics describe pixel intensity distributions only. "
            "They carry no clinical meaning and must not be used for diagnosis."
        ),
    }


def compute_roi_statistics(
    image: np.ndarray,
    image_id: str,
    x: int,
    y: int,
    width: int,
    height: int,
) -> dict:
    """
    Compute statistics for a rectangular region of interest (ROI).

    Coordinate validation:
      - ROI must be fully contained within the image.
      - If it extends beyond the image boundary the caller receives a
        clear error (raised as ValueError here, caught by the API layer).

    Coordinate system:
      - (x, y) is the top-left corner.
      - OpenCV uses (row, col) indexing, so array slicing is:
          image[y : y+height, x : x+width]
    """
    img_height, img_width = image.shape[:2]

    # Validate that the ROI fits inside the image
    if x < 0 or y < 0:
        raise ValueError("ROI origin (x, y) must be non-negative.")
    if x + width > img_width or y + height > img_height:
        raise ValueError(
            f"ROI extends beyond image boundaries. "
            f"Image: {img_width}×{img_height}, "
            f"ROI: x={x}, y={y}, w={width}, h={height}."
        )

    gray = _to_gray(image)
    roi = gray[y: y + height, x: x + width]
    pixel_count = roi.size

    return {
        "image_id": image_id,
        "x": x,
        "y": y,
        "width": width,
        "height": height,
        "pixel_count": pixel_count,
        "min_intensity": float(roi.min()),
        "max_intensity": float(roi.max()),
        "mean_intensity": float(np.mean(roi)),
        "standard_deviation": float(np.std(roi)),
        "disclaimer": (
            "ROI statistics are experimental image-processing metrics only. "
            "They carry no clinical meaning."
        ),
    }


def compute_histogram(
    image: np.ndarray,
    image_id: str,
    roi: dict | None = None,
) -> dict:
    """
    Compute a 256-bin grayscale intensity histogram.

    For a full image, converts to grayscale first.
    If `roi` is provided (dict with x, y, width, height), the histogram
    is computed for that region only.

    Returns:
        bins   — list of 256 integers [0, 1, …, 255]
        counts — pixel count at each intensity level
    """
    gray = _to_gray(image)

    source = "full_image"
    if roi:
        x, y, w, h = roi["x"], roi["y"], roi["width"], roi["height"]
        gray = gray[y: y + h, x: x + w]
        source = "roi"

    # cv2.calcHist returns a (256, 1) float32 array
    hist = cv2.calcHist([gray], [0], None, [256], [0, 256])
    counts = hist.flatten().astype(int).tolist()
    bins = list(range(256))

    return {
        "image_id": image_id,
        "source": source,
        "bins": bins,
        "counts": counts,
    }


def compute_edge_metrics(
    image: np.ndarray,
    image_id: str,
    threshold1: int = 50,
    threshold2: int = 150,
) -> dict:
    """
    Run Canny edge detection and count the resulting edge pixels.

    Metrics:
      - total_pixels          — H × W
      - edge_pixels           — pixels set to 255 in the Canny output
      - edge_pixel_percentage — edge_pixels / total_pixels × 100

    DISCLAIMER: This is a basic image-processing metric. Edge pixel count
    does not represent anatomical boundaries and has no clinical significance.
    """
    gray = _to_gray(image)
    edges = cv2.Canny(gray, threshold1, threshold2)

    total = edges.size
    edge_count = int(np.count_nonzero(edges))
    percentage = round((edge_count / total) * 100, 4) if total > 0 else 0.0

    return {
        "image_id": image_id,
        "threshold1": threshold1,
        "threshold2": threshold2,
        "total_pixels": total,
        "edge_pixels": edge_count,
        "edge_pixel_percentage": percentage,
        "disclaimer": (
            "Edge pixel count is a basic image-processing metric. "
            "Detected edges do not represent anatomical boundaries "
            "and have no clinical significance."
        ),
    }


# ── Internal helpers ──────────────────────────────────────────────────────────

def _to_gray(image: np.ndarray) -> np.ndarray:
    if len(image.shape) == 2:
        return image
    return cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

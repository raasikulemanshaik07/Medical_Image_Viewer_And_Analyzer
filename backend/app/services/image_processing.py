"""
services/image_processing.py
-----------------------------
All OpenCV image-processing operations.

Design principles:
  - Every public function accepts a NumPy ndarray and returns a NumPy ndarray.
  - No file I/O happens inside this module; the API layer handles that.
  - Parameters are validated before the OpenCV call to produce clear errors.
  - All operations preserve the original array (we work on copies).

Interview talking points:
  - OpenCV stores images as NumPy arrays in BGR channel order.
  - Grayscale images are 2-D arrays; colour images are 3-D (H × W × C).
  - Pixel values are uint8 (0-255) for 8-bit images.
"""
from __future__ import annotations

import logging
import numpy as np
import cv2

logger = logging.getLogger(__name__)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _to_gray(image: np.ndarray) -> np.ndarray:
    """Convert an image to grayscale if it is not already."""
    if len(image.shape) == 2:
        return image.copy()
    return cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)


def _valid_odd_kernel(k: int, name: str = "kernel_size") -> int:
    """Gaussian and median blur require odd kernel sizes ≥ 3."""
    if k < 3 or k % 2 == 0:
        raise ValueError(f"{name} must be an odd integer ≥ 3. Got {k}.")
    return k


# ── Operations ────────────────────────────────────────────────────────────────

def apply_grayscale(image: np.ndarray) -> np.ndarray:
    """
    Convert a BGR/grayscale image to grayscale.

    WHY:  Grayscale simplifies many processing tasks by collapsing 3 colour
          channels into a single intensity channel. Most medical images
          (X-ray, CT, MRI) are inherently grayscale anyway.

    HOW:  cv2.cvtColor uses the luminance formula:
          Y = 0.114*B + 0.587*G + 0.299*R  (ITU-R BT.601 weights)
    """
    return _to_gray(image)


def apply_gaussian_blur(image: np.ndarray, kernel_size: int = 5) -> np.ndarray:
    """
    Smooth the image with a Gaussian kernel.

    WHY:  Reduces high-frequency noise. Useful as a pre-processing step
          before edge detection or thresholding.

    HOW:  Each output pixel is a weighted average of its neighbours,
          with weights following a Gaussian (bell-curve) distribution.
          Larger kernels → more smoothing → more detail lost.

    Args:
        kernel_size: Must be an odd integer ≥ 3 (3, 5, 7, 9, 11 are typical).
                     sigmaX=0 means OpenCV calculates sigma from kernel size.
    """
    k = _valid_odd_kernel(kernel_size)
    return cv2.GaussianBlur(image, (k, k), sigmaX=0)


def apply_median_blur(image: np.ndarray, kernel_size: int = 5) -> np.ndarray:
    """
    Smooth the image using a median filter.

    WHY:  Particularly effective against salt-and-pepper noise (random
          black/white pixels) because the median is robust to outliers —
          unlike the mean used in Gaussian blur.

    HOW:  Each output pixel is replaced by the median of all pixels in
          the kernel neighbourhood.
    """
    k = _valid_odd_kernel(kernel_size)
    return cv2.medianBlur(image, k)


def apply_histogram_equalization(image: np.ndarray) -> np.ndarray:
    """
    Redistribute pixel intensities to improve global contrast.

    WHY:  Images where most pixels cluster in a narrow intensity range
          appear low-contrast. Equalization spreads intensities across 0-255,
          which can reveal detail hidden in dark or bright regions.

    CAUTION: Equalization amplifies noise as well as signal. In medical
             imaging it may produce visually misleading results. Always
             present the original alongside the equalized image.

    HOW:  cv2.equalizeHist remaps intensities using the cumulative
          distribution function (CDF) of the histogram as a lookup table.
          It operates on grayscale images only.
    """
    gray = _to_gray(image)
    return cv2.equalizeHist(gray)


def apply_canny_edge(
    image: np.ndarray,
    threshold1: int = 50,
    threshold2: int = 150,
) -> np.ndarray:
    """
    Detect edges using the Canny algorithm.

    WHY:  Edges are rapid intensity transitions in an image. Detecting them
          is a fundamental step in feature extraction and segmentation.

    HOW:
      1. Gaussian smoothing (built-in) removes noise.
      2. Sobel gradient computation finds intensity gradients.
      3. Non-maximum suppression thins edges to 1 pixel.
      4. Double thresholding: pixels above threshold2 → definite edges;
         pixels between threshold1 and threshold2 → edges only if connected
         to a definite edge; pixels below threshold1 → discarded.

    IMPORTANT: Detected edges do NOT necessarily correspond to anatomical
               boundaries. Threshold selection heavily affects the result.

    Args:
        threshold1: Lower hysteresis threshold.
        threshold2: Upper hysteresis threshold. Convention: ratio ≈ 1:2 or 1:3.
    """
    if threshold1 < 0 or threshold2 < 0:
        raise ValueError("Canny thresholds must be non-negative integers.")
    if threshold1 >= threshold2:
        raise ValueError("threshold1 must be less than threshold2.")
    gray = _to_gray(image)
    return cv2.Canny(gray, threshold1, threshold2)


def apply_threshold(
    image: np.ndarray,
    threshold_value: int = 127,
) -> np.ndarray:
    """
    Apply binary thresholding: pixels above the threshold → 255, else → 0.

    WHY:  Separates foreground from background based on intensity. Used as
          a basic segmentation technique.

    HOW:  cv2.threshold with THRESH_BINARY sets each pixel to 255 if its
          value exceeds threshold_value, otherwise to 0.

    CAUTION: This is a general image segmentation technique. It is NOT a
             validated clinical segmentation algorithm. Results depend
             heavily on image quality and threshold choice.
    """
    if not 0 <= threshold_value <= 255:
        raise ValueError("threshold_value must be between 0 and 255.")
    gray = _to_gray(image)
    _, binary = cv2.threshold(gray, threshold_value, 255, cv2.THRESH_BINARY)
    return binary


def apply_morphology(
    image: np.ndarray,
    operation: str = "erode",
    kernel_size: int = 5,
    iterations: int = 1,
) -> np.ndarray:
    """
    Apply a morphological operation to a binary or grayscale image.

    Supported operations:
      - 'erode'      — shrinks bright regions; removes small bright spots.
      - 'dilate'     — expands bright regions; fills small dark holes.
      - 'morph_open' — erosion then dilation; removes small bright blobs.
      - 'morph_close'— dilation then erosion; closes small dark gaps.

    WHY:  Morphological operations are used to clean up binary images after
          thresholding — removing noise while preserving overall structure.

    HOW:  A structuring element (kernel) slides over the image. The output
          at each position depends on whether the kernel fits (erosion) or
          hits (dilation) the foreground pixels.
    """
    op_map = {
        "erode":       None,                      # handled separately
        "dilate":      None,
        "morph_open":  cv2.MORPH_OPEN,
        "morph_close": cv2.MORPH_CLOSE,
    }
    if operation not in op_map:
        raise ValueError(
            f"Unknown morphological operation '{operation}'. "
            f"Valid: {list(op_map.keys())}"
        )
    if kernel_size < 1:
        raise ValueError("kernel_size must be at least 1.")
    if iterations < 1:
        raise ValueError("iterations must be at least 1.")

    gray = _to_gray(image)
    kernel = cv2.getStructuringElement(
        cv2.MORPH_RECT, (kernel_size, kernel_size)
    )

    if operation == "erode":
        return cv2.erode(gray, kernel, iterations=iterations)
    elif operation == "dilate":
        return cv2.dilate(gray, kernel, iterations=iterations)
    else:
        return cv2.morphologyEx(gray, op_map[operation], kernel, iterations=iterations)


def apply_brightness_contrast(
    image: np.ndarray,
    alpha: float = 1.0,
    beta: float = 0.0,
) -> np.ndarray:
    """
    Adjust brightness and contrast using a linear transform.

    Formula:
        output = alpha * input + beta

    Where:
        alpha — contrast multiplier (1.0 = unchanged; >1 = more contrast)
        beta  — brightness offset  (0 = unchanged; positive = brighter)

    cv2.convertScaleAbs applies the transform and clips values to [0, 255],
    ensuring the result is always a valid uint8 image.

    Args:
        alpha: Contrast factor. Recommended range 0.5–3.0.
        beta:  Brightness offset. Recommended range -100 to +100.
    """
    if alpha < 0:
        raise ValueError("alpha (contrast) must be non-negative.")
    return cv2.convertScaleAbs(image, alpha=alpha, beta=beta)


def apply_invert(image: np.ndarray) -> np.ndarray:
    """
    Invert pixel intensities: output = 255 - input.

    WHY:  Some imaging modalities produce images where the structure of
          interest appears dark on a bright background. Inversion reverses
          this for easier visual inspection.

    HOW:  cv2.bitwise_not performs a bitwise NOT operation, which for
          uint8 images is equivalent to 255 - pixel_value.
    """
    return cv2.bitwise_not(image)


# ── Dispatcher ────────────────────────────────────────────────────────────────

def dispatch_operation(
    image: np.ndarray,
    operation: str,
    parameters: dict,
) -> np.ndarray:
    """
    Route an operation name to the correct processing function.
    Called by the API layer after validating the request schema.

    Returns the processed image as a NumPy ndarray.
    """
    ops = {
        "grayscale":             lambda: apply_grayscale(image),
        "gaussian_blur":         lambda: apply_gaussian_blur(image, **_pick(parameters, ["kernel_size"])),
        "median_blur":           lambda: apply_median_blur(image, **_pick(parameters, ["kernel_size"])),
        "histogram_equalization":lambda: apply_histogram_equalization(image),
        "canny_edge":            lambda: apply_canny_edge(image, **_pick(parameters, ["threshold1", "threshold2"])),
        "threshold":             lambda: apply_threshold(image, **_pick(parameters, ["threshold_value"])),
        "erode":                 lambda: apply_morphology(image, "erode", **_pick(parameters, ["kernel_size", "iterations"])),
        "dilate":                lambda: apply_morphology(image, "dilate", **_pick(parameters, ["kernel_size", "iterations"])),
        "morph_open":            lambda: apply_morphology(image, "morph_open", **_pick(parameters, ["kernel_size", "iterations"])),
        "morph_close":           lambda: apply_morphology(image, "morph_close", **_pick(parameters, ["kernel_size", "iterations"])),
        "brightness_contrast":   lambda: apply_brightness_contrast(image, **_pick(parameters, ["alpha", "beta"])),
        "invert":                lambda: apply_invert(image),
    }

    if operation not in ops:
        raise ValueError(f"Unknown operation: {operation}")

    logger.info("Dispatching operation '%s' with params %s", operation, parameters)
    return ops[operation]()


def _pick(d: dict, keys: list[str]) -> dict:
    """Return only the keys from `d` that are in `keys` (ignore extras)."""
    return {k: v for k, v in d.items() if k in keys}

"""
tests/test_processing.py
------------------------
Tests for the OpenCV processing service and POST /api/images/{id}/process.
"""
import io
import numpy as np
import pytest

from app.services.image_processing import (
    apply_grayscale,
    apply_gaussian_blur,
    apply_median_blur,
    apply_histogram_equalization,
    apply_canny_edge,
    apply_threshold,
    apply_morphology,
    apply_brightness_contrast,
    apply_invert,
    dispatch_operation,
)


# ── Unit tests for service functions ─────────────────────────────────────────

class TestGrayscale:
    def test_rgb_to_gray_shape(self):
        img = np.random.randint(0, 255, (100, 100, 3), dtype=np.uint8)
        result = apply_grayscale(img)
        assert len(result.shape) == 2  # single channel

    def test_already_gray_unchanged(self):
        img = np.zeros((50, 50), dtype=np.uint8)
        result = apply_grayscale(img)
        assert result.shape == img.shape


class TestGaussianBlur:
    def test_output_same_shape(self):
        img = np.random.randint(0, 255, (100, 100, 3), dtype=np.uint8)
        result = apply_gaussian_blur(img, kernel_size=5)
        assert result.shape == img.shape

    def test_invalid_even_kernel_raises(self):
        img = np.zeros((50, 50, 3), dtype=np.uint8)
        with pytest.raises(ValueError):
            apply_gaussian_blur(img, kernel_size=4)

    def test_kernel_too_small_raises(self):
        img = np.zeros((50, 50, 3), dtype=np.uint8)
        with pytest.raises(ValueError):
            apply_gaussian_blur(img, kernel_size=1)


class TestCanny:
    def test_output_is_binary(self):
        img = np.random.randint(0, 255, (100, 100, 3), dtype=np.uint8)
        result = apply_canny_edge(img, 50, 150)
        unique = np.unique(result)
        assert set(unique).issubset({0, 255})

    def test_bad_thresholds_raises(self):
        img = np.zeros((50, 50), dtype=np.uint8)
        with pytest.raises(ValueError):
            apply_canny_edge(img, threshold1=150, threshold2=50)


class TestThreshold:
    def test_output_is_binary(self):
        img = np.random.randint(0, 255, (80, 80, 3), dtype=np.uint8)
        result = apply_threshold(img, threshold_value=127)
        unique = np.unique(result)
        assert set(unique).issubset({0, 255})

    def test_invalid_threshold_raises(self):
        img = np.zeros((50, 50), dtype=np.uint8)
        with pytest.raises(ValueError):
            apply_threshold(img, threshold_value=300)


class TestBrightnessContrast:
    def test_output_stays_uint8(self):
        img = np.full((50, 50, 3), 200, dtype=np.uint8)
        result = apply_brightness_contrast(img, alpha=2.0, beta=100)
        assert result.dtype == np.uint8
        assert result.max() <= 255

    def test_negative_alpha_raises(self):
        img = np.zeros((50, 50), dtype=np.uint8)
        with pytest.raises(ValueError):
            apply_brightness_contrast(img, alpha=-1.0)


class TestInvert:
    def test_invert_black_is_white(self):
        img = np.zeros((50, 50), dtype=np.uint8)
        result = apply_invert(img)
        assert (result == 255).all()


class TestDispatcher:
    def test_unknown_operation_raises(self):
        img = np.zeros((50, 50), dtype=np.uint8)
        with pytest.raises(ValueError):
            dispatch_operation(img, "fake_op", {})

    def test_all_operations_run_without_error(self):
        img = np.random.randint(50, 200, (100, 100, 3), dtype=np.uint8)
        operations = [
            ("grayscale", {}),
            ("gaussian_blur", {"kernel_size": 5}),
            ("median_blur", {"kernel_size": 5}),
            ("histogram_equalization", {}),
            ("canny_edge", {"threshold1": 50, "threshold2": 150}),
            ("threshold", {"threshold_value": 127}),
            ("erode", {"kernel_size": 3, "iterations": 1}),
            ("dilate", {"kernel_size": 3, "iterations": 1}),
            ("morph_open", {"kernel_size": 3, "iterations": 1}),
            ("morph_close", {"kernel_size": 3, "iterations": 1}),
            ("brightness_contrast", {"alpha": 1.2, "beta": 10}),
            ("invert", {}),
        ]
        for op, params in operations:
            result = dispatch_operation(img.copy(), op, params)
            assert result is not None, f"Operation '{op}' returned None"


# ── Integration tests (API) ───────────────────────────────────────────────────

class TestProcessingAPI:
    def test_process_grayscale(self, client, uploaded_image_id):
        r = client.post(
            f"/api/images/{uploaded_image_id}/process",
            json={"operation": "grayscale", "parameters": {}},
        )
        assert r.status_code == 200
        data = r.json()
        assert "processed_image_url" in data
        assert data["operation"] == "grayscale"

    def test_process_gaussian_blur(self, client, uploaded_image_id):
        r = client.post(
            f"/api/images/{uploaded_image_id}/process",
            json={"operation": "gaussian_blur", "parameters": {"kernel_size": 5}},
        )
        assert r.status_code == 200

    def test_process_invalid_operation(self, client, uploaded_image_id):
        r = client.post(
            f"/api/images/{uploaded_image_id}/process",
            json={"operation": "diagnose_cancer", "parameters": {}},
        )
        assert r.status_code == 422  # Pydantic validation error

    def test_process_nonexistent_image(self, client):
        r = client.post(
            "/api/images/img_notreal/process",
            json={"operation": "grayscale", "parameters": {}},
        )
        assert r.status_code == 404

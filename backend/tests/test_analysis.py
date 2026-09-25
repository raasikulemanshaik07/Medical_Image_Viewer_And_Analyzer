"""
tests/test_analysis.py
-----------------------
Tests for image analysis: statistics, ROI, histogram, edge metrics.
"""
import numpy as np
import pytest

from app.services.image_analysis import (
    compute_statistics,
    compute_roi_statistics,
    compute_histogram,
    compute_edge_metrics,
)


class TestStatistics:
    def test_known_image_stats(self):
        # Pure white 100×100 grayscale image
        img = np.full((100, 100), 255, dtype=np.uint8)
        result = compute_statistics(img, "img_test")
        assert result["min_intensity"] == 255.0
        assert result["max_intensity"] == 255.0
        assert result["mean_intensity"] == 255.0
        assert result["standard_deviation"] == 0.0

    def test_stats_returns_all_fields(self):
        img = np.random.randint(0, 255, (80, 80, 3), dtype=np.uint8)
        result = compute_statistics(img, "img_test")
        required = ["width", "height", "channels", "min_intensity",
                    "max_intensity", "mean_intensity", "median_intensity",
                    "standard_deviation"]
        for field in required:
            assert field in result

    def test_stats_include_disclaimer(self):
        img = np.zeros((50, 50), dtype=np.uint8)
        result = compute_statistics(img, "img_test")
        assert "disclaimer" in result


class TestROI:
    def test_valid_roi(self):
        img = np.zeros((200, 200, 3), dtype=np.uint8)
        img[50:150, 50:150] = 200
        result = compute_roi_statistics(img, "img_test", x=50, y=50, width=100, height=100)
        assert result["pixel_count"] == 10_000
        assert result["mean_intensity"] == pytest.approx(200.0)

    def test_roi_out_of_bounds_raises(self):
        img = np.zeros((100, 100), dtype=np.uint8)
        with pytest.raises(ValueError):
            compute_roi_statistics(img, "img_test", x=80, y=80, width=50, height=50)

    def test_roi_negative_origin_raises(self):
        img = np.zeros((100, 100), dtype=np.uint8)
        with pytest.raises(ValueError):
            compute_roi_statistics(img, "img_test", x=-1, y=0, width=10, height=10)


class TestHistogram:
    def test_histogram_has_256_bins(self):
        img = np.random.randint(0, 255, (100, 100), dtype=np.uint8)
        result = compute_histogram(img, "img_test")
        assert len(result["bins"]) == 256
        assert len(result["counts"]) == 256

    def test_histogram_total_equals_pixel_count(self):
        img = np.random.randint(0, 255, (100, 100), dtype=np.uint8)
        result = compute_histogram(img, "img_test")
        assert sum(result["counts"]) == 100 * 100

    def test_roi_histogram_source_label(self):
        img = np.zeros((200, 200), dtype=np.uint8)
        roi = {"x": 0, "y": 0, "width": 50, "height": 50}
        result = compute_histogram(img, "img_test", roi=roi)
        assert result["source"] == "roi"


class TestEdgeMetrics:
    def test_black_image_has_zero_edges(self):
        img = np.zeros((100, 100), dtype=np.uint8)
        result = compute_edge_metrics(img, "img_test", 50, 150)
        assert result["edge_pixels"] == 0
        assert result["edge_pixel_percentage"] == 0.0

    def test_returns_disclaimer(self):
        img = np.zeros((100, 100), dtype=np.uint8)
        result = compute_edge_metrics(img, "img_test")
        assert "disclaimer" in result


# ── API integration ───────────────────────────────────────────────────────────

class TestAnalysisAPI:
    def test_statistics_endpoint(self, client, uploaded_image_id):
        r = client.post(f"/api/images/{uploaded_image_id}/analyze/statistics")
        assert r.status_code == 200
        data = r.json()
        assert "mean_intensity" in data
        assert "disclaimer" in data

    def test_roi_endpoint_valid(self, client, uploaded_image_id):
        r = client.post(
            f"/api/images/{uploaded_image_id}/analyze/roi",
            json={"x": 10, "y": 10, "width": 50, "height": 50},
        )
        assert r.status_code == 200
        assert r.json()["pixel_count"] == 2500

    def test_roi_endpoint_out_of_bounds(self, client, uploaded_image_id):
        r = client.post(
            f"/api/images/{uploaded_image_id}/analyze/roi",
            json={"x": 90, "y": 90, "width": 200, "height": 200},
        )
        assert r.status_code == 400

    def test_histogram_endpoint(self, client, uploaded_image_id):
        r = client.post(f"/api/images/{uploaded_image_id}/analyze/histogram")
        assert r.status_code == 200
        data = r.json()
        assert len(data["bins"]) == 256

    def test_history_endpoint(self, client, uploaded_image_id):
        r = client.get(f"/api/images/{uploaded_image_id}/history")
        assert r.status_code == 200
        assert "entries" in r.json()

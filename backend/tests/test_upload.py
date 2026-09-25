"""
tests/test_upload.py
--------------------
Tests for image upload validation and the POST /api/images/upload endpoint.
"""
import io
import pytest


class TestHealthCheck:
    def test_health_returns_200(self, client):
        r = client.get("/health")
        assert r.status_code == 200
        assert r.json()["status"] == "healthy"


class TestUpload:
    def test_upload_valid_png(self, client, png_image_bytes):
        r = client.post(
            "/api/images/upload",
            files={"file": ("scan.png", io.BytesIO(png_image_bytes), "image/png")},
        )
        assert r.status_code == 201
        data = r.json()
        assert data["status"] == "uploaded"
        assert data["file_format"] == "PNG"
        assert data["width"] == 100
        assert data["height"] == 100
        assert data["image_id"].startswith("img_")

    def test_upload_grayscale_png(self, client, gray_image_bytes):
        r = client.post(
            "/api/images/upload",
            files={"file": ("gray.png", io.BytesIO(gray_image_bytes), "image/png")},
        )
        assert r.status_code == 201
        assert r.json()["channels"] == 1

    def test_upload_rejects_text_file(self, client):
        r = client.post(
            "/api/images/upload",
            files={"file": ("notes.txt", io.BytesIO(b"not an image"), "text/plain")},
        )
        assert r.status_code == 400

    def test_upload_rejects_empty_file(self, client):
        r = client.post(
            "/api/images/upload",
            files={"file": ("empty.png", io.BytesIO(b""), "image/png")},
        )
        assert r.status_code == 400

    def test_upload_rejects_corrupted_image(self, client):
        r = client.post(
            "/api/images/upload",
            files={"file": ("corrupt.png", io.BytesIO(b"\x89PNG\r\nGARBAGE"), "image/png")},
        )
        assert r.status_code == 400

    def test_upload_rejects_unsupported_extension(self, client):
        r = client.post(
            "/api/images/upload",
            files={"file": ("image.bmp", io.BytesIO(b"BM..."), "image/bmp")},
        )
        assert r.status_code == 400


class TestImageList:
    def test_list_images_returns_list(self, client, uploaded_image_id):
        r = client.get("/api/images")
        assert r.status_code == 200
        data = r.json()
        assert "images" in data
        assert "total" in data
        assert data["total"] >= 1

    def test_get_image_by_id(self, client, uploaded_image_id):
        r = client.get(f"/api/images/{uploaded_image_id}")
        assert r.status_code == 200
        assert r.json()["image_id"] == uploaded_image_id

    def test_get_nonexistent_image_returns_404(self, client):
        r = client.get("/api/images/img_doesnotexist")
        assert r.status_code == 404
